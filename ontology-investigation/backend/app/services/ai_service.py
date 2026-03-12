"""AI-powered ontology analysis service."""

import json
from typing import Optional

from sqlalchemy.orm import Session

from .base_ai_service import BaseAIService
from .graph_service import GraphService


class AIService(BaseAIService):
    """Service for AI-powered ontology analysis."""

    def __init__(self, db: Optional[Session]):
        super().__init__(db)
        self.graph_service = GraphService(db) if db else None

    async def explain_metric(self, metric_id: str) -> Optional[dict]:
        """Generate a natural language explanation of a metric."""
        if not self.graph_service:
            return None

        trace = self.graph_service.trace_metric(metric_id)
        if not trace:
            return None

        if not self.is_configured():
            return self._generate_fallback_explanation(trace)

        context = self._prepare_metric_context(trace)

        system = "You are a business analyst explaining metrics to stakeholders."
        user_msg = f"""Based on the following ontology information, provide a clear, non-technical explanation of this metric.

{context}

Provide:
1. A brief explanation of what this metric tells the business (2-3 sentences)
2. A summary of where the data comes from (the lineage)

Be concise and business-focused, not technical."""

        # Collect streamed response
        explanation = ""
        async for chunk in self._stream_sse(system, [{"role": "user", "content": user_msg}], max_tokens=1024):
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:].strip())
                    if data.get("type") == "text":
                        explanation += data.get("content", "")
                except (json.JSONDecodeError, KeyError):
                    pass

        if not explanation:
            return self._generate_fallback_explanation(trace)

        parts = explanation.split("\n\n")
        main_explanation = parts[0] if parts else explanation
        lineage_summary = parts[1] if len(parts) > 1 else "See trace for data lineage."

        return {
            "metric_name": trace["metric"]["name"],
            "explanation": main_explanation,
            "lineage_summary": lineage_summary,
        }

    async def find_gaps(self, focus_area: Optional[str] = None) -> dict:
        """Analyze the ontology and identify gaps."""
        if not self.graph_service:
            return {"gaps": [], "recommendations": []}

        metrics = self.graph_service.metrics.get_all()
        measures = self.graph_service.measures.get_all()
        attributes = self.graph_service.attributes.get_all()

        gaps = []
        recommendations = []

        for metric in metrics:
            if not metric.calculated_by_measure_ids:
                gaps.append({
                    "type": "metric_without_measures",
                    "element": metric.name,
                    "issue": "Metric has no measures defined",
                })

        for measure in measures:
            if not measure.input_attribute_ids and not measure.input_measure_ids:
                gaps.append({
                    "type": "measure_without_inputs",
                    "element": measure.name,
                    "issue": "Measure has no input attributes or measures",
                })

        used_attribute_ids = set()
        for measure in measures:
            used_attribute_ids.update(measure.input_attribute_ids)

        for attr in attributes:
            if attr.id not in used_attribute_ids:
                gaps.append({
                    "type": "unused_attribute",
                    "element": attr.name,
                    "issue": "Attribute is not used by any measure",
                })

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
        """Suggest measures and attributes for a natural language requirement."""
        if not self.is_configured():
            return {
                "suggested_measures": [],
                "suggested_attributes": [],
                "rationale": "AI service not configured. Set ANTHROPIC_API_KEY or configure Azure AI.",
            }

        current_measures = self.graph_service.measures.get_all() if self.graph_service else []
        current_attributes = self.graph_service.attributes.get_all() if self.graph_service else []

        context = f"""Current measures in the ontology:
{chr(10).join([f"- {m.name}: {m.description or 'No description'}" for m in current_measures[:20]])}

Current attributes in the ontology:
{chr(10).join([f"- {a.name}: {a.description or 'No description'}" for a in current_attributes[:20]])}"""

        system = "You are a business ontology expert helping design measures and attributes."
        user_msg = f"""The user has this requirement: "{requirement}"

{context}

Suggest:
1. New measures that would be needed (name, description, logic)
2. New attributes that would be needed (name, description, what entity it relates to)
3. Brief rationale for your suggestions

Consider what already exists and don't duplicate. Respond with ONLY valid JSON (no markdown fencing) with keys: suggested_measures, suggested_attributes, rationale"""

        # Collect streamed response
        response_text = ""
        async for chunk in self._stream_sse(system, [{"role": "user", "content": user_msg}], max_tokens=1024):
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:].strip())
                    if data.get("type") == "text":
                        response_text += data.get("content", "")
                except (json.JSONDecodeError, KeyError):
                    pass

        if not response_text:
            return {
                "suggested_measures": [],
                "suggested_attributes": [],
                "rationale": "AI service returned no response.",
            }

        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())
            return {
                "suggested_measures": parsed.get("suggested_measures", []),
                "suggested_attributes": parsed.get("suggested_attributes", []),
                "rationale": parsed.get("rationale", response_text),
            }
        except (json.JSONDecodeError, IndexError):
            return {
                "suggested_measures": [],
                "suggested_attributes": [],
                "rationale": response_text,
            }

    async def analyze_processes(self) -> dict:
        """Analyze processes for efficiency insights."""
        if not self.graph_service:
            return {"insights": [], "summary": "No data available."}

        processes = self.graph_service.processes.get_all()
        systems = self.graph_service.systems.get_all()
        system_map = {s.id: s.name for s in systems}

        insights = []

        for process in processes:
            for step in process.steps:
                if step.manual_effort_percentage and step.manual_effort_percentage >= 80:
                    insights.append({
                        "type": "high_manual_effort",
                        "priority": "high",
                        "description": f"Step '{step.name}' in '{process.name}' is {step.manual_effort_percentage}% manual. Consider automation to reduce execution burden.",
                        "process_name": process.name,
                        "step_name": step.name,
                        "estimated_savings": f"Up to {step.manual_effort_percentage - 20}% effort reduction",
                    })

                if step.waste_category:
                    insights.append({
                        "type": "waste_identified",
                        "priority": "medium",
                        "description": f"Step '{step.name}' in '{process.name}' has waste: {step.waste_category}.",
                        "process_name": process.name,
                        "step_name": step.name,
                        "estimated_savings": "Varies by waste type",
                    })

                if step.systems_used_ids and len(step.systems_used_ids) >= 3:
                    system_names = [system_map.get(sid, sid) for sid in step.systems_used_ids]
                    insights.append({
                        "type": "system_switching",
                        "priority": "medium",
                        "description": f"Step '{step.name}' in '{process.name}' touches {len(step.systems_used_ids)} systems ({', '.join(system_names)}). System consolidation or integration could reduce switching overhead.",
                        "process_name": process.name,
                        "step_name": step.name,
                        "estimated_savings": "Reduced context switching time",
                    })

                if (step.automation_potential in ('High', 'Medium')
                        and step.manual_effort_percentage
                        and step.manual_effort_percentage >= 50):
                    insights.append({
                        "type": "automation_opportunity",
                        "priority": "high" if step.automation_potential == 'High' else "medium",
                        "description": f"Step '{step.name}' in '{process.name}' has {step.automation_potential} automation potential but is {step.manual_effort_percentage}% manual. This is a prime automation candidate.",
                        "process_name": process.name,
                        "step_name": step.name,
                        "estimated_savings": f"Could automate {step.manual_effort_percentage}% of effort",
                    })

        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda x: priority_order.get(x["priority"], 3))

        total_steps = sum(len(p.steps) for p in processes)
        high_manual = len([i for i in insights if i["type"] == "high_manual_effort"])
        waste_count = len([i for i in insights if i["type"] == "waste_identified"])

        summary = (
            f"Analyzed {len(processes)} processes with {total_steps} total steps. "
            f"Found {high_manual} high-manual-effort steps and {waste_count} waste instances."
        )

        return {"insights": insights, "summary": summary}

    def _prepare_metric_context(self, trace: dict) -> str:
        metric = trace["metric"]
        measures = trace["measures"]
        attributes = trace["attributes"]
        systems = trace["systems"]

        return f"""METRIC: {metric['name']}
Business Question: {metric['business_question']}
Perspectives: {', '.join(metric.get('perspective_ids', []))}

CALCULATED BY MEASURES:
{chr(10).join([f"- {m['name']}: {m.get('logic', 'No logic defined')}" for m in measures])}

SOURCED FROM ATTRIBUTES:
{chr(10).join([f"- {a['name']} (from {a['system_id']}, reliability: {a.get('reliability', 'Unknown')})" for a in attributes])}

DATA ORIGINATES IN SYSTEMS:
{chr(10).join([f"- {s['name']} ({s['type']})" for s in systems])}
"""

    def _generate_fallback_explanation(self, trace: dict) -> dict:
        metric = trace["metric"]
        measures = trace["measures"]
        attributes = trace["attributes"]
        systems = trace["systems"]

        explanation = (
            f"{metric['name']} answers the question: {metric['business_question']} "
            f"It is calculated from {len(measures)} measure(s) using data from {len(attributes)} attribute(s)."
        )

        lineage = (
            f"Data flows from {', '.join([s['name'] for s in systems])} "
            f"through attributes ({', '.join([a['name'] for a in attributes])}) "
            f"into measures ({', '.join([m['name'] for m in measures])})."
        )

        return {
            "metric_name": metric["name"],
            "explanation": explanation,
            "lineage_summary": lineage,
        }
