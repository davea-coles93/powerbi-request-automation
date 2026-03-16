"""Shared ontology context builder for AI services.

Loads ontology data once and provides different detail levels for different AI prompts.
"""

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


class OntologyContextBuilder:
    """Loads the ontology lazily and formats context at different detail levels."""

    def __init__(self, db: Session):
        self._db = db
        self._perspectives = None
        self._systems = None
        self._entities = None
        self._attributes = None
        self._measures = None
        self._metrics = None
        self._processes = None
        self._attr_to_measures: dict[str, list[str]] | None = None

    @property
    def perspectives(self):
        if self._perspectives is None:
            self._perspectives = PerspectiveRepository(self._db).get_all()
        return self._perspectives

    @property
    def systems(self):
        if self._systems is None:
            self._systems = SystemRepository(self._db).get_all()
        return self._systems

    @property
    def entities(self):
        if self._entities is None:
            self._entities = EntityRepository(self._db).get_all()
        return self._entities

    @property
    def attributes(self):
        if self._attributes is None:
            self._attributes = AttributeRepository(self._db).get_all()
        return self._attributes

    @property
    def measures(self):
        if self._measures is None:
            self._measures = MeasureRepository(self._db).get_all()
        return self._measures

    @property
    def metrics(self):
        if self._metrics is None:
            self._metrics = MetricRepository(self._db).get_all()
        return self._metrics

    @property
    def processes(self):
        if self._processes is None:
            self._processes = ProcessRepository(self._db).get_all()
        return self._processes

    def _get_attr_to_measures(self) -> dict[str, list[str]]:
        """Pre-compute reverse lookup: attribute_id → list of measure IDs that use it."""
        if self._attr_to_measures is None:
            self._attr_to_measures = {}
            for m in self.measures:
                for attr_id in (m.input_attribute_ids or []):
                    self._attr_to_measures.setdefault(attr_id, []).append(m.id)
        return self._attr_to_measures

    def _get_measure_to_steps(self) -> dict[str, list[str]]:
        """Reverse lookup: measure_id → list of step descriptions that produce it."""
        result: dict[str, list[str]] = {}
        for p in self.processes:
            for s in p.steps:
                for mid in (s.produces_measure_ids or []):
                    result.setdefault(mid, []).append(f"{p.name} → {s.name}")
        return result

    def _get_metric_to_steps(self) -> dict[str, list[str]]:
        """Reverse lookup: metric_id → list of step descriptions that produce it."""
        result: dict[str, list[str]] = {}
        for p in self.processes:
            for s in p.steps:
                for mid in (s.produces_metric_ids or []):
                    result.setdefault(mid, []).append(f"{p.name} → {s.name}")
        return result

    def _perspectives_section(self, detail: str = "summary") -> str | None:
        if not self.perspectives:
            return None
        if detail == "full":
            lines = [f"  - {p.id}: {p.name} — {p.primary_concern}" for p in self.perspectives]
        else:
            lines = [f"  - {p.id}: {p.name}" for p in self.perspectives]
        header = "AVAILABLE PERSPECTIVES" if detail == "process" else "PERSPECTIVES"
        return f"{header}:\n" + "\n".join(lines)

    def _get_system_connectivity(self) -> dict[str, dict]:
        """Compute system connectivity: which systems have attributes used by measures."""
        attr_measure_map = self._get_attr_to_measures()
        sys_info: dict[str, dict] = {}
        for s in self.systems:
            sys_info[s.id] = {"attr_count": 0, "connected_attrs": 0}
        for a in self.attributes:
            sid = a.system_id
            if sid not in sys_info:
                continue
            sys_info[sid]["attr_count"] += 1
            if a.id in attr_measure_map:
                sys_info[sid]["connected_attrs"] += 1
        return sys_info

    def _systems_section(self, detail: str = "summary") -> str | None:
        if not self.systems:
            return None
        if detail == "full":
            connectivity = self._get_system_connectivity()
            lines = []
            for s in self.systems:
                conn = connectivity.get(s.id, {"attr_count": 0, "connected_attrs": 0})
                orphan_flag = ""
                if conn["attr_count"] == 0:
                    orphan_flag = " | ORPHANED (no attributes)"
                elif conn["connected_attrs"] == 0:
                    orphan_flag = " | ORPHANED (attributes exist but none feed measures)"
                lines.append(
                    f"  - {s.id}: {s.name} (type: {s.type}, vendor: {s.vendor or 'none'}, "
                    f"{conn['connected_attrs']}/{conn['attr_count']} attrs connected to measures){orphan_flag}"
                )
        elif detail == "process":
            lines = [f"  - {s.id}: {s.name} ({s.type})" for s in self.systems]
            return "EXISTING SYSTEMS (use these IDs in systems_used_ids):\n" + "\n".join(lines)
        else:
            connectivity = self._get_system_connectivity()
            lines = []
            for s in self.systems:
                conn = connectivity.get(s.id, {"attr_count": 0, "connected_attrs": 0})
                orphan_note = ""
                if conn["attr_count"] > 0 and conn["connected_attrs"] == 0:
                    orphan_note = " — ORPHANED in lineage"
                elif conn["attr_count"] == 0:
                    orphan_note = " — no attributes"
                lines.append(
                    f"  - {s.id}: {s.name} ({s.type}, {s.vendor or 'no vendor'}, "
                    f"{conn['attr_count']} attrs){orphan_note}"
                )
        return "SYSTEMS:\n" + "\n".join(lines)

    def _entities_section(self, detail: str = "summary") -> str | None:
        if not self.entities:
            return None
        if detail == "summary" and any(e.lenses for e in self.entities):
            lines = []
            for e in self.entities:
                lens_summary = ""
                if e.lenses:
                    lens_parts = [f"{lens.perspective_id}: {lens.interpretation}" for lens in e.lenses]
                    lens_summary = f" | Lenses: {'; '.join(lens_parts)}"
                lines.append(f"  - {e.id}: {e.name}{lens_summary}")
        else:
            lines = [f"  - {e.id}: {e.name}" for e in self.entities]
        header = "EXISTING ENTITIES" if detail == "process" else "ENTITIES"
        return f"{header}:\n" + "\n".join(lines)

    def _attributes_section(self, detail: str = "summary", limit: int = 0) -> str | None:
        if not self.attributes:
            return None
        attrs = self.attributes[:limit] if limit else self.attributes

        if detail == "full":
            lines = []
            attr_measure_map = self._get_attr_to_measures()
            for a in attrs:
                used_by = attr_measure_map.get(a.id, [])
                used_str = f" | used by: {','.join(used_by)}" if used_by else " | UNUSED"
                lines.append(
                    f"  - {a.id}: {a.name} (entity: {a.entity_id}, system: {a.system_id}, "
                    f"perspectives: {','.join(a.perspective_ids or [])}){used_str}"
                )
        else:
            lines = [
                f"  - {a.id}: {a.name} (entity: {a.entity_id}, system: {a.system_id}, "
                f"perspectives: {','.join(a.perspective_ids or [])})"
                for a in attrs
            ]

        if limit and len(self.attributes) > limit:
            lines.append(f"  ... and {len(self.attributes) - limit} more")

        header = "EXISTING ATTRIBUTES (reference in consumes/produces)" if detail == "process" else "ATTRIBUTES"
        return f"{header}:\n" + "\n".join(lines)

    def _measures_section(self, detail: str = "summary") -> str | None:
        if not self.measures:
            return None
        if detail == "process":
            lines = [f"  - {m.id}: {m.name}" for m in self.measures]
            return "EXISTING MEASURES (use these IDs in produces_measure_ids):\n" + "\n".join(lines)
        lines = []
        for m in self.measures:
            inputs = []
            if m.input_attribute_ids:
                inputs.append(f"attrs: {','.join(m.input_attribute_ids)}")
            if m.input_measure_ids:
                inputs.append(f"measures: {','.join(m.input_measure_ids)}")
            input_str = f" | inputs: {'; '.join(inputs)}" if inputs else (" | NO INPUTS" if detail == "full" else "")

            used_str = ""
            if detail == "full":
                used_by_metrics = [mt.id for mt in self.metrics if m.id in (mt.calculated_by_measure_ids or [])]
                used_str = f" | used by metrics: {','.join(used_by_metrics)}" if used_by_metrics else " | NOT USED BY ANY METRIC"

            lines.append(f"  - {m.id}: {m.name} — {m.logic or m.description or 'no description'}{input_str}{used_str}")
        return "MEASURES:\n" + "\n".join(lines)

    def _metrics_section(self, detail: str = "summary") -> str | None:
        if not self.metrics:
            return None
        if detail == "process":
            lines = [f"  - {mt.id}: {mt.name} — Q: \"{mt.business_question}\"" for mt in self.metrics]
            return "EXISTING METRICS (use these IDs in produces_metric_ids):\n" + "\n".join(lines)
        lines = []
        for mt in self.metrics:
            measure_refs = mt.calculated_by_measure_ids or []
            status = ""
            if detail == "full":
                if not measure_refs:
                    status = " | NO MEASURES DEFINED"
                else:
                    missing = [mid for mid in measure_refs if not any(m.id == mid for m in self.measures)]
                    if missing:
                        status = f" | MISSING MEASURES: {','.join(missing)}"
            lines.append(
                f"  - {mt.id}: {mt.name} — Q: \"{mt.business_question}\" "
                f"(measures: {','.join(measure_refs)}){status}"
            )
        return "METRICS:\n" + "\n".join(lines)

    def _processes_section(self, detail: str = "summary") -> str | None:
        if not self.processes:
            return None
        if detail == "full":
            sections = []
            for p in self.processes:
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
                    # Show data linkages
                    linkages = []
                    if s.produces_attribute_ids:
                        linkages.append(f"produces attrs: {','.join(s.produces_attribute_ids)}")
                    if s.crystallizes_attribute_ids:
                        linkages.append(f"crystallises: {','.join(s.crystallizes_attribute_ids)}")
                    if s.produces_measure_ids:
                        linkages.append(f"produces measures: {','.join(s.produces_measure_ids)}")
                    if s.produces_metric_ids:
                        linkages.append(f"produces metrics: {','.join(s.produces_metric_ids)}")
                    linkage_str = f" | {'; '.join(linkages)}" if linkages else ""
                    step_lines.append(
                        f"    {s.sequence}. {s.name} ({s.perspective_id}, actor: {s.actor or '?'}){flag_str}{linkage_str}"
                    )
                sections.append(f"PROCESS: {p.id} — {p.name}\n" + "\n".join(step_lines))
            return "\n\n".join(sections)
        else:
            lines = [f"  - {p.id}: {p.name} ({len(p.steps)} steps)" for p in self.processes]
            return "EXISTING PROCESSES:\n" + "\n".join(lines)

    def _crystallisation_section(self) -> str | None:
        """Summarise crystallisation coverage: which attributes are crystallised by which process steps."""
        if not self.processes:
            return None
        crystallised: dict[str, list[str]] = {}  # attr_id -> [step descriptions]
        uncrystallised_used: list[str] = []  # attr names used by measures but never crystallised

        crystallised_ids: set[str] = set()
        for p in self.processes:
            for s in p.steps:
                for attr_id in (s.crystallizes_attribute_ids or []):
                    crystallised_ids.add(attr_id)
                    crystallised.setdefault(attr_id, []).append(
                        f"{p.name} → {s.name} ({s.perspective_id})"
                    )

        # Find attributes used by measures but never crystallised
        attr_measure_map = self._get_attr_to_measures()
        attr_names = {a.id: a.name for a in self.attributes}
        for attr_id in attr_measure_map:
            if attr_id not in crystallised_ids:
                uncrystallised_used.append(attr_names.get(attr_id, attr_id))

        # Find measures without producing steps
        measure_step_map = self._get_measure_to_steps()
        unproduced_measures = [m.name for m in self.measures if m.id not in measure_step_map]

        # Find metrics without producing steps
        metric_step_map = self._get_metric_to_steps()
        unproduced_metrics = [mt.name for mt in self.metrics if mt.id not in metric_step_map]

        if not crystallised and not uncrystallised_used and not unproduced_measures and not unproduced_metrics:
            return None

        lines = []
        if crystallised:
            lines.append(f"  Crystallised attributes ({len(crystallised)}):")
            for attr_id, steps in list(crystallised.items())[:15]:
                name = attr_names.get(attr_id, attr_id)
                lines.append(f"    - {name}: {'; '.join(steps)}")
        if uncrystallised_used:
            lines.append(f"  Attributes used by measures but NEVER crystallised ({len(uncrystallised_used)}):")
            for name in uncrystallised_used[:10]:
                lines.append(f"    - {name}")
            if len(uncrystallised_used) > 10:
                lines.append(f"    ... and {len(uncrystallised_used) - 10} more")
        if unproduced_measures:
            lines.append(f"  Measures without a producing step ({len(unproduced_measures)}):")
            for name in unproduced_measures[:10]:
                lines.append(f"    - {name}")
            if len(unproduced_measures) > 10:
                lines.append(f"    ... and {len(unproduced_measures) - 10} more")
        if unproduced_metrics:
            lines.append(f"  Metrics without a producing step ({len(unproduced_metrics)}):")
            for name in unproduced_metrics[:10]:
                lines.append(f"    - {name}")
            if len(unproduced_metrics) > 10:
                lines.append(f"    ... and {len(unproduced_metrics) - 10} more")

        return "DATA JOURNEY COVERAGE:\n" + "\n".join(lines)

    def summary(self) -> str:
        """Build context for the workshop AI assistant (moderate detail, includes lenses and processes)."""
        sections = [
            s for s in [
                self._perspectives_section("summary"),
                self._systems_section("summary"),
                self._entities_section("summary"),
                self._attributes_section("summary"),
                self._measures_section("summary"),
                self._metrics_section("summary"),
                self._processes_section("summary"),
                self._crystallisation_section(),
            ] if s
        ]
        if not sections:
            return "The ontology is currently EMPTY. You are starting from scratch."
        return "## Current Ontology State\n\n" + "\n\n".join(sections)

    def with_processes(self) -> str:
        """Build context for the process AI builder (includes processes, measures, metrics, and attribute limit)."""
        sections = [
            s for s in [
                self._perspectives_section("process"),
                self._systems_section("process"),
                self._entities_section("process"),
                self._attributes_section("process", limit=30),
                self._measures_section("process"),
                self._metrics_section("process"),
                self._processes_section("summary"),
            ] if s
        ]
        if not sections:
            return "The ontology is currently EMPTY. Use generic perspective IDs: operational, management, financial."
        return "## Current Ontology Context\n\n" + "\n\n".join(sections)

    def full_dump(self) -> str:
        """Build a comprehensive dump for gap analysis (maximum detail)."""
        counts = (
            f"COUNTS: {len(self.perspectives)} perspectives, {len(self.systems)} systems, "
            f"{len(self.entities)} entities, {len(self.attributes)} attributes, "
            f"{len(self.measures)} measures, {len(self.metrics)} metrics, {len(self.processes)} processes"
        )
        sections = [counts] + [
            s for s in [
                self._perspectives_section("full"),
                self._systems_section("full"),
                self._entities_section("full"),
                self._attributes_section("full"),
                self._measures_section("full"),
                self._metrics_section("full"),
                self._processes_section("full"),
                self._crystallisation_section(),
            ] if s
        ]
        if len(sections) == 1:  # only counts
            return "The ontology is EMPTY. There is nothing to analyze."
        return "## Full Ontology State for Analysis\n\n" + "\n\n".join(sections)
