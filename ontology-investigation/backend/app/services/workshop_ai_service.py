"""
Workshop AI Service — Ontology AI Assistant

General-purpose AI assistant for exploring and building the business ontology.
Handles both exploration queries (explain metrics, trace lineage) and building
workflows (structuring business questions into Metrics -> Measures -> Attributes).
"""

from typing import AsyncGenerator

from sqlalchemy.orm import Session

from ..db.repositories import AttributeRepository, MeasureRepository, MetricRepository
from ..models import Attribute, Measure, Metric
from ..utils import generate_id
from .base_ai_service import BaseAIService
from .ontology_context import OntologyContextBuilder


SYSTEM_PROMPT = """\
You are an AI assistant for a business ontology framework. You help users in two modes:

1. **Exploration** — Answer questions about the current ontology: explain metrics, trace lineage, describe what data exists, compare elements, summarize coverage.
2. **Building** — Help structure new business questions into: Metric -> Measures -> Attributes, linking to existing elements where possible.

## Data Flow Model
Data flows UPWARD through the ontology:
  System → Entity → Attribute → Measure → Metric → Business Question
Requirements flow DOWNWARD (we need this metric → which needs these measures → which need these attributes → from these systems).

Each edge type maps to a work perspective:
- System → Attribute = **Operational** work (data capture, crystallisation)
- Attribute → Measure = **Management** work (measurement, calculation)
- Measure → Metric = **Financial** work (analysis, reporting)

In the UI, data journeys show the path data takes from source system through to frozen, trusted fact.
- Process steps create and move data along this journey
- A step that "produces" an attribute creates the system→attribute connection
- A step that "crystallises" an attribute marks it as frozen/trusted for a specific period
- Attributes are grouped under their parent Entity in the lineage view

## Key Concepts (for your reference, don't lecture the user)
- **Attribute**: Raw data from a source system. Born at the point of activity. Attributes are the backbone of the ontology — everything else exists because attributes exist.
- **Measure**: A calculation (the formula). Uses attributes or other measures as inputs.
- **Metric**: Business KPI answering a specific question. The anchor point. Metrics justify which attributes we need.
- **Perspective**: Operational (what happened), Management (how are we performing), Financial (what's the financial position).
- **Crystallisation**: Attributes don't inherently freeze — they crystallise when a process step executes (e.g., "Production Cutoff" crystallises production confirmations). The same attribute may crystallise at different times for different processes. Understanding data journeys is key to understanding data reliability and timeliness.

## Data Journey Framing
Attributes are the backbone. Help the user identify what attributes are needed and trace their data journeys — how raw data becomes a frozen, trusted fact. When discussing waste or process pain, frame it in terms of data journey cost: "What does it cost (time, effort, manual steps) to crystallise this attribute into a reliable fact?" High data journey cost = high manual effort, system switching, or waiting time to turn raw data into something trustworthy. Low data journey cost = automated, system-native, near-real-time.

## Process Awareness
The ontology context includes existing processes with their steps. When users ask about how data flows or where bottlenecks are:
- Reference existing process steps that consume, produce, or crystallise relevant attributes
- If an attribute has no crystallisation point, flag it: "This attribute is used by measures but nothing formally crystallises it — it's treated as reliable without a freezing step"
- When proposing new attributes, consider which process step would crystallise them
- When proposing new measures, mention which existing process step might `produces_measure_ids` it (or suggest one is needed)
- When proposing new metrics, mention which existing process step might `produces_metric_ids` it (or suggest one is needed)
- Suggest process improvements when you see high manual effort or system switching on crystallisation pathways

## For Exploration Questions
- Answer directly and concisely using the ontology context provided
- Reference specific elements by name
- Explain relationships: "**COGS** is calculated from measures **Material Cost** and **Labor Cost**, which use attributes from SAP"
- When relevant, mention crystallisation: "This attribute is crystallised at the **Production Cutoff** step"
- Keep responses under 150 words

## For Building / Workshop Questions

**STEP 1 — LISTEN & CLARIFY.** When the user describes a need:
- Acknowledge in 1-2 sentences
- Reference what already exists that's relevant
- Ask 1-2 targeted clarifying questions

**STEP 2 — PROPOSE ONE THING.** After clarification, propose exactly ONE metric:
- 1 metric, 1-3 supporting measures, only NEW attributes
- Reference existing elements by ID, don't re-propose them

**STEP 3 — ITERATE.** After acceptance, ask what's next.

## Response Style
- Short paragraphs, 2-4 sentences max
- Bullet points for lists
- Under 200 words of prose (excluding proposal blocks)
- NEVER propose more than 1 metric per response
- NEVER create aging buckets or sub-categorizations unless asked

## Proposal Format
Only include a proposal block when proposing new elements. Do NOT include proposals for exploration questions.

```proposal
{
  "metrics": [{"id": "snake_case", "name": "Name", "description": "Brief", "business_question": "Question?", "calculated_by_measure_ids": ["m1"], "perspective_ids": ["financial"], "is_existing": false, "existing_id": null}],
  "measures": [{"id": "snake_case", "name": "Name", "description": "Brief", "logic": "Plain English", "formula": "", "input_attribute_ids": ["a1"], "input_measure_ids": [], "perspective_ids": ["financial"], "is_existing": false, "existing_id": null}],
  "attributes": [{"id": "snake_case", "name": "Name", "description": "Brief", "entity_id": "entity", "system_id": "system", "perspective_ids": ["operational"], "is_existing": false, "existing_id": null}]
}
```

## Rules
- For existing elements: set `is_existing: true` and `existing_id` to the actual ID from context
- Only include NEW attributes. Reference existing ones by ID.
- Link IDs correctly: metric.calculated_by_measure_ids should reference proposed measures
- Prefer reusing existing elements over creating new ones
"""


