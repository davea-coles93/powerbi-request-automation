from sqlalchemy.orm import Session
from typing import Optional

from ..db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    ObservationRepository,
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
        self.observations = ObservationRepository(db)
        self.measures = MeasureRepository(db)
        self.metrics = MetricRepository(db)
        self.processes = ProcessRepository(db)

    def trace_metric(self, metric_id: str) -> Optional[dict]:
        """
        Trace a metric back to its source observations and systems.

        Returns the full tree: Metric → Measures → Observations → Systems/Entities
        """
        metric = self.metrics.get_by_id(metric_id)
        if not metric:
            return None

        # Get measures that calculate this metric
        measures = []
        all_observation_ids = set()
        for measure_id in metric.calculated_by_measure_ids:
            measure = self.measures.get_by_id(measure_id)
            if measure:
                measures.append(measure.model_dump())
                all_observation_ids.update(measure.input_observation_ids)
                # Also check for chained measures
                for input_measure_id in measure.input_measure_ids:
                    input_measure = self.measures.get_by_id(input_measure_id)
                    if input_measure:
                        measures.append(input_measure.model_dump())
                        all_observation_ids.update(input_measure.input_observation_ids)

        # Get observations
        observations = []
        system_ids = set()
        entity_ids = set()
        for obs_id in all_observation_ids:
            obs = self.observations.get_by_id(obs_id)
            if obs:
                observations.append(obs.model_dump())
                system_ids.add(obs.system_id)
                entity_ids.add(obs.entity_id)

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
            "observations": observations,
            "systems": systems,
            "entities": entities,
        }

    def analyze_impact(self, observation_id: str) -> Optional[dict]:
        """
        Analyze what metrics would be affected if this observation changes.

        Reverse trace: Observation → Measures → Metrics
        """
        observation = self.observations.get_by_id(observation_id)
        if not observation:
            return None

        # Find measures that use this observation
        all_measures = self.measures.get_all()
        affected_measures = [
            m for m in all_measures if observation_id in m.input_observation_ids
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
            "observation": observation.model_dump(),
            "affected_measures": [m.model_dump() for m in affected_measures],
            "affected_metrics": [m.model_dump() for m in affected_metrics],
        }

    def get_measure_usage(self, measure_id: str) -> Optional[dict]:
        """
        Get usage information for a measure.

        Returns:
        - Which metrics use this measure
        - Which other measures use this measure
        - Which observations this measure depends on
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

        # Get observations this measure depends on
        depends_on_observations = []
        for obs_id in measure.input_observation_ids:
            obs = self.observations.get_by_id(obs_id)
            if obs:
                depends_on_observations.append(obs.model_dump())

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
            "depends_on_observations": depends_on_observations,
            "depends_on_measures": depends_on_measures,
        }

    def get_full_lineage(self, step_id: str) -> Optional[dict]:
        """
        Get complete lineage from a process step through to semantic model.

        Traces: ProcessStep → Observations → Measures → Metrics → Systems

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

        # Get observations produced by this step
        produced_observations = []
        for obs_id in step.produces_observation_ids:
            obs = self.observations.get_by_id(obs_id)
            if obs:
                produced_observations.append(obs.model_dump())

        # Get observations consumed by this step
        consumed_observations = []
        for obs_id in step.consumes_observation_ids:
            obs = self.observations.get_by_id(obs_id)
            if obs:
                consumed_observations.append(obs.model_dump())

        # Get observations crystallized by this step
        crystallized_observations = []
        for obs_id in step.crystallizes_observation_ids:
            obs = self.observations.get_by_id(obs_id)
            if obs:
                crystallized_observations.append(obs.model_dump())

        # Find measures that use the produced observations
        all_observation_ids = set(step.produces_observation_ids + step.crystallizes_observation_ids)
        all_measures = self.measures.get_all()
        affected_measures = []
        for measure in all_measures:
            if any(obs_id in all_observation_ids for obs_id in measure.input_observation_ids):
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
            "consumes_observations": consumed_observations,
            "produces_observations": produced_observations,
            "crystallizes_observations": crystallized_observations,
            "observations_feed_measures": affected_measures,
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

        # Get all observations referenced by these measures
        observation_ids = set()
        for measure in measures:
            observation_ids.update(measure.input_observation_ids)

        observations = [
            self.observations.get_by_id(obs_id)
            for obs_id in observation_ids
            if self.observations.get_by_id(obs_id)
        ]

        # Get entities from observations
        entity_ids = {obs.entity_id for obs in observations if obs}
        entities = [
            self.entities.get_by_id(ent_id)
            for ent_id in entity_ids
            if self.entities.get_by_id(ent_id)
        ]

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
            "observations": [o.model_dump() for o in observations if o],
            "entities": [e.model_dump() for e in entities if e],
            "process_steps": process_steps,
        }

    def get_entity_full(self, entity_id: str) -> Optional[dict]:
        """
        Get an entity with all its lenses and related observations.
        """
        entity = self.entities.get_by_id(entity_id)
        if not entity:
            return None

        # Get observations for this entity
        observations = self.observations.get_by_entity(entity_id)

        # Get systems from observations
        system_ids = {obs.system_id for obs in observations}
        systems = [
            self.systems.get_by_id(sys_id)
            for sys_id in system_ids
            if self.systems.get_by_id(sys_id)
        ]

        return {
            "entity": entity.model_dump(),
            "observations": [o.model_dump() for o in observations],
            "systems": [s.model_dump() for s in systems if s],
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
        Get which observations crystallize at which steps.
        """
        process = self.processes.get_by_id(process_id)
        if not process:
            return None

        crystallization_map = []

        for step in process.steps:
            crystallizes = step.crystallizes_observation_ids
            if crystallizes:
                observations = [
                    self.observations.get_by_id(obs_id)
                    for obs_id in crystallizes
                    if self.observations.get_by_id(obs_id)
                ]
                crystallization_map.append({
                    "step_id": step.id,
                    "step_name": step.name,
                    "step_sequence": step.sequence,
                    "crystallized_observations": [
                        o.model_dump() for o in observations if o
                    ],
                })

        return {
            "process_id": process.id,
            "process_name": process.name,
            "crystallization_points": crystallization_map,
        }
