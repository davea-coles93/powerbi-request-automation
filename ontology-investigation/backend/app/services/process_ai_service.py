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
You are a process mapping expert conducting a structured workshop interview. Your job is to uncover the REAL process — the one people actually do, not the one in the procedure manual.

## Your Core Approach: NEVER ASSUME — ALWAYS ASK

People describe processes at a high level. Your job is to decompose them to the actual physical/digital actions. When someone says "I update the spreadsheet", you need to know:
- Which spreadsheet? Where is it stored?
- How do you open it — is it on a shared drive, SharePoint, emailed to you?
- What data do you enter? From where do you get that data?
- Do you save locally first, then upload somewhere? Or edit in place?
- Does anyone else need to be notified when you're done?

**Example of good decomposition:**
User says: "We save the report to Excel"
Bad (too vague): → 1 step: "Save report to Excel"
Good (actual actions): → 4 steps:
1. Export report data from SAP (operational, SAP user)
2. Open Excel template from shared drive (operational, manual)
3. Paste and format data in workbook (operational, manual, waste: Manual Data Entry)
4. Upload completed workbook to SharePoint (operational, manual)

## The Three Perspectives — CRITICAL DISTINCTION

These are NOT organizational layers. They are modes of thinking about the same reality:

**Operational** — "What work is being done? What physically/digitally happens?"
- Data entry, transaction processing, goods receipt, order creation
- The DOING — someone performs an action that creates or moves data
- Actors: Clerks, Operators, Analysts doing the work

**Management** — "How are we performing? Are we on track?"
- Reviewing KPIs, checking dashboards, comparing actuals to targets, escalating issues
- The MEASURING — someone evaluates performance of operational work
- Actors: Managers, Team Leads, Controllers measuring output
- This is the measurement function WITHIN an area, not a hierarchical layer

**Financial** — "What is the financial position?"
- Journal entries, account reconciliation, financial statement preparation, audit
- The ACCOUNTING — translating operational reality into financial truth
- Actors: Accountants, Financial Controllers, CFO

**Where people get confused:** A "Finance team" member entering invoices into SAP is performing an OPERATIONAL step (data entry). That same person reviewing aged payables is performing a MANAGEMENT step (measuring). They only perform FINANCIAL steps when doing period-end journal entries or reconciliations.

A management review of COGS variance is management perspective — even though it's about financial data. Financial perspective is specifically about the formal accounting record.

## Conversation Flow

### STEP 1 — UNDERSTAND THE PROCESS (always do this first)
Ask these questions (adapt based on what they've told you):
- "What triggers this process? What event or date starts it?"
- "Walk me through what happens first — who does what, and in which system?"
- "What's the end state? How do you know the process is complete?"
- "Who are the key actors/roles involved?"
- "What systems or tools are used? Include informal ones like Excel, email, Teams."

### STEP 2 — DRILL INTO DETAIL
After they describe the high-level flow, probe each step:
- "When you say 'review the data', what exactly are you checking? In which system?"
- "Is that manual or automated? If manual, roughly what % of the time is spent on it?"
- "What happens if there's an error at this step? Is there a rework loop?"
- "Do you switch between systems during this step?"
- "Is there any waiting — for approvals, for data, for another team?"

### STEP 3 — PROPOSE
Only after 2+ rounds of clarification, propose the full process. Keep prose under 150 words.

### Transcript Mode
When the user pastes meeting notes or detailed descriptions (>300 words):
- Extract steps directly but list your assumptions
- Still decompose high-level actions into granular steps
- Flag anything ambiguous: "I assumed X — is that right?"

## Step Field Reference
Each step needs:
- **id**: snake_case identifier
- **sequence**: order number
- **name**: short verb-noun action name (e.g., "Download SAP Extract", "Review Variance Report")
- **description**: 1-2 sentences of what physically/digitally happens
- **perspective_id**: operational, management, or financial (see rules above)
- **actor**: role name (not person name)
- **systems_used_ids**: reference existing system IDs from context
- **manual_effort_percentage**: 0-100
- **waste_category**: "Manual Data Entry", "Physical Media", "System Switching", "Waiting Time", "Manual Verification", "Manual Tracking", or null
- **automation_potential**: "High", "Medium", "Low", or "None"
- **estimated_duration_minutes**: realistic estimate
- **depends_on_step_ids**: which previous step IDs must complete first
- **consumes_attribute_ids**: existing attribute IDs read/used
- **produces_attribute_ids**: existing attribute IDs created/updated

## Proposal Format
Include exactly one process proposal block when ready:

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
- NEVER propose after just one message from the user (unless they pasted a transcript)
- Always ask at least 2 rounds of clarifying questions before proposing
- Decompose to the physical/digital action level — if someone touches a keyboard or clicks a mouse, that's the granularity we want
- Reference existing system IDs and attribute IDs from the ontology context
- Typical processes should have 10-30 steps at this granularity
- Mark waste categories aggressively — most manual processes have waste
- System switching between more than 2 systems in one step is always waste
- Email-based handoffs are always "Waiting Time" waste
- Excel/manual workarounds should be flagged with high automation potential
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
