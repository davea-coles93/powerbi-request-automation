"""
Gap Analysis AI Service — AI-powered ontology gap detection and recommendations.

Analyzes the current ontology state and provides intelligent gap analysis:
- Structural gaps (metrics without measures, measures without inputs)
- Coverage gaps (perspectives without metrics, entities without attributes)
- Process gaps (high manual effort, system switching, missing automation)
- Data quality signals (unused attributes, shadow system indicators)
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
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
)

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


SYSTEM_PROMPT = """\
You are a business ontology analyst. You analyze the current state of a business ontology and identify gaps, risks, and improvement opportunities.

## Your Task
Analyze the ontology data provided and produce a structured gap analysis. Focus on actionable findings, not generic advice.

## Gap Categories
1. **Missing Supply** — A metric or measure needs data that isn't captured as an attribute
2. **Unused Supply** — An attribute exists but no measure uses it (wasted data collection)
3. **Shadow System** — Signs of manual workarounds: Excel-based systems, high manual effort + low automation potential
4. **High Manual Effort** — Process steps with >70% manual effort that could be automated
5. **Broken Lineage** — Metrics referencing measures that don't exist, or measures referencing missing attributes
6. **Coverage Gap** — A perspective or entity has no associated metrics/measures
7. **Process Risk** — Critical steps with no system backup, single-actor dependencies

## Response Format
Provide analysis in two parts:

1. **Summary** (2-3 sentences): Overall health assessment
2. **Gaps**: A structured list

```gap_analysis
{
  "summary": "Brief overall assessment",
  "health_score": 72,
  "gaps": [
    {
      "id": "gap_1",
      "type": "missing_supply",
      "severity": "high",
      "title": "Short descriptive title",
      "description": "What's missing and why it matters",
      "affected_elements": ["metric_id_1", "measure_id_2"],
      "recommendation": "Specific action to take"
    }
  ]
}
```

