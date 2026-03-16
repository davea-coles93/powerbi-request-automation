"""
Gap Analysis AI Service — AI-powered ontology gap detection and recommendations.

Analyzes the current ontology state and provides intelligent gap analysis:
- Structural gaps (metrics without measures, measures without inputs)
- Coverage gaps (perspectives without metrics, entities without attributes)
- Process gaps (high manual effort, system switching, missing automation)
- Data quality signals (unused attributes, shadow system indicators)
"""

from typing import AsyncGenerator

from sqlalchemy.orm import Session

from .base_ai_service import BaseAIService
from .ontology_context import OntologyContextBuilder


SYSTEM_PROMPT = """\
You are a business ontology analyst. You analyze the current state of a business ontology and identify gaps, risks, and improvement opportunities.

## Data Flow Model
Data flows UPWARD through the ontology:
  System → Entity → Attribute → Measure → Metric → Business Question
Requirements flow DOWNWARD (we need this metric → which needs these measures → which need these attributes → from these systems).

## Data Journey Framing
Think of the ontology as a network of data journeys. Attributes are raw data born at the point of activity. They become trusted, frozen facts through crystallisation — process steps that validate, approve, cut off, or reconcile. Your job is to identify missing data journeys (attributes that never get crystallised into reliable facts), high-cost data journeys (attributes that require excessive manual effort, system switching, or waiting time to crystallise), and opportunities to reduce data journey burden (automation, system consolidation, earlier cutoffs).

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
8. **Missing Crystallisation** (shown as "Missing Data Journey" in UI) — Attributes consumed by measures/metrics but no process step crystallises them — they are used as if reliable but nothing formally freezes them
9. **High Crystallisation Cost** (shown as "High Data Journey Cost" in UI) — Attributes that require disproportionate manual effort, system switching, or elapsed time to move from raw data to crystallised fact
10. **Late Crystallisation** (shown as "Late Data Journey" in UI) — Attributes that crystallise too late in the period (e.g., only at month-end) when earlier crystallisation would enable faster reporting
11. **Unproduced Measure** — A measure exists in the model but no process step's `produces_measure_ids` includes it. The calculation is defined but nobody's work actually computes it. This is a management-level gap.
12. **Unproduced Metric** — A metric exists but no process step's `produces_metric_ids` includes it. The business question is defined but no process directly answers it. This is a financial-level gap.

## Edge-Perspective Framing
Gaps exist at three levels of the data journey:
- **Operational** (System → Attribute): attributes not crystallised — raw data never formally frozen
- **Management** (Attribute → Measure): measures not produced by any step — calculations defined but nobody computes them
- **Financial** (Measure → Metric): metrics not produced by any step — business questions asked but no process answers them

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


class GapAIService(BaseAIService):
    """Service for AI-powered gap analysis."""

    async def analyze_stream(self, focus_area: str | None = None) -> AsyncGenerator[str, None]:
        """Stream a gap analysis via SSE."""
        ontology_dump = OntologyContextBuilder(self.db).full_dump()
        full_system = f"{SYSTEM_PROMPT}\n\n{ontology_dump}"

        user_message = "Analyze the current ontology and identify all gaps."
        if focus_area:
            user_message += f" Focus especially on: {focus_area}"

        async for chunk in self._stream_sse(
            full_system,
            [{"role": "user", "content": user_message}],
            max_tokens=3000,
        ):
            yield chunk
