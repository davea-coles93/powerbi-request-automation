"""
Workshop AI Service — Top-Down Workshop Facilitator

Facilitates the Top-Down workshop methodology via conversational AI.
User describes business questions in natural language; Claude structures them
into the ontology chain: Business Question -> Metric -> Measures -> Attributes,
linking to existing ontology elements where possible.
"""

import json
import os
from typing import AsyncGenerator, Optional

from sqlalchemy.orm import Session

from ..db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
)

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


SYSTEM_PROMPT = """\
You are a senior business analyst facilitating a **Top-Down Workshop** for building a business ontology.

## Your Role
You help stakeholders articulate what they need to know about their business, then structure those needs into a formal ontology chain:

**Business Question -> Metric -> Measures -> Attributes (-> Systems)**

## The Ontology Framework
- **Metric**: A business KPI that answers a specific business question. Metrics are the ANCHOR — everything else exists to serve them.
- **Measure**: A calculation applied to attributes (or other measures). Think of these as the formulas.
- **Attribute**: Raw data captured at the point of activity. These live in source systems.
- **System**: Where attributes originate (ERP, MES, spreadsheets, etc.).
- **Entity**: The business object an attribute describes (e.g., Production Order, Customer, Invoice).
- **Perspective**: The lens through which data is viewed — Operational (what happened), Management (how are we performing), Financial (what's the financial position).

## Workshop Flow
1. Ask the stakeholder what business questions they need answered
2. For each business question, propose a structured metric
3. Break down what measures would calculate that metric
4. Identify what attributes (raw data) those measures need
5. Where possible, link to EXISTING ontology elements (provided in context)
6. Flag gaps — attributes that don't exist yet, systems not yet mapped

## How to Respond
Respond conversationally but include structured proposals using this exact JSON format embedded in your response. Place each proposal block on its own line, wrapped in triple backticks with the language tag `proposal`:

```proposal
{
  "metrics": [
    {
      "id": "suggested_snake_case_id",
      "name": "Human Readable Name",
      "description": "What this metric tells the business",
      "business_question": "The question this answers?",
      "calculated_by_measure_ids": ["measure_id_1"],
      "perspective_ids": ["management"],
      "is_existing": false,
      "existing_id": null
    }
  ],
  "measures": [
    {
      "id": "suggested_snake_case_id",
      "name": "Human Readable Name",
      "description": "What this calculates",
      "logic": "Plain English calculation logic",
      "formula": "Optional: pseudo-formula like SUM(x) / COUNT(y)",
      "input_attribute_ids": ["attr_id"],
      "input_measure_ids": [],
      "perspective_ids": ["management"],
      "is_existing": false,
      "existing_id": null
    }
  ],
  "attributes": [
    {
      "id": "suggested_snake_case_id",
      "name": "Human Readable Name",
      "description": "What raw data this represents",
      "entity_id": "entity_id_or_suggested",
      "system_id": "system_id_or_unknown",
      "perspective_ids": ["operational"],
      "is_existing": false,
      "existing_id": null
    }
  ]
}
```

## Rules
- When you find an existing element that matches, set `is_existing: true` and `existing_id` to the actual ID from the ontology context.
- Use snake_case IDs for new elements.
- Always link measures to their input attributes/measures, and metrics to their calculated-by measures.
- Be conversational and explain your reasoning — don't just dump JSON.
- Ask clarifying questions when the business question is ambiguous.
- Consider which perspective each element belongs to (operational, management, financial).
- Keep proposals focused — one business question at a time unless the user gives multiple.
- If the user describes something that clearly maps to an existing element, say so and explain the link.
"""


def _build_ontology_context(db: Session) -> str:
    """Build a summary of existing ontology elements for Claude's context."""
    perspectives = PerspectiveRepository(db).get_all()
    systems = SystemRepository(db).get_all()
    entities = EntityRepository(db).get_all()
    attributes = AttributeRepository(db).get_all()
    measures = MeasureRepository(db).get_all()
    metrics = MetricRepository(db).get_all()

    sections = []

    if perspectives:
        lines = []
        for p in perspectives:
            lines.append(f"  - {p.id}: {p.name} — {p.primary_concern}")
        sections.append("PERSPECTIVES:\n" + "\n".join(lines))

    if systems:
        lines = []
        for s in systems:
            lines.append(f"  - {s.id}: {s.name} ({s.type}, {s.vendor or 'no vendor'})")
        sections.append("SYSTEMS:\n" + "\n".join(lines))

    if entities:
        lines = []
        for e in entities:
            lens_summary = ""
            if e.lenses:
                lens_parts = [f"{l.perspective_id}: {l.interpretation}" for l in e.lenses]
                lens_summary = f" | Lenses: {'; '.join(lens_parts)}"
            lines.append(f"  - {e.id}: {e.name}{lens_summary}")
        sections.append("ENTITIES:\n" + "\n".join(lines))

    if attributes:
        lines = []
        for a in attributes:
            lines.append(
                f"  - {a.id}: {a.name} (entity: {a.entity_id}, system: {a.system_id}, "
                f"perspectives: {','.join(a.perspective_ids or [])})"
            )
        sections.append("ATTRIBUTES:\n" + "\n".join(lines))

    if measures:
        lines = []
        for m in measures:
            inputs = []
            if m.input_attribute_ids:
                inputs.append(f"attrs: {','.join(m.input_attribute_ids)}")
            if m.input_measure_ids:
                inputs.append(f"measures: {','.join(m.input_measure_ids)}")
            input_str = f" | inputs: {'; '.join(inputs)}" if inputs else ""
            lines.append(
                f"  - {m.id}: {m.name} — {m.logic or m.description or 'no description'}{input_str}"
            )
        sections.append("MEASURES:\n" + "\n".join(lines))

    if metrics:
        lines = []
        for mt in metrics:
            lines.append(
                f"  - {mt.id}: {mt.name} — Q: \"{mt.business_question}\" "
                f"(measures: {','.join(mt.calculated_by_measure_ids or [])})"
            )
        sections.append("METRICS:\n" + "\n".join(lines))

    if not sections:
        return "The ontology is currently EMPTY. You are starting from scratch."

    return "## Current Ontology State\n\n" + "\n\n".join(sections)


