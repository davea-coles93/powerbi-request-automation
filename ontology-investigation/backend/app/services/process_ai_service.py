"""
Process AI Service — AI-powered process generation from descriptions or transcripts.

Users can describe a process in natural language or paste workshop/meeting
transcripts, and the AI extracts structured Process + ProcessSteps.
"""

import json
import os
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from ..db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    ProcessRepository,
)
from ..models import Process, ProcessStep

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


SYSTEM_PROMPT = """\
You are a process mapping expert. You help users create structured business processes from descriptions or meeting transcripts.

## Your Task
Extract or design a business process with concrete steps. Each step needs:
- **id**: snake_case identifier
- **sequence**: order number (1, 2, 3...)
- **name**: short action name (e.g., "Production Cutoff", "Review Variances")
- **description**: 1-2 sentences of what happens
- **perspective_id**: one of the available perspectives (operational, management, financial)
- **actor**: who performs this step (role, not person name)
- **systems_used_ids**: which systems are used (reference existing system IDs from context)
- **manual_effort_percentage**: 0-100, estimate how manual this step is
- **waste_category**: if applicable, one of: "Manual Data Entry", "Physical Media", "System Switching", "Waiting Time", "Manual Verification", "Manual Tracking", or null
- **automation_potential**: "High", "Medium", "Low", or "None"
- **estimated_duration_minutes**: rough estimate
- **depends_on_step_ids**: which previous steps must complete first (use step IDs)
- **consumes_attribute_ids**: which existing attributes are read/used (reference IDs from context)
- **produces_attribute_ids**: which existing attributes are created (reference IDs from context)

## Two Modes

### Interactive Mode (short description)
When the user gives a brief description like "map our month-end close process":
1. Acknowledge in 1-2 sentences
2. Ask 2-3 clarifying questions: How many steps roughly? What systems involved? Who are the key actors?
3. After answers, generate the full process

### Transcript Mode (long text / pasted notes)
When the user pastes meeting notes, interview transcripts, or detailed descriptions:
1. Extract steps directly — don't ask clarifying questions
2. Infer systems, actors, manual effort from context clues
3. Note any ambiguities in a brief summary before the proposal

## Response Style
- Brief prose (under 150 words) summarizing what you extracted
- Then the process proposal block
- After the proposal, note any assumptions made

## Proposal Format
Include exactly one process proposal block:

```process_proposal
{
  "process": {
    "id": "snake_case_id",
    "name": "Process Name",
    "description": "What this process accomplishes"
  },
  "steps": [
    {
      "id": "step_id",
      "sequence": 1,
      "name": "Step Name",
      "description": "What happens",
      "perspective_id": "operational",
      "actor": "Role Name",
      "systems_used_ids": ["sap_ecc"],
      "manual_effort_percentage": 60,
      "waste_category": null,
      "automation_potential": "Medium",
      "estimated_duration_minutes": 30,
      "depends_on_step_ids": [],
      "consumes_attribute_ids": [],
      "produces_attribute_ids": []
    }
  ]
}
```

## Rules
- Reference existing system IDs and attribute IDs from the ontology context where possible
- Use realistic manual effort estimates based on the description
- Set dependencies logically — later steps should depend on earlier ones where appropriate
- Every process needs at least 3 steps
- Don't over-complicate: 5-15 steps is typical for most processes
- Perspective should match the nature of the work: data entry = operational, review/approval = management, reporting = financial
"""