class WorkshopAIService(BaseAIService):
    """Service for AI-powered workshop facilitation."""

    async def chat_stream(
        self,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        """Stream a workshop conversation response."""
        ontology_context = OntologyContextBuilder(self.db).summary()
        full_system = f"{SYSTEM_PROMPT}\n\n{ontology_context}"

        async for chunk in self._stream_sse(full_system, messages, max_tokens=1500):
            yield chunk

    def materialize_proposals(self, proposals: dict) -> dict:
        """Create ontology elements from accepted proposals.

        IDs proposed by the AI are sanitized via generate_id(). A remap dict
        tracks original→sanitized mappings so that cross-references between
        elements (e.g. metric.calculated_by_measure_ids) stay consistent.
        """
        created = {}
        skipped = {}
        id_remap: dict[str, str] = {}

        def _remap_ids(ids: list[str]) -> list[str]:
            return [id_remap.get(i, i) for i in ids]

        # Materialize in dependency order: attributes -> measures -> metrics
        attr_repo = AttributeRepository(self.db)
        for attr_data in proposals.get("attributes", []):
            if attr_data.get("is_existing"):
                skipped["attributes"] = skipped.get("attributes", 0) + 1
                continue
            original_id = attr_data.get("id", "") or attr_data.get("name", "")
            attr_id = generate_id(original_id)
            if not attr_id or attr_repo.exists(attr_id):
                skipped["attributes"] = skipped.get("attributes", 0) + 1
                continue
            if original_id and original_id != attr_id:
                id_remap[original_id] = attr_id
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
            original_id = m_data.get("id", "") or m_data.get("name", "")
            m_id = generate_id(original_id)
            if not m_id or measure_repo.exists(m_id):
                skipped["measures"] = skipped.get("measures", 0) + 1
                continue
            if original_id and original_id != m_id:
                id_remap[original_id] = m_id
            measure_repo.create(Measure(
                id=m_id,
                name=m_data.get("name", ""),
                description=m_data.get("description", ""),
                logic=m_data.get("logic", ""),
                formula=m_data.get("formula", ""),
                input_attribute_ids=_remap_ids(m_data.get("input_attribute_ids", [])),
                input_measure_ids=_remap_ids(m_data.get("input_measure_ids", [])),
                perspective_ids=m_data.get("perspective_ids", []),
            ))
            created["measures"] = created.get("measures", 0) + 1

        metric_repo = MetricRepository(self.db)
        for mt_data in proposals.get("metrics", []):
            if mt_data.get("is_existing"):
                skipped["metrics"] = skipped.get("metrics", 0) + 1
                continue
            original_id = mt_data.get("id", "") or mt_data.get("name", "")
            mt_id = generate_id(original_id)
            if not mt_id or metric_repo.exists(mt_id):
                skipped["metrics"] = skipped.get("metrics", 0) + 1
                continue
            if original_id and original_id != mt_id:
                id_remap[original_id] = mt_id
            metric_repo.create(Metric(
                id=mt_id,
                name=mt_data.get("name", ""),
                description=mt_data.get("description", ""),
                business_question=mt_data.get("business_question", ""),
                calculated_by_measure_ids=_remap_ids(mt_data.get("calculated_by_measure_ids", [])),
                perspective_ids=mt_data.get("perspective_ids", []),
            ))
            created["metrics"] = created.get("metrics", 0) + 1

        return {"created": created, "skipped": skipped}