class WorkshopAIService:
    """Service for AI-powered workshop facilitation."""

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
        """
        Stream a workshop conversation response.

        Args:
            messages: Conversation history [{role, content}, ...]

        Yields:
            SSE-formatted strings: "data: {json}\n\n"
        """
        if not self.client:
            yield 'data: {"type":"error","content":"AI service not configured. Set ANTHROPIC_API_KEY."}\n\n'
            return

        ontology_context = _build_ontology_context(self.db)

        full_system = f"{SYSTEM_PROMPT}\n\n{ontology_context}"

        try:
            async with self.client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
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

    def materialize_proposals(self, proposals: dict) -> dict:
        """
        Create ontology elements from accepted proposals.

        Args:
            proposals: Dict with optional keys: metrics, measures, attributes
                       Each item should have the full element data.

        Returns:
            Summary of created/skipped elements.
        """
        from ..models import Attribute, Measure, Metric

        created = {}
        skipped = {}

        # Materialize in dependency order: attributes -> measures -> metrics
        attr_repo = AttributeRepository(self.db)
        for attr_data in proposals.get("attributes", []):
            if attr_data.get("is_existing"):
                skipped["attributes"] = skipped.get("attributes", 0) + 1
                continue
            attr_id = attr_data.get("id", "")
            if attr_repo.exists(attr_id):
                skipped["attributes"] = skipped.get("attributes", 0) + 1
                continue
            attr_repo.create(Attribute(
                id=attr_id,
                name=attr_data.get("name", ""),
                description=attr_data.get("description", ""),
                entity_id=attr_data.get("entity_id", ""),
                system_id=attr_data.get("system_id", "unknown"),
                source_actor=attr_data.get("source_actor", ""),
                reliability=attr_data.get("reliability", "Medium"),
                volatility=attr_data.get("volatility", "Point-in-time"),
                perspective_ids=attr_data.get("perspective_ids", []),
            ))
            created["attributes"] = created.get("attributes", 0) + 1

        measure_repo = MeasureRepository(self.db)
        for m_data in proposals.get("measures", []):
            if m_data.get("is_existing"):
                skipped["measures"] = skipped.get("measures", 0) + 1
                continue
            m_id = m_data.get("id", "")
            if measure_repo.exists(m_id):
                skipped["measures"] = skipped.get("measures", 0) + 1
                continue
            measure_repo.create(Measure(
                id=m_id,
                name=m_data.get("name", ""),
                description=m_data.get("description", ""),
                logic=m_data.get("logic", ""),
                formula=m_data.get("formula", ""),
                input_attribute_ids=m_data.get("input_attribute_ids", []),
                input_measure_ids=m_data.get("input_measure_ids", []),
                perspective_ids=m_data.get("perspective_ids", []),
            ))
            created["measures"] = created.get("measures", 0) + 1

        metric_repo = MetricRepository(self.db)
        for mt_data in proposals.get("metrics", []):
            if mt_data.get("is_existing"):
                skipped["metrics"] = skipped.get("metrics", 0) + 1
                continue
            mt_id = mt_data.get("id", "")
            if metric_repo.exists(mt_id):
                skipped["metrics"] = skipped.get("metrics", 0) + 1
                continue
            metric_repo.create(Metric(
                id=mt_id,
                name=mt_data.get("name", ""),
                description=mt_data.get("description", ""),
                business_question=mt_data.get("business_question", ""),
                calculated_by_measure_ids=mt_data.get("calculated_by_measure_ids", []),
                perspective_ids=mt_data.get("perspective_ids", []),
            ))
            created["metrics"] = created.get("metrics", 0) + 1

        return {"created": created, "skipped": skipped}
