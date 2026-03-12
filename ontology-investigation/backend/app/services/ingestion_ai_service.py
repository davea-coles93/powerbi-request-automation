"""Ingestion AI Service — Cross-source enrichment for staged ingestion elements.

Pass 2 of the two-pass ingestion architecture. Takes the combined output of
all Pass 1 parsers (PowerBI, PowerApp, Excel/CSV, etc.) and uses AI to:

  1. Deduplicate entities across sources (e.g., "Product" in PowerBI = "Product" column in Excel)
  2. Regroup flat columns into proper logical entities
  3. Infer relationships between entities (FK patterns, shared columns)
  4. Reclassify dimensions/measures where heuristics were ambiguous
  5. Promote terminal measures to metrics with business questions
  6. Assign perspectives (operational, management, financial)
  7. Flag cross-source connections and coverage gaps

Streams the enriched result as SSE, reusing the proposal block format
from the Workshop AI so the frontend review UI works unchanged.
"""

import json
import logging
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from .base_ai_service import BaseAIService
from .ontology_context import OntologyContextBuilder

logger = logging.getLogger(__name__)


ENRICHMENT_SYSTEM_PROMPT = """\
You are a data modeling expert enriching raw ingested data into a business ontology.

## Your Task
You receive raw elements extracted from one or more data sources (Power BI models, \
Excel spreadsheets, CSV files, PowerApp solutions). Your job is to transform this \
raw extraction into a well-structured ontology by:

1. **Deduplicating entities** — If "Product" appears in both a Power BI model and a spreadsheet, \
merge them into one entity. Use the richer definition (more attributes, better description).

2. **Regrouping columns into entities** — A flat spreadsheet might have all columns in one "sheet" entity. \
Regroup into logical entities. E.g., Segment/Country/Region → "Geography" entity; \
Product/Manufacturing Price/Sale Price → "Product" entity. \
A fact table with foreign keys and measures is also an entity (e.g., "Sales Transaction").

3. **Inferring relationships** — Detect foreign key patterns (matching column names across entities, \
ID columns referencing other entities). Create explicit relationships.

4. **Reclassifying dimensions vs measures** — The parser uses heuristics that may be wrong. \
Fix any misclassifications. A "Manufacturing Price" that's a property of Product is an attribute, \
not a measure, even though it's numeric. "Units Sold" in a fact table is a measure.

5. **Promoting measures to metrics** — Terminal measures (not used as inputs to other measures) \
that answer a business question should become metrics. E.g., "Total Profit" → Metric with \
business question "What is our total profit by segment and period?"

6. **Assigning perspectives** — Classify each element:
   - **operational**: What work is being done? Raw data creation. (Source systems, transactional data)
   - **management**: How are we performing? KPIs and monitoring. (Aggregated measures, trend analysis)
   - **financial**: What's the financial position? (Revenue, costs, margins, profitability)

7. **Identifying gaps** — What's missing? E.g., "COGS measure exists but no source attributes \
for production cost data" or "Sales data exists but no Customer dimension to analyze by customer."

## Key Ontology Concepts
- **Attribute**: Raw data from a source system. The backbone — everything traces back to attributes.
- **Measure**: A calculation formula. Uses attributes or other measures as inputs.
- **Metric**: Business KPI answering a specific question. The anchor point. Metrics justify which attributes we need.
- **Entity**: A business object (Customer, Product, Sales Transaction). Has attributes.
- **Perspective**: Operational (what happened), Management (how performing), Financial (financial position).

## Response Format

First, provide a brief analysis (3-5 sentences) of what you found across all sources — \
what overlaps, what's unique to each source, what gaps you see.

Then output a single enrichment block with ALL the refined elements:

```enrichment
{
  "entities": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "description": "What this entity represents",
      "source_origins": ["powerbi:Sales-Model", "spreadsheet:Financial-Sample"],
      "core_attributes": ["attr_id_1", "attr_id_2"],
      "lenses": []
    }
  ],
  "attributes": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "description": "Brief description",
      "entity_id": "parent_entity_id",
      "system_id": "source_system_id",
      "source_table": "original table/sheet name",
      "source_column": "original column name",
      "data_type": "string|number|datetime|boolean",
      "perspective_ids": ["operational"],
      "state": "as-is"
    }
  ],
  "measures": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "description": "Brief description",
      "logic": "Plain English calculation logic",
      "formula": "DAX or formula if known, empty string otherwise",
      "input_attribute_ids": ["attr1", "attr2"],
      "input_measure_ids": [],
      "perspective_ids": ["financial"],
      "state": "as-is"
    }
  ],
  "metrics": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "description": "Brief description",
      "business_question": "What business question does this answer?",
      "calculated_by_measure_ids": ["measure1"],
      "perspective_ids": ["financial"],
      "state": "as-is"
    }
  ],
  "relationships": [
    {
      "id": "rel_id",
      "name": "Entity A to Entity B",
      "from_entity_id": "entity_a",
      "to_entity_id": "entity_b",
      "relationship_type": "many-to-one",
      "from_attribute_id": "fk_column",
      "to_attribute_id": "pk_column",
      "description": "How these entities relate"
    }
  ],
  "systems": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "type": "ERP|BI|Spreadsheet|Database|Other",
      "vendor": "Vendor name or empty",
      "integration_status": "Connected|Manual Extract|API",
      "state": "as-is",
      "notes": "Brief note"
    }
  ],
  "perspectives": [
    {
      "id": "operational|management|financial",
      "name": "Operational|Management|Financial",
      "primary_concern": "Brief description of what this perspective cares about"
    }
  ],
  "gaps": [
    {
      "type": "missing_source|unused_attribute|no_metric|missing_dimension|shadow_system",
      "severity": "high|medium|low",
      "description": "What's missing or problematic",
      "affected_elements": ["element_id_1", "element_id_2"],
      "recommendation": "What to do about it"
    }
  ],
  "deduplication_log": [
    {
      "action": "merged|renamed|reclassified|promoted",
      "original_ids": ["old_id_1", "old_id_2"],
      "result_id": "new_id",
      "reason": "Why this change was made"
    }
  ]
}
```

## Rules
- Use snake_case for all IDs
- Keep IDs from the original sources where possible (only change if deduplicating)
- Every attribute must have an entity_id
- Every measure must have at least one input_attribute_id or input_measure_id
- Every metric must have at least one calculated_by_measure_id
- Reference IDs consistently — if you rename an entity, update all attribute entity_ids
- Include the standard 3 perspectives (operational, management, financial) unless the data clearly doesn't span all three
- The deduplication_log helps the user understand what changed from their raw uploads
- Keep descriptions concise (1 sentence)
- For gaps, focus on actionable insights, not theoretical completeness
"""