## Rules
- Only report real gaps found in the data — never invent problems
- Severity: "high" = blocks reporting/decisions, "medium" = quality risk, "low" = improvement opportunity
- health_score: 0-100 based on completeness and quality of the ontology
- Keep descriptions actionable and specific, reference element names
- Limit to the 10 most important gaps (prioritize by severity)
- If the ontology is empty, say so and suggest starting with the AI Assistant
"""


def _build_full_ontology_dump(db: Session) -> str:
    """Build a complete dump of the ontology for gap analysis."""
    perspectives = PerspectiveRepository(db).get_all()
    systems = SystemRepository(db).get_all()
    entities = EntityRepository(db).get_all()
    attributes = AttributeRepository(db).get_all()
    measures = MeasureRepository(db).get_all()
    metrics = MetricRepository(db).get_all()
    processes = ProcessRepository(db).get_all()

    sections = []

    sections.append(f"COUNTS: {len(perspectives)} perspectives, {len(systems)} systems, "
                     f"{len(entities)} entities, {len(attributes)} attributes, "
                     f"{len(measures)} measures, {len(metrics)} metrics, {len(processes)} processes")

    if perspectives:
        lines = [f"  - {p.id}: {p.name} — {p.primary_concern}" for p in perspectives]
        sections.append("PERSPECTIVES:\n" + "\n".join(lines))

    if systems:
        lines = [f"  - {s.id}: {s.name} (type: {s.type}, vendor: {s.vendor or 'none'})" for s in systems]
        sections.append("SYSTEMS:\n" + "\n".join(lines))

    if entities:
        lines = [f"  - {e.id}: {e.name}" for e in entities]
        sections.append("ENTITIES:\n" + "\n".join(lines))

    if attributes:
        lines = []
        for a in attributes:
            used_by = []
            for m in measures:
                if a.id in (m.input_attribute_ids or []):
                    used_by.append(m.id)
            used_str = f" | used by: {','.join(used_by)}" if used_by else " | UNUSED"
            lines.append(f"  - {a.id}: {a.name} (entity: {a.entity_id}, system: {a.system_id}, "
                         f"perspectives: {','.join(a.perspective_ids or [])}){used_str}")
        sections.append("ATTRIBUTES:\n" + "\n".join(lines))

    if measures:
        lines = []
        for m in measures:
            inputs = []
            if m.input_attribute_ids:
                inputs.append(f"attrs: {','.join(m.input_attribute_ids)}")
            if m.input_measure_ids:
                inputs.append(f"measures: {','.join(m.input_measure_ids)}")
            input_str = f" | inputs: {'; '.join(inputs)}" if inputs else " | NO INPUTS"

            used_by_metrics = [mt.id for mt in metrics if m.id in (mt.calculated_by_measure_ids or [])]
            used_str = f" | used by metrics: {','.join(used_by_metrics)}" if used_by_metrics else " | NOT USED BY ANY METRIC"

            lines.append(f"  - {m.id}: {m.name} — {m.logic or m.description or 'no description'}{input_str}{used_str}")
        sections.append("MEASURES:\n" + "\n".join(lines))

    if metrics:
        lines = []
        for mt in metrics:
            measure_refs = mt.calculated_by_measure_ids or []
            missing_measures = [mid for mid in measure_refs if not any(m.id == mid for m in measures)]
            status = ""
            if not measure_refs:
                status = " | NO MEASURES DEFINED"
            elif missing_measures:
                status = f" | MISSING MEASURES: {','.join(missing_measures)}"
            lines.append(f"  - {mt.id}: {mt.name} — Q: \"{mt.business_question}\" "
                         f"(measures: {','.join(measure_refs)}){status}")
        sections.append("METRICS:\n" + "\n".join(lines))

    if processes:
        for p in processes:
            step_lines = []
            for s in p.steps:
                flags = []
                if s.manual_effort_percentage and s.manual_effort_percentage >= 70:
                    flags.append(f"MANUAL:{s.manual_effort_percentage}%")
                if s.waste_category:
                    flags.append(f"WASTE:{s.waste_category}")
                if s.systems_used_ids and len(s.systems_used_ids) >= 3:
                    flags.append(f"MULTI-SYSTEM:{len(s.systems_used_ids)}")
                if s.automation_potential in ("High", "Medium") and (s.manual_effort_percentage or 0) >= 50:
                    flags.append("AUTOMATION-OPPORTUNITY")
                flag_str = f" [{', '.join(flags)}]" if flags else ""
                step_lines.append(f"    {s.sequence}. {s.name} ({s.perspective_id}, actor: {s.actor or '?'})"
                                  f"{flag_str}")
            sections.append(f"PROCESS: {p.id} — {p.name}\n" + "\n".join(step_lines))

    if not sections:
        return "The ontology is EMPTY. There is nothing to analyze."

    return "## Full Ontology State for Analysis\n\n" + "\n\n".join(sections)


class GapAIService:
    """Service for AI-powered gap analysis."""

    def __init__(self, db: Session):
        self.db = db
        self.client = None
        if ANTHROPIC_AVAILABLE:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self.client = anthropic.AsyncAnthropic(api_key=api_key)

    def is_configured(self) -> bool:
        return self.client is not None

    async def analyze_stream(self, focus_area: str | None = None) -> AsyncGenerator[str, None]:
        """Stream a gap analysis via SSE."""
        if not self.client:
            yield 'data: {"type":"error","content":"AI service not configured. Set ANTHROPIC_API_KEY."}\n\n'
            return

        ontology_dump = _build_full_ontology_dump(self.db)
        full_system = f"{SYSTEM_PROMPT}\n\n{ontology_dump}"

        user_message = "Analyze the current ontology and identify all gaps."
        if focus_area:
            user_message += f" Focus especially on: {focus_area}"

        try:
            async with self.client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=3000,
                system=full_system,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for text in stream.text_stream:
                    payload = json.dumps({"type": "text", "content": text})
                    yield f"data: {payload}\n\n"

            yield 'data: {"type":"done"}\n\n'

        except Exception as e:
            payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {payload}\n\n"
