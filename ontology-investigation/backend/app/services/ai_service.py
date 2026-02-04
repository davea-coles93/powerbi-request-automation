import os
from sqlalchemy.orm import Session
from typing import Optional

from .graph_service import GraphService

# Try to import anthropic, but don't fail if not available
try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class AIService:
    """Service for AI-powered ontology analysis."""

    def __init__(self, db: Optional[Session]):
        self.db = db
        self.graph_service = GraphService(db) if db else None

        # Initialize Anthropic client if available
        self.client = None
        if ANTHROPIC_AVAILABLE:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self.client = anthropic.Anthropic(api_key=api_key)

    def is_configured(self) -> bool:
        """Check if AI service is properly configured."""
        return self.client is not None

    async def explain_metric(self, metric_id: str) -> Optional[dict]:
        """
        Generate a natural language explanation of a metric.
        """
        if not self.graph_service:
            return None

        # Get the metric trace
        trace = self.graph_service.trace_metric(metric_id)
        if not trace:
            return None

        # Prepare context for LLM
        context = self._prepare_metric_context(trace)

        # If AI not configured, return a structured summary
        if not self.client:
            return self._generate_fallback_explanation(trace)

        # Call Claude API
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are a business analyst explaining metrics to stakeholders.

Based on the following ontology information, provide a clear, non-technical explanation of this metric.

{context}

Provide:
1. A brief explanation of what this metric tells the business (2-3 sentences)
2. A summary of where the data comes from (the lineage)

Be concise and business-focused, not technical.""",
                }
            ],
        )

        explanation = message.content[0].text

        # Parse the response (simple split for now)
        parts = explanation.split("\n\n")
        main_explanation = parts[0] if parts else explanation
        lineage_summary = parts[1] if len(parts) > 1 else "See trace for data lineage."

        return {
            "metric_name": trace["metric"]["name"],
            "explanation": main_explanation,
            "lineage_summary": lineage_summary,
        }

    async def find_gaps(self, focus_area: Optional[str] = None) -> dict:
        """
        Analyze the ontology and identify gaps.
        """
        if not self.graph_service:
            return {"gaps": [], "recommendations": []}

        # Get all current elements
        metrics = self.graph_service.metrics.get_all()
        measures = self.graph_service.measures.get_all()
        observations = self.graph_service.observations.get_all()

        gaps = []
        recommendations = []

        # Check for metrics without measures
        for metric in metrics:
            if not metric.calculated_by_measure_ids:
                gaps.append({
                    "type": "metric_without_measures",
                    "element": metric.name,
                    "issue": "Metric has no measures defined",
                })

        # Check for measures without observations
        for measure in measures:
            if not measure.input_observation_ids and not measure.input_measure_ids:
                gaps.append({
                    "type": "measure_without_inputs",
                    "element": measure.name,
                    "issue": "Measure has no input observations or measures",
                })

        # Check for orphan observations (not used by any measure)
        used_observation_ids = set()
        for measure in measures:
            used_observation_ids.update(measure.input_observation_ids)

        for obs in observations:
            if obs.id not in used_observation_ids:
                gaps.append({
                    "type": "unused_observation",
                    "element": obs.name,
                    "issue": "Observation is not used by any measure",
                })

        # Generate recommendations
        if gaps:
            recommendations.append(
                f"Found {len(gaps)} gaps in the ontology that should be addressed."
            )

        metric_gaps = [g for g in gaps if g["type"] == "metric_without_measures"]
        if metric_gaps:
            recommendations.append(
                f"{len(metric_gaps)} metrics need measures defined to enable calculation."
            )

        return {"gaps": gaps, "recommendations": recommendations}

    async def suggest_measures(self, requirement: str) -> dict:
        """
        Suggest measures and observations for a natural language requirement.
        """
        if not self.client:
            return {
                "suggested_measures": [],
                "suggested_observations": [],
                "rationale": "AI service not configured. Please set ANTHROPIC_API_KEY.",
            }

        # Get current ontology context
        current_measures = self.graph_service.measures.get_all() if self.graph_service else []
        current_observations = (
            self.graph_service.observations.get_all() if self.graph_service else []
        )

        context = f"""Current measures in the ontology:
{chr(10).join([f"- {m.name}: {m.description or 'No description'}" for m in current_measures[:20]])}

Current observations in the ontology:
{chr(10).join([f"- {o.name}: {o.description or 'No description'}" for o in current_observations[:20]])}"""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are a business ontology expert helping design measures and observations.

The user has this requirement: "{requirement}"

{context}

Suggest:
1. New measures that would be needed (name, description, logic)
2. New observations that would be needed (name, description, what entity it relates to)
3. Brief rationale for your suggestions

Consider what already exists and don't duplicate. Format as JSON with keys: suggested_measures, suggested_observations, rationale""",
                }
            ],
        )

        # Parse response (in production, use proper JSON parsing)
        response_text = message.content[0].text

        # Simple fallback if parsing fails
        return {
            "suggested_measures": [],
            "suggested_observations": [],
            "rationale": response_text,
        }

    def _prepare_metric_context(self, trace: dict) -> str:
        """Prepare rich context for LLM explanation."""
        metric = trace["metric"]
        measures = trace["measures"]
        observations = trace["observations"]
        systems = trace["systems"]

        context = f"""METRIC: {metric['name']}
Business Question: {metric['business_question']}
Perspectives: {', '.join(metric.get('perspective_ids', []))}

CALCULATED BY MEASURES:
{chr(10).join([f"- {m['name']}: {m.get('logic', 'No logic defined')}" for m in measures])}

SOURCED FROM OBSERVATIONS:
{chr(10).join([f"- {o['name']} (from {o['system_id']}, reliability: {o.get('reliability', 'Unknown')})" for o in observations])}

DATA ORIGINATES IN SYSTEMS:
{chr(10).join([f"- {s['name']} ({s['type']})" for s in systems])}
"""
        return context

    def _generate_fallback_explanation(self, trace: dict) -> dict:
        """Generate a structured explanation without AI."""
        metric = trace["metric"]
        measures = trace["measures"]
        observations = trace["observations"]
        systems = trace["systems"]

        explanation = (
            f"{metric['name']} answers the question: {metric['business_question']} "
            f"It is calculated from {len(measures)} measure(s) using data from {len(observations)} observation(s)."
        )

        lineage = (
            f"Data flows from {', '.join([s['name'] for s in systems])} "
            f"through observations ({', '.join([o['name'] for o in observations])}) "
            f"into measures ({', '.join([m['name'] for m in measures])})."
        )

        return {
            "metric_name": metric["name"],
            "explanation": explanation,
            "lineage_summary": lineage,
        }