def _format_staged_elements(staged_sources: list[dict]) -> str:
    """Format all staged source data into a readable prompt section."""
    sections = []

    for i, source in enumerate(staged_sources, 1):
        source_type = source.get("source_type", "unknown")
        source_name = source.get("source_name", f"Source {i}")

        header = f"### Source {i}: {source_name} ({source_type})"
        parts = [header]

        # Entities
        entities = source.get("entities", [])
        if entities:
            lines = []
            for e in entities:
                attrs = e.get("core_attributes", [])
                lines.append(f"  - {e['id']}: {e['name']} ({len(attrs)} attributes)")
            parts.append("Entities:\n" + "\n".join(lines))

        # Attributes
        attributes = source.get("attributes", [])
        if attributes:
            lines = []
            for a in attributes:
                extra = ""
                if a.get("unique_count"):
                    extra = f", {a['unique_count']} unique values"
                lines.append(
                    f"  - {a['id']}: {a['name']} "
                    f"[{a.get('data_type', '?')}] "
                    f"(entity: {a.get('entity_id', '?')}, "
                    f"source: {a.get('source_table', '?')}.{a.get('source_column', '?')}"
                    f"{extra})"
                )
            parts.append(f"Attributes ({len(attributes)}):\n" + "\n".join(lines))

        # Measures
        measures = source.get("measures", [])
        if measures:
            lines = []
            for m in measures:
                formula = m.get("formula", "")
                logic = m.get("logic", "")
                desc = formula[:80] if formula else (logic[:80] if logic else "")
                stats = m.get("statistics", {})
                stats_str = ""
                if stats:
                    stats_str = f" | min={stats.get('min', '?')}, max={stats.get('max', '?')}"
                lines.append(f"  - {m['id']}: {m['name']} — {desc}{stats_str}")
            parts.append(f"Measures ({len(measures)}):\n" + "\n".join(lines))

        # Systems
        systems = source.get("systems", [])
        if systems:
            lines = [f"  - {s['id']}: {s['name']} ({s.get('type', '?')})" for s in systems]
            parts.append("Systems:\n" + "\n".join(lines))

        # Column profiles (from spreadsheets)
        profiles = source.get("column_profiles", [])
        if profiles:
            lines = []
            for p in profiles:
                lines.append(
                    f"  - {p['column_name']}: {p['classification']} "
                    f"[{p['data_type']}] "
                    f"(unique={p['unique_count']}/{p['total_count']}, "
                    f"null={p['null_percentage']}%, "
                    f"samples={p['sample_values'][:5]})"
                )
            parts.append(f"Column Profiles ({len(profiles)}):\n" + "\n".join(lines))

        # Processes
        processes = source.get("processes", [])
        if processes:
            lines = [
                f"  - {p['id']}: {p['name']} ({len(p.get('steps', []))} steps)"
                for p in processes
            ]
            parts.append(f"Processes ({len(processes)}):\n" + "\n".join(lines))

        # Relationships (from source, e.g., TMDL)
        rels = source.get("relationships", [])
        if rels:
            lines = [
                f"  - {r.get('name', r.get('id', '?'))}: "
                f"{r.get('from_entity_id', '?')} → {r.get('to_entity_id', '?')}"
                for r in rels
            ]
            parts.append(f"Relationships ({len(rels)}):\n" + "\n".join(lines))

        sections.append("\n".join(parts))

    return "\n\n---\n\n".join(sections)


