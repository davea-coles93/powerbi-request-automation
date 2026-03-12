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

    def _perspectives_section(self, detail: str = "summary") -> str | None:
        if not self.perspectives:
            return None
        if detail == "full":
            lines = [f"  - {p.id}: {p.name} — {p.primary_concern}" for p in self.perspectives]
        else:
            lines = [f"  - {p.id}: {p.name}" for p in self.perspectives]
        header = "AVAILABLE PERSPECTIVES" if detail == "process" else "PERSPECTIVES"
        return f"{header}:\n" + "\n".join(lines)

    def _systems_section(self, detail: str = "summary") -> str | None:
        if not self.systems:
            return None
        if detail == "full":
            lines = [f"  - {s.id}: {s.name} (type: {s.type}, vendor: {s.vendor or 'none'})" for s in self.systems]
        elif detail == "process":
            lines = [f"  - {s.id}: {s.name} ({s.type})" for s in self.systems]
            return "EXISTING SYSTEMS (use these IDs in systems_used_ids):\n" + "\n".join(lines)
        else:
            lines = [f"  - {s.id}: {s.name} ({s.type}, {s.vendor or 'no vendor'})" for s in self.systems]
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
                    step_lines.append(
                        f"    {s.sequence}. {s.name} ({s.perspective_id}, actor: {s.actor or '?'}){flag_str}"
                    )
                sections.append(f"PROCESS: {p.id} — {p.name}\n" + "\n".join(step_lines))
            return "\n\n".join(sections)
        else:
            lines = [f"  - {p.id}: {p.name} ({len(p.steps)} steps)" for p in self.processes]
            return "EXISTING PROCESSES:\n" + "\n".join(lines)

    def summary(self) -> str:
        """Build context for the workshop AI assistant (moderate detail, includes lenses)."""
        sections = [
            s for s in [
                self._perspectives_section("summary"),
                self._systems_section("summary"),
                self._entities_section("summary"),
                self._attributes_section("summary"),
                self._measures_section("summary"),
                self._metrics_section("summary"),
            ] if s
        ]
        if not sections:
            return "The ontology is currently EMPTY. You are starting from scratch."
        return "## Current Ontology State\n\n" + "\n\n".join(sections)

    def with_processes(self) -> str:
        """Build context for the process AI builder (includes processes and attribute limit)."""
        sections = [
            s for s in [
                self._perspectives_section("process"),
                self._systems_section("process"),
                self._entities_section("process"),
                self._attributes_section("process", limit=30),
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
            ] if s
        ]
        if len(sections) == 1:  # only counts
            return "The ontology is EMPTY. There is nothing to analyze."
        return "## Full Ontology State for Analysis\n\n" + "\n\n".join(sections)
