import uuid
from sqlalchemy.orm import Session
from typing import Optional

from ..db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
    EntityRelationshipRepository,
    WorkshopSessionRepository,
)
from ..models.workshop import GapItem


class GraphService:
    """Service for graph traversal and queries."""

    def __init__(self, db: Session):
        self.db = db
        self.perspectives = PerspectiveRepository(db)
        self.systems = SystemRepository(db)
        self.entities = EntityRepository(db)
        self.attributes = AttributeRepository(db)
        self.measures = MeasureRepository(db)
        self.metrics = MetricRepository(db)
        self.processes = ProcessRepository(db)
        self.relationships = EntityRelationshipRepository(db)

    def trace_metric(self, metric_id: str) -> Optional[dict]:
        """
        Trace a metric back to its source attributes and systems.

        Returns the full tree: Metric → Measures → Attributes → Systems/Entities
        """
        metric = self.metrics.get_by_id(metric_id)
        if not metric:
            return None

        # Get measures that calculate this metric (batch)
        direct_measures = self.measures.get_by_ids(metric.calculated_by_measure_ids)

        # Collect chained measure IDs and attribute IDs
        chained_measure_ids = set()
        all_attribute_ids = set()
        for measure in direct_measures:
            all_attribute_ids.update(measure.input_attribute_ids)
            chained_measure_ids.update(measure.input_measure_ids)

        # Batch-fetch chained measures
        chained_measures = self.measures.get_by_ids(list(chained_measure_ids))
        for measure in chained_measures:
            all_attribute_ids.update(measure.input_attribute_ids)

        all_measures = direct_measures + chained_measures
        seen_ids = set()
        measures = []
        for m in all_measures:
            if m.id not in seen_ids:
                seen_ids.add(m.id)
                measures.append(m.model_dump())

        # Get attributes (batch)
        attributes_batch = self.attributes.get_by_ids(list(all_attribute_ids))
        system_ids = {attr.system_id for attr in attributes_batch}
        entity_ids = {attr.entity_id for attr in attributes_batch}

        # Get systems and entities (batch)
        systems = [s.model_dump() for s in self.systems.get_by_ids(list(system_ids))]
        entities = [e.model_dump() for e in self.entities.get_by_ids(list(entity_ids))]

        return {
            "metric": metric.model_dump(),
            "measures": measures,
            "attributes": [a.model_dump() for a in attributes_batch],
            "systems": systems,
            "entities": entities,
        }

    def analyze_impact(self, attribute_id: str) -> Optional[dict]:
        """
        Analyze what metrics would be affected if this attribute changes.

        Reverse trace: Attribute → Measures → Metrics
        """
        attribute = self.attributes.get_by_id(attribute_id)
        if not attribute:
            return None

        # Find measures that use this attribute
        all_measures = self.measures.get_all()
        affected_measures = [
            m for m in all_measures if attribute_id in m.input_attribute_ids
        ]

        # Find metrics calculated by these measures
        affected_measure_ids = {m.id for m in affected_measures}
        all_metrics = self.metrics.get_all()
        affected_metrics = [
            m
            for m in all_metrics
            if any(
                measure_id in affected_measure_ids
                for measure_id in m.calculated_by_measure_ids
            )
        ]

        return {
            "attribute": attribute.model_dump(),
            "affected_measures": [m.model_dump() for m in affected_measures],
            "affected_metrics": [m.model_dump() for m in affected_metrics],
        }

    def get_measure_usage(self, measure_id: str) -> Optional[dict]:
        """
        Get usage information for a measure.

        Returns:
        - Which metrics use this measure
        - Which other measures use this measure
        - Which attributes this measure depends on
        - Which other measures this measure depends on
        """
        measure = self.measures.get_by_id(measure_id)
        if not measure:
            return None

        # Find metrics that use this measure
        all_metrics = self.metrics.get_all()
        used_in_metrics = [
            m for m in all_metrics if measure_id in m.calculated_by_measure_ids
        ]

        # Find other measures that use this measure as input
        all_measures = self.measures.get_all()
        used_in_measures = [
            m for m in all_measures if measure_id in m.input_measure_ids
        ]

        # Get attributes this measure depends on (batch)
        depends_on_attributes = [a.model_dump() for a in self.attributes.get_by_ids(measure.input_attribute_ids)]

        # Get other measures this measure depends on (batch)
        depends_on_measures = [m.model_dump() for m in self.measures.get_by_ids(measure.input_measure_ids)]

        return {
            "measure": measure.model_dump(),
            "used_in_metrics": [m.model_dump() for m in used_in_metrics],
            "used_in_measures": [m.model_dump() for m in used_in_measures],
            "depends_on_attributes": depends_on_attributes,
            "depends_on_measures": depends_on_measures,
        }

    def get_full_lineage(self, step_id: str) -> Optional[dict]:
        """
        Get complete lineage from a process step through to semantic model.

        Traces: ProcessStep → Attributes → Measures → Metrics → Systems

        Also includes waste analysis for the step.
        """
        # Find the process step
        all_processes = self.processes.get_all()
        step = None
        for process in all_processes:
            for s in process.steps:
                if s.id == step_id:
                    step = s
                    break
            if step:
                break

        if not step:
            return None

        # Get attributes produced/consumed/crystallized by this step (batch)
        all_attr_ids = list(set(
            step.produces_attribute_ids + step.consumes_attribute_ids + step.crystallizes_attribute_ids
        ))
        all_attrs_batch = {a.id: a for a in self.attributes.get_by_ids(all_attr_ids)}

        produced_attributes = [all_attrs_batch[aid].model_dump() for aid in step.produces_attribute_ids if aid in all_attrs_batch]
        consumed_attributes = [all_attrs_batch[aid].model_dump() for aid in step.consumes_attribute_ids if aid in all_attrs_batch]
        crystallized_attributes = [all_attrs_batch[aid].model_dump() for aid in step.crystallizes_attribute_ids if aid in all_attrs_batch]

        # Find measures that use the produced attributes
        all_attribute_ids = set(step.produces_attribute_ids + step.crystallizes_attribute_ids)
        all_measures = self.measures.get_all()
        affected_measures = []
        for measure in all_measures:
            if any(attr_id in all_attribute_ids for attr_id in measure.input_attribute_ids):
                affected_measures.append(measure.model_dump())

        # Find metrics calculated by these measures
        affected_measure_ids = {m["id"] for m in affected_measures}
        all_metrics = self.metrics.get_all()
        affected_metrics = []
        for metric in all_metrics:
            if any(measure_id in affected_measure_ids for measure_id in metric.calculated_by_measure_ids):
                affected_metrics.append(metric.model_dump())

        # Get systems used by this step (batch)
        systems_used = [s.model_dump() for s in self.systems.get_by_ids(step.systems_used_ids)]

        # Build waste analysis
        waste_analysis = None
        if step.estimated_duration_minutes:
            waste_analysis = {
                "task_duration_minutes": step.estimated_duration_minutes,
                "automation_potential": step.automation_potential,
                "waste_category": step.waste_category,
                "manual_effort_percentage": step.manual_effort_percentage,
                "is_wasteful": step.automation_potential in ['High', 'Medium'],
            }

            # Calculate potential time savings
            if waste_analysis["manual_effort_percentage"]:
                potential_savings = int(
                    step.estimated_duration_minutes *
                    (waste_analysis["manual_effort_percentage"] / 100)
                )
                waste_analysis["potential_time_savings_minutes"] = potential_savings

        return {
            "step": step.model_dump(),
            "consumes_attributes": consumed_attributes,
            "produces_attributes": produced_attributes,
            "crystallizes_attributes": crystallized_attributes,
            "attributes_feed_measures": affected_measures,
            "measures_calculate_metrics": affected_metrics,
            "systems_used": systems_used,
            "waste_analysis": waste_analysis,
        }

    def get_perspective_view(self, perspective_id: str) -> Optional[dict]:
        """
        Get all elements relevant to a perspective.
        """
        perspective = self.perspectives.get_by_id(perspective_id)
        if not perspective:
            return None

        # Get metrics for this perspective
        metrics = self.metrics.get_by_perspective(perspective_id)

        # Get measures for this perspective
        measures = self.measures.get_by_perspective(perspective_id)

        # Get all attributes referenced by these measures (batch)
        attribute_ids = set()
        for measure in measures:
            attribute_ids.update(measure.input_attribute_ids)

        attributes_list = self.attributes.get_by_ids(list(attribute_ids))

        # Get entities from attributes (batch)
        entity_ids = {attr.entity_id for attr in attributes_list}
        entities = self.entities.get_by_ids(list(entity_ids))

        # Get process steps for this perspective
        process_steps = []
        for process in self.processes.get_all():
            for step in process.steps:
                if step.perspective_id == perspective_id:
                    step_dict = step.model_dump()
                    step_with_process = {**step_dict, "process_id": process.id, "process_name": process.name}
                    process_steps.append(step_with_process)

        return {
            "perspective": perspective.model_dump(),
            "metrics": [m.model_dump() for m in metrics],
            "measures": [m.model_dump() for m in measures],
            "attributes": [a.model_dump() for a in attributes_list if a],
            "entities": [e.model_dump() for e in entities if e],
            "process_steps": process_steps,
        }

    def get_entity_full(self, entity_id: str) -> Optional[dict]:
        """
        Get an entity with all its lenses and related attributes.
        """
        entity = self.entities.get_by_id(entity_id)
        if not entity:
            return None

        # Get attributes for this entity
        attributes_list = self.attributes.get_by_entity(entity_id)

        # Get systems from attributes (batch)
        system_ids = {attr.system_id for attr in attributes_list}
        systems = self.systems.get_by_ids(list(system_ids))

        return {
            "entity": entity.model_dump(),
            "attributes": [a.model_dump() for a in attributes_list],
            "systems": [s.model_dump() for s in systems],
        }

    def get_process_flow(
        self,
        process_id: str,
        perspective_level: Optional[str] = None,
        parent_step_id: Optional[str] = None
    ) -> Optional[dict]:
        """
        Get process with step dependencies formatted for visualization.

        Returns nodes (steps) and edges (dependencies) for graph rendering.
        Can filter by perspective_level or get sub-steps of a specific parent.
        """
        process = self.processes.get_by_id(process_id)
        if not process:
            return None

        nodes = []
        edges = []

        # Filter steps based on parameters
        steps_to_show = process.steps

        # If parent_step_id is specified, only show its sub-steps
        if parent_step_id:
            steps_to_show = [s for s in process.steps if s.parent_step_id == parent_step_id]
        # Otherwise, if perspective_level is specified, filter by level and show only top-level steps
        elif perspective_level:
            steps_to_show = [
                s for s in process.steps
                if s.perspective_level == perspective_level
                and not s.parent_step_id
            ]
        else:
            # Default: show only top-level steps (no parent)
            steps_to_show = [s for s in process.steps if not s.parent_step_id]

        for step in steps_to_show:
            nodes.append({
                "id": step.id,
                "label": step.name,
                "sequence": step.sequence,
                "perspective_id": step.perspective_id,
                "actor": step.actor,
                "has_sub_steps": step.has_sub_steps,
                "estimated_duration_minutes": step.estimated_duration_minutes,
                "automation_potential": step.automation_potential,
                "waste_category": step.waste_category,
                "manual_effort_percentage": step.manual_effort_percentage,
                "systems_used_ids": step.systems_used_ids,
                "consumes_attribute_ids": step.consumes_attribute_ids,
                "produces_attribute_ids": step.produces_attribute_ids,
                "crystallizes_attribute_ids": step.crystallizes_attribute_ids,
                "produces_measure_ids": step.produces_measure_ids,
                "produces_metric_ids": step.produces_metric_ids,
                "uses_metric_ids": step.uses_metric_ids,
            })

            # Create edges for dependencies
            for dep_id in step.depends_on_step_ids:
                edges.append({
                    "source": dep_id,
                    "target": step.id,
                })

        return {
            "process": {
                "id": process.id,
                "name": process.name,
                "description": process.description,
            },
            "nodes": nodes,
            "edges": edges,
        }

    def get_crystallization_points(self, process_id: str) -> Optional[dict]:
        """
        Get which attributes crystallize at which steps.
        """
        process = self.processes.get_by_id(process_id)
        if not process:
            return None

        # Collect all crystallized attribute IDs and batch-fetch
        all_cryst_ids = set()
        for step in process.steps:
            all_cryst_ids.update(step.crystallizes_attribute_ids)
        attr_map = {a.id: a for a in self.attributes.get_by_ids(list(all_cryst_ids))}

        crystallization_map = []

        for step in process.steps:
            crystallizes = step.crystallizes_attribute_ids
            if crystallizes:
                crystallized_attrs = [attr_map[aid] for aid in crystallizes if aid in attr_map]
                crystallization_map.append({
                    "step_id": step.id,
                    "step_name": step.name,
                    "step_sequence": step.sequence,
                    "crystallized_attributes": [
                        a.model_dump() for a in crystallized_attrs
                    ],
                })

        return {
            "process_id": process.id,
            "process_name": process.name,
            "crystallization_points": crystallization_map,
        }

    def get_measure_connections(self, measure_id: str) -> Optional[dict]:
        """Get Power BI source mappings and connected process steps for a measure.

        Returns:
        - power_bi_sources: Table[Column] references from the measure's input attributes
        - connected_processes: Process steps that produce attributes this measure consumes
        """
        measure = self.measures.get_by_id(measure_id)
        if not measure:
            return None

        # Build Power BI source mappings from input attributes (batch)
        consumed_attr_ids = set(measure.input_attribute_ids)

        # Also collect attribute IDs from chained measures
        input_measures = self.measures.get_by_ids(measure.input_measure_ids)
        for input_measure in input_measures:
            consumed_attr_ids.update(input_measure.input_attribute_ids)

        # Batch-fetch all needed attributes
        all_attrs = {a.id: a for a in self.attributes.get_by_ids(list(consumed_attr_ids))}

        power_bi_sources = []
        seen_attr_ids = set()
        for attr_id in list(measure.input_attribute_ids) + [
            aid for im in input_measures for aid in im.input_attribute_ids
        ]:
            if attr_id in seen_attr_ids:
                continue
            attr = all_attrs.get(attr_id)
            if attr and (attr.source_table or attr.source_column):
                seen_attr_ids.add(attr_id)
                power_bi_sources.append({
                    "attribute_id": attr.id,
                    "attribute_name": attr.name,
                    "source_table": attr.source_table,
                    "source_column": attr.source_column,
                    "entity_id": attr.entity_id,
                })

        # Find process steps that produce or crystallize attributes this measure consumes
        connected_steps = []
        for process in self.processes.get_all():
            for step in process.steps:
                produced = set(step.produces_attribute_ids)
                crystallized = set(step.crystallizes_attribute_ids)
                shared = consumed_attr_ids & (produced | crystallized)
                if shared:
                    shared_attrs = [
                        {"id": all_attrs[aid].id, "name": all_attrs[aid].name}
                        for aid in shared if aid in all_attrs
                    ]
                    connected_steps.append({
                        "process_id": process.id,
                        "process_name": process.name,
                        "step_id": step.id,
                        "step_name": step.name,
                        "shared_attributes": shared_attrs,
                        "manual_effort_percentage": step.manual_effort_percentage,
                        "waste_category": step.waste_category,
                    })

        return {
            "measure": measure.model_dump(),
            "power_bi_sources": power_bi_sources,
            "connected_processes": connected_steps,
        }

    def detect_gaps(
        self,
        top_down_session_ids: list[str],
        bottom_up_session_ids: list[str],
        db: Session,
    ) -> list[GapItem]:
        """Cross-reference top-down demand with bottom-up supply to identify gaps.

        Gap types:
        - missing_supply: required by top-down but not produced by any process step
        - unused_supply: produced by process steps but not consumed by any metric
        - shadow_system: step uses a system of type "Spreadsheet"
        - high_manual_effort: step with manual_effort_percentage >= 80
        """
        workshop_repo = WorkshopSessionRepository(db)
        gaps: list[GapItem] = []

        # --- Collect demand signal from top-down sessions ---
        required_attr_ids: set[str] = set()
        for sid in top_down_session_ids:
            session = workshop_repo.get_by_id(sid)
            if not session or not session.top_down_data:
                continue
            for mc in session.top_down_data.metrics:
                for mr in mc.required_measures:
                    for ar in mr.required_attributes:
                        if ar.existing_attribute_id:
                            required_attr_ids.add(ar.existing_attribute_id)

        # Also collect attributes required by existing metrics/measures in the ontology
        all_metrics = self.metrics.get_all()
        all_measures = self.measures.get_all()
        for metric in all_metrics:
            for mid in metric.calculated_by_measure_ids:
                measure = self.measures.get_by_id(mid)
                if measure:
                    required_attr_ids.update(measure.input_attribute_ids)

        # --- Collect supply signal from bottom-up sessions (processes) ---
        produced_attr_ids: set[str] = set()
        consumed_attr_ids: set[str] = set()
        all_steps = []

        # Bottom-up sessions link to process_id
        process_ids: set[str] = set()
        for sid in bottom_up_session_ids:
            session = workshop_repo.get_by_id(sid)
            if session and session.process_id:
                process_ids.add(session.process_id)

        for pid in process_ids:
            process = self.processes.get_by_id(pid)
            if not process:
                continue
            for step in process.steps:
                all_steps.append((process, step))
                produced_attr_ids.update(step.produces_attribute_ids)
                consumed_attr_ids.update(step.consumes_attribute_ids)

        # If no bottom-up sessions, fall back to all processes
        if not process_ids:
            for process in self.processes.get_all():
                for step in process.steps:
                    all_steps.append((process, step))
                    produced_attr_ids.update(step.produces_attribute_ids)
                    consumed_attr_ids.update(step.consumes_attribute_ids)

        # --- Missing Supply: required but not produced ---
        missing = required_attr_ids - produced_attr_ids
        for attr_id in missing:
            attr = self.attributes.get_by_id(attr_id)
            gaps.append(GapItem(
                id=str(uuid.uuid4()),
                gap_type="missing_supply",
                description=f"Attribute '{attr.name if attr else attr_id}' is required by metrics but not produced by any mapped process step.",
                priority="high",
                related_attribute_ids=[attr_id],
            ))

        # --- Unused Supply: produced but not consumed by any measure ---
        all_measure_attr_ids: set[str] = set()
        for m in all_measures:
            all_measure_attr_ids.update(m.input_attribute_ids)
        unused = produced_attr_ids - all_measure_attr_ids - consumed_attr_ids
        for attr_id in unused:
            attr = self.attributes.get_by_id(attr_id)
            gaps.append(GapItem(
                id=str(uuid.uuid4()),
                gap_type="unused_supply",
                description=f"Attribute '{attr.name if attr else attr_id}' is produced by a process step but not consumed by any measure or downstream step.",
                priority="low",
                related_attribute_ids=[attr_id],
            ))

        # --- Shadow System & High Manual Effort ---
        for process, step in all_steps:
            # Shadow system: uses a spreadsheet
            for sys_id in step.systems_used_ids:
                system = self.systems.get_by_id(sys_id)
                if system and system.type and system.type.lower() in (
                    "spreadsheet", "excel", "google sheets"
                ):
                    gaps.append(GapItem(
                        id=str(uuid.uuid4()),
                        gap_type="shadow_system",
                        description=f"Step '{step.name}' in process '{process.name}' uses spreadsheet '{system.name}' instead of a proper system.",
                        priority="medium",
                        related_process_ids=[process.id],
                    ))

            # High manual effort
            if step.manual_effort_percentage is not None and step.manual_effort_percentage >= 80:
                gaps.append(GapItem(
                    id=str(uuid.uuid4()),
                    gap_type="high_manual_effort",
                    description=f"Step '{step.name}' in process '{process.name}' has {step.manual_effort_percentage}% manual effort.",
                    priority="medium" if step.manual_effort_percentage < 90 else "high",
                    related_process_ids=[process.id],
                ))

        return gaps

    # ── Crystallisation Pathway Engine ───────────────────────────
    #
    # NOTE: Pathway backward-walks follow depends_on_step_ids within a single
    # process only. Cross-process dependencies (e.g. an attribute produced in
    # Process A that is consumed in Process B) are not currently traced as a
    # single connected chain. Each process is analysed independently.

    def get_crystallisation_pathways(self, attribute_id: str) -> dict | None:
        """
        Get all crystallisation pathways for an attribute.

        For a given attribute, finds every process step that crystallises or
        produces it, walks backward through step dependencies to collect the
        contributing chain, and rolls up cost stats per pathway.
        """
        attribute = self.attributes.get_by_id(attribute_id)
        if not attribute:
            return None

        all_processes = self.processes.get_all()
        pathways = []

        for process in all_processes:
            # Build step lookup for backward walking
            step_map = {s.id: s for s in process.steps}

            for step in process.steps:
                crystallises = attribute_id in step.crystallizes_attribute_ids
                produces = attribute_id in step.produces_attribute_ids
                if not crystallises and not produces:
                    continue

                # Walk backward through depends_on_step_ids to collect chain
                contributing_steps = []
                visited = set()
                queue = [step.id]
                while queue:
                    sid = queue.pop(0)
                    if sid in visited:
                        continue
                    visited.add(sid)
                    s = step_map.get(sid)
                    if s:
                        contributing_steps.append(s)
                        for dep_id in s.depends_on_step_ids:
                            if dep_id not in visited and dep_id in step_map:
                                queue.append(dep_id)

                # Sort by sequence
                contributing_steps.sort(key=lambda s: s.sequence)

                # Roll up stats
                total_duration = 0
                weighted_manual_sum = 0
                total_weighted_duration = 0
                all_system_ids = set()
                waste_cats = set()

                for cs in contributing_steps:
                    dur = cs.estimated_duration_minutes or 0
                    total_duration += dur
                    manual = cs.manual_effort_percentage
                    if manual is not None and dur > 0:
                        weighted_manual_sum += manual * dur
                        total_weighted_duration += dur
                    for sid in cs.systems_used_ids:
                        all_system_ids.add(sid)
                    if cs.waste_category:
                        waste_cats.add(cs.waste_category)

                weighted_manual_pct = (
                    round(weighted_manual_sum / total_weighted_duration)
                    if total_weighted_duration > 0 else 0
                )

                # Resolve system names
                systems_involved = []
                for sid in all_system_ids:
                    system = self.systems.get_by_id(sid)
                    if system:
                        systems_involved.append({"id": system.id, "name": system.name})

                pathways.append({
                    "process_id": process.id,
                    "process_name": process.name,
                    "crystallising_step": step.model_dump(),
                    "contributing_steps": [s.model_dump() for s in contributing_steps],
                    "total_duration_minutes": total_duration,
                    "weighted_manual_effort_pct": weighted_manual_pct,
                    "system_switch_count": max(0, len(all_system_ids) - 1),
                    "systems_involved": systems_involved,
                    "waste_categories": sorted(waste_cats),
                    "crystallises": crystallises,
                    "produces": produces,
                })

        return {
            "attribute": attribute.model_dump(),
            "pathways": pathways,
        }

    def get_business_question_cost(self, metric_id: str) -> dict | None:
        """
        Get total crystallisation cost for answering a business question.

        Traces metric → measures → attributes, then computes crystallisation
        cost for each attribute and aggregates totals.
        """
        trace = self.trace_metric(metric_id)
        if not trace:
            return None

        attribute_costs = []
        total_duration = 0
        total_weighted_manual_sum = 0
        total_weighted_duration = 0
        total_system_switches = 0
        all_waste_cats = set()

        for attr_dict in trace["attributes"]:
            attr_id = attr_dict["id"]
            pathways_result = self.get_crystallisation_pathways(attr_id)
            pathways = pathways_result["pathways"] if pathways_result else []

            attr_duration = sum(p["total_duration_minutes"] for p in pathways)
            attr_manual_sum = sum(
                p["weighted_manual_effort_pct"] * p["total_duration_minutes"]
                for p in pathways if p["total_duration_minutes"] > 0
            )
            attr_weighted_dur = sum(
                p["total_duration_minutes"] for p in pathways
                if p["total_duration_minutes"] > 0
            )
            attr_switches = sum(p["system_switch_count"] for p in pathways)
            attr_waste = set()
            for p in pathways:
                attr_waste.update(p["waste_categories"])

            attribute_costs.append({
                "attribute": attr_dict,
                "pathways": pathways,
                "total_duration_minutes": attr_duration,
                "weighted_manual_effort_pct": (
                    round(attr_manual_sum / attr_weighted_dur)
                    if attr_weighted_dur > 0 else 0
                ),
                "system_switch_count": attr_switches,
                "waste_categories": sorted(attr_waste),
            })

            total_duration += attr_duration
            total_weighted_manual_sum += attr_manual_sum
            total_weighted_duration += attr_weighted_dur
            total_system_switches += attr_switches
            all_waste_cats.update(attr_waste)

        return {
            "metric": trace["metric"],
            "attribute_costs": attribute_costs,
            "totals": {
                "total_duration_minutes": total_duration,
                "weighted_manual_effort_pct": (
                    round(total_weighted_manual_sum / total_weighted_duration)
                    if total_weighted_duration > 0 else 0
                ),
                "total_system_switches": total_system_switches,
                "waste_categories": sorted(all_waste_cats),
                "attribute_count": len(attribute_costs),
            },
        }

    def _compute_step_costs(
        self,
        entity_step_map: dict[str, list[tuple]],
        step_maps: dict[str, dict],
        entity_ids: list[str],
    ) -> dict:
        """Compute cost summaries from a map of entity_id → list[(process, step)].

        Uses backward-walk through step dependencies to accumulate contributing
        chain costs (duration, manual effort, system switches, waste).
        """
        costs = {}
        for eid in entity_ids:
            entries = entity_step_map.get(eid, [])
            if not entries:
                continue

            total_duration = 0
            weighted_manual_sum = 0
            total_weighted_dur = 0
            all_sys_ids = set()
            waste_cats = set()
            process_names = set()
            process_ids = set()

            for process, step in entries:
                s_map = step_maps[process.id]
                visited = set()
                queue = [step.id]
                while queue:
                    sid = queue.pop(0)
                    if sid in visited:
                        continue
                    visited.add(sid)
                    s = s_map.get(sid)
                    if s:
                        dur = s.estimated_duration_minutes or 0
                        total_duration += dur
                        manual = s.manual_effort_percentage
                        if manual is not None and dur > 0:
                            weighted_manual_sum += manual * dur
                            total_weighted_dur += dur
                        for sys_id in s.systems_used_ids:
                            all_sys_ids.add(sys_id)
                        if s.waste_category:
                            waste_cats.add(s.waste_category)
                        for dep_id in s.depends_on_step_ids:
                            if dep_id not in visited and dep_id in s_map:
                                queue.append(dep_id)

                process_names.add(process.name)
                process_ids.add(process.id)

            costs[eid] = {
                "total_duration_minutes": total_duration,
                "weighted_manual_effort_pct": (
                    round(weighted_manual_sum / total_weighted_dur)
                    if total_weighted_dur > 0 else 0
                ),
                "system_switch_count": max(0, len(all_sys_ids) - 1),
                "waste_categories": sorted(waste_cats),
                "process_names": sorted(process_names),
                "process_ids": sorted(process_ids),
            }

        return costs

    def get_lineage_with_costs(self) -> dict:
        """
        Get full lineage graph with crystallisation cost annotations.

        Returns all metrics, measures, attributes, entities, systems plus
        cost maps for attributes, measures, and metrics.
        """
        all_metrics = self.metrics.get_all()
        all_measures = self.measures.get_all()
        all_attributes = self.attributes.get_all()
        all_entities = self.entities.get_all()
        all_systems = self.systems.get_all()
        all_processes = self.processes.get_all()

        # Build step maps and entity→step maps for all three edge types
        attr_step_map: dict[str, list[tuple]] = {}
        measure_step_map: dict[str, list[tuple]] = {}
        metric_step_map: dict[str, list[tuple]] = {}
        step_maps: dict[str, dict] = {}

        for process in all_processes:
            s_map = {s.id: s for s in process.steps}
            step_maps[process.id] = s_map
            for step in process.steps:
                # Attribute costs (existing: crystallisation + production)
                for attr_id in step.crystallizes_attribute_ids + step.produces_attribute_ids:
                    if attr_id not in attr_step_map:
                        attr_step_map[attr_id] = []
                    attr_step_map[attr_id].append((process, step))
                # Measure costs (new)
                for meas_id in step.produces_measure_ids:
                    if meas_id not in measure_step_map:
                        measure_step_map[meas_id] = []
                    measure_step_map[meas_id].append((process, step))
                # Metric costs (new)
                for met_id in step.produces_metric_ids:
                    if met_id not in metric_step_map:
                        metric_step_map[met_id] = []
                    metric_step_map[met_id].append((process, step))

        attr_ids = [a.id for a in all_attributes]
        meas_ids = [m.id for m in all_measures]
        met_ids = [m.id for m in all_metrics]

        crystallisation_costs = self._compute_step_costs(attr_step_map, step_maps, attr_ids)
        measure_costs = self._compute_step_costs(measure_step_map, step_maps, meas_ids)
        metric_costs = self._compute_step_costs(metric_step_map, step_maps, met_ids)

        return {
            "metrics": [m.model_dump() for m in all_metrics],
            "measures": [m.model_dump() for m in all_measures],
            "attributes": [a.model_dump() for a in all_attributes],
            "entities": [e.model_dump() for e in all_entities],
            "systems": [s.model_dump() for s in all_systems],
            "crystallisation_costs": crystallisation_costs,
            "measure_costs": measure_costs,
            "metric_costs": metric_costs,
        }

    def get_process_interconnections(self) -> dict:
        """
        Get process-to-process connections via shared attributes.

        Finds where one process produces/crystallises an attribute that
        another process consumes.
        """
        all_processes = self.processes.get_all()
        all_attributes = self.attributes.get_all()
        attr_name_map = {a.id: a.name for a in all_attributes}

        # Build per-process produced and consumed sets
        process_produced: dict[str, set[str]] = {}
        process_consumed: dict[str, set[str]] = {}

        for process in all_processes:
            produced = set()
            consumed = set()
            for step in process.steps:
                produced.update(step.produces_attribute_ids)
                produced.update(step.crystallizes_attribute_ids)
                consumed.update(step.consumes_attribute_ids)
            process_produced[process.id] = produced
            process_consumed[process.id] = consumed

        # Find connections: process A produces what process B consumes
        connections = []
        seen = set()
        for p_a in all_processes:
            for p_b in all_processes:
                if p_a.id == p_b.id:
                    continue
                shared = process_produced.get(p_a.id, set()) & process_consumed.get(p_b.id, set())
                if shared:
                    key = (p_a.id, p_b.id)
                    if key not in seen:
                        seen.add(key)
                        connections.append({
                            "from_id": p_a.id,
                            "to_id": p_b.id,
                            "shared_attributes": [
                                {"id": aid, "name": attr_name_map.get(aid, aid)}
                                for aid in sorted(shared)
                            ],
                        })

        processes = [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "step_count": len(p.steps),
            }
            for p in all_processes
        ]

        return {"processes": processes, "connections": connections}
