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
)


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

    def trace_metric(self, metric_id: str) -> Optional[dict]:
        """
        Trace a metric back to its source attributes and systems.

        Returns the full tree: Metric → Measures → Attributes → Systems/Entities
        """
        metric = self.metrics.get_by_id(metric_id)
        if not metric:
            return None

        # Get measures that calculate this metric
        measures = []
        all_attribute_ids = set()
        for measure_id in metric.calculated_by_measure_ids:
            measure = self.measures.get_by_id(measure_id)
            if measure:
                measures.append(measure.model_dump())
                all_attribute_ids.update(measure.input_attribute_ids)
                # Also check for chained measures
                for input_measure_id in measure.input_measure_ids:
                    input_measure = self.measures.get_by_id(input_measure_id)
                    if input_measure:
                        measures.append(input_measure.model_dump())
                        all_attribute_ids.update(input_measure.input_attribute_ids)

        # Get attributes
        attributes_list = []
        system_ids = set()
        entity_ids = set()
        for attr_id in all_attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                attributes_list.append(attr.model_dump())
                system_ids.add(attr.system_id)
                entity_ids.add(attr.entity_id)

        # Get systems
        systems = []
        for sys_id in system_ids:
            system = self.systems.get_by_id(sys_id)
            if system:
                systems.append(system.model_dump())

        # Get entities
        entities = []
        for ent_id in entity_ids:
            entity = self.entities.get_by_id(ent_id)
            if entity:
                entities.append(entity.model_dump())

        return {
            "metric": metric.model_dump(),
            "measures": measures,
            "attributes": attributes_list,
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

        # Get attributes this measure depends on
        depends_on_attributes = []
        for attr_id in measure.input_attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                depends_on_attributes.append(attr.model_dump())

        # Get other measures this measure depends on
        depends_on_measures = []
        for dep_measure_id in measure.input_measure_ids:
            dep_measure = self.measures.get_by_id(dep_measure_id)
            if dep_measure:
                depends_on_measures.append(dep_measure.model_dump())

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

        # Get attributes produced by this step
        produced_attributes = []
        for attr_id in step.produces_attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                produced_attributes.append(attr.model_dump())

        # Get attributes consumed by this step
        consumed_attributes = []
        for attr_id in step.consumes_attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                consumed_attributes.append(attr.model_dump())

        # Get attributes crystallized by this step
        crystallized_attributes = []
        for attr_id in step.crystallizes_attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                crystallized_attributes.append(attr.model_dump())

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

        # Get systems used by this step
        systems_used = []
        for system_id in getattr(step, 'systems_used_ids', []):
            system = self.systems.get_by_id(system_id)
            if system:
                systems_used.append(system.model_dump())

        # Build waste analysis
        waste_analysis = None
        if hasattr(step, 'estimated_duration_minutes') and step.estimated_duration_minutes:
            waste_analysis = {
                "task_duration_minutes": step.estimated_duration_minutes,
                "automation_potential": getattr(step, 'automation_potential', None),
                "waste_category": getattr(step, 'waste_category', None),
                "manual_effort_percentage": getattr(step, 'manual_effort_percentage', None),
                "is_wasteful": getattr(step, 'automation_potential', None) in ['High', 'Medium'],
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

        # Get all attributes referenced by these measures
        attribute_ids = set()
        for measure in measures:
            attribute_ids.update(measure.input_attribute_ids)

        attributes_list = []
        for attr_id in attribute_ids:
            attr = self.attributes.get_by_id(attr_id)
            if attr:
                attributes_list.append(attr)

        # Get entities from attributes
        entity_ids = {attr.entity_id for attr in attributes_list}
        entities = []
        for ent_id in entity_ids:
            entity = self.entities.get_by_id(ent_id)
            if entity:
                entities.append(entity)

        # Get process steps for this perspective
        process_steps = []
        for process in self.processes.get_all():
            for step in process.steps:
                if step.perspective_id == perspective_id:
                    step_dict = step.model_dump() if hasattr(step, 'model_dump') else step
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

        # Get systems from attributes
        system_ids = {attr.system_id for attr in attributes_list}
        systems = []
        for sys_id in system_ids:
            system = self.systems.get_by_id(sys_id)
            if system:
                systems.append(system)

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
            steps_to_show = [s for s in process.steps if getattr(s, 'parent_step_id', None) == parent_step_id]
        # Otherwise, if perspective_level is specified, filter by level and show only top-level steps
        elif perspective_level:
            steps_to_show = [
                s for s in process.steps
                if getattr(s, 'perspective_level', 'financial') == perspective_level
                and not getattr(s, 'parent_step_id', None)
            ]
        else:
            # Default: show only top-level steps (no parent)
            steps_to_show = [s for s in process.steps if not getattr(s, 'parent_step_id', None)]

        for step in steps_to_show:
            nodes.append({
                "id": step.id,
                "label": step.name,
                "sequence": step.sequence,
                "perspective_id": step.perspective_id,
                "actor": getattr(step, "actor", None),
                "has_sub_steps": getattr(step, "has_sub_steps", False),
                "perspective_level": getattr(step, "perspective_level", "financial"),
                "estimated_duration_minutes": getattr(step, "estimated_duration_minutes", None),
                "automation_potential": getattr(step, "automation_potential", None),
                "waste_category": getattr(step, "waste_category", None),
                "manual_effort_percentage": getattr(step, "manual_effort_percentage", None),
                "systems_used_ids": getattr(step, "systems_used_ids", []),
                "consumes_attribute_ids": getattr(step, "consumes_attribute_ids", []),
                "produces_attribute_ids": getattr(step, "produces_attribute_ids", []),
                "uses_metric_ids": getattr(step, "uses_metric_ids", []),
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

        crystallization_map = []

        for step in process.steps:
            crystallizes = step.crystallizes_attribute_ids
            if crystallizes:
                crystallized_attrs = []
                for attr_id in crystallizes:
                    attr = self.attributes.get_by_id(attr_id)
                    if attr:
                        crystallized_attrs.append(attr)
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