class IngestionAIService(BaseAIService):
    """AI service for cross-source enrichment of ingested data."""

    async def enrich_stream(
        self,
        staged_sources: list[dict],
        user_guidance: str = "",
    ) -> AsyncGenerator[str, None]:
        """Stream AI-enriched ontology elements from multiple staged sources.

        Args:
            staged_sources: List of parsed source outputs (from /parse endpoints)
            user_guidance: Optional user instructions (e.g., "This is manufacturing data,
                          focus on COGS lineage")
        """
        # Build the existing ontology context
        ontology_context = OntologyContextBuilder(self.db).summary()

        # Format all staged sources
        staged_text = _format_staged_elements(staged_sources)

        # Count totals for the summary
        total_entities = sum(len(s.get("entities", [])) for s in staged_sources)
        total_attrs = sum(len(s.get("attributes", [])) for s in staged_sources)
        total_measures = sum(len(s.get("measures", [])) for s in staged_sources)
        total_systems = sum(len(s.get("systems", [])) for s in staged_sources)
        source_count = len(staged_sources)
        source_types = list(set(s.get("source_type", "unknown") for s in staged_sources))

        summary_line = (
            f"Enriching {source_count} source(s) ({', '.join(source_types)}): "
            f"{total_entities} entities, {total_attrs} attributes, "
            f"{total_measures} measures, {total_systems} systems"
        )

        # Build user message
        user_msg = f"""## Staged Ingestion Data

{summary_line}

{staged_text}"""

        if user_guidance:
            user_msg += f"\n\n## User Guidance\n{user_guidance}"

        # Build system prompt with existing ontology context
        system = ENRICHMENT_SYSTEM_PROMPT
        if ontology_context and "EMPTY" not in ontology_context:
            system += f"\n\n## Existing Ontology (already in DB — reference but don't duplicate)\n\n{ontology_context}"

        messages = [{"role": "user", "content": user_msg}]

        # Scale output tokens based on input complexity.
        # The enrichment JSON block can be large for multi-source ingestion.
        element_count = total_entities + total_attrs + total_measures + total_systems
        if element_count > 100:
            max_tokens = 8000
        elif element_count > 40:
            max_tokens = 6000
        else:
            max_tokens = 4000

        async for chunk in self._stream_sse(system, messages, max_tokens=max_tokens):
            yield chunk