def _build_process_context(db: Session) -> str:
    """Build context about existing systems, perspectives, and attributes."""
    perspectives = PerspectiveRepository(db).get_all()
    systems = SystemRepository(db).get_all()
    entities = EntityRepository(db).get_all()
    attributes = AttributeRepository(db).get_all()
    processes = ProcessRepository(db).get_all()

    sections = []

    if perspectives:
        lines = [f"  - {p.id}: {p.name}" for p in perspectives]
        sections.append("AVAILABLE PERSPECTIVES:\n" + "\n".join(lines))

    if systems:
        lines = [f"  - {s.id}: {s.name} ({s.type})" for s in systems]
        sections.append("EXISTING SYSTEMS (use these IDs in systems_used_ids):\n" + "\n".join(lines))

    if entities:
        lines = [f"  - {e.id}: {e.name}" for e in entities]
        sections.append("EXISTING ENTITIES:\n" + "\n".join(lines))

    if attributes:
        lines = [f"  - {a.id}: {a.name} (entity: {a.entity_id}, system: {a.system_id})" for a in attributes[:30]]
        if len(attributes) > 30:
            lines.append(f"  ... and {len(attributes) - 30} more")
        sections.append("EXISTING ATTRIBUTES (reference in consumes/produces):\n" + "\n".join(lines))

    if processes:
        lines = [f"  - {p.id}: {p.name} ({len(p.steps)} steps)" for p in processes]
        sections.append("EXISTING PROCESSES:\n" + "\n".join(lines))

    if not sections:
        return "The ontology is currently EMPTY. Use generic perspective IDs: operational, management, financial."

    return "## Current Ontology Context\n\n" + "\n\n".join(sections)


class ProcessAIService:
    """Service for AI-powered process generation."""

    def __init__(self, db: Session):
        self.db = db
        self.client = None
        if ANTHROPIC_AVAILABLE:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self.client = anthropic.AsyncAnthropic(api_key=api_key)

    def is_configured(self) -> bool:
        return self.client is not None

    async def chat_stream(
        self,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        """Stream a process builder AI response via SSE."""
        if not self.client:
            yield 'data: {"type":"error","content":"AI service not configured. Set ANTHROPIC_API_KEY."}\n\n'
            return

        context = _build_process_context(self.db)
        full_system = f"{SYSTEM_PROMPT}\n\n{context}"

        try:
            async with self.client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                system=full_system,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    payload = json.dumps({"type": "text", "content": text})
                    yield f"data: {payload}\n\n"

            yield 'data: {"type":"done"}\n\n'

        except Exception as e:
            payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {payload}\n\n"

    def materialize_process(self, proposal: dict) -> dict:
        """Create a process from an accepted proposal."""
        process_data = proposal.get("process", {})
        steps_data = proposal.get("steps", [])

        proc_id = process_data.get("id", "")
        repo = ProcessRepository(self.db)

        # Check for duplicate — suffix if exists
        if repo.get_by_id(proc_id):
            i = 2
            while repo.get_by_id(f"{proc_id}_{i}"):
                i += 1
            proc_id = f"{proc_id}_{i}"

        steps = []
        for s in steps_data:
            steps.append(ProcessStep(
                id=s.get("id", ""),
                sequence=s.get("sequence", 0),
                name=s.get("name", ""),
                description=s.get("description"),
                perspective_id=s.get("perspective_id", "operational"),
                actor=s.get("actor"),
                consumes_attribute_ids=s.get("consumes_attribute_ids", []),
                produces_attribute_ids=s.get("produces_attribute_ids", []),
                uses_metric_ids=s.get("uses_metric_ids", []),
                crystallizes_attribute_ids=s.get("crystallizes_attribute_ids", []),
                depends_on_step_ids=s.get("depends_on_step_ids", []),
                systems_used_ids=s.get("systems_used_ids", []),
                waste_category=s.get("waste_category"),
                manual_effort_percentage=s.get("manual_effort_percentage"),
                automation_potential=s.get("automation_potential"),
                estimated_duration_minutes=s.get("estimated_duration_minutes"),
            ))

        process = Process(
            id=proc_id,
            name=process_data.get("name", ""),
            description=process_data.get("description"),
            steps=steps,
        )

        repo.create(process)

        return {
            "process_id": proc_id,
            "process_name": process.name,
            "steps_created": len(steps),
        }
