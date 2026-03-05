"""Service for materializing workshop captures into real ontology elements."""
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from ..db.repositories import (
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
)
from ..models import Attribute, Measure, Metric
from ..models.workshop import WorkshopSession


class WorkshopService:
    """Creates real ontology elements from workshop captures."""

    def __init__(self, db: Session):
        self.db = db
        self.attributes = AttributeRepository(db)
        self.measures = MeasureRepository(db)
        self.metrics = MetricRepository(db)

    def materialize(
        self,
        session: WorkshopSession,
        element_type: str,
        source_element_id: str,
        overrides: dict,
    ) -> Optional[dict]:
        """Create an ontology element from a workshop capture.

        Supports materializing metrics, measures, and attributes from
        top-down session data.
        """
        if element_type == "metric":
            return self._materialize_metric(session, source_element_id, overrides)
        elif element_type == "measure":
            return self._materialize_measure(session, source_element_id, overrides)
        elif element_type == "attribute":
            return self._materialize_attribute(session, source_element_id, overrides)
        return None

    def _materialize_metric(
        self, session: WorkshopSession, source_id: str, overrides: dict
    ) -> Optional[dict]:
        """Create a Metric from a top-down metric capture."""
        if not session.top_down_data:
            return None

        capture = next(
            (m for m in session.top_down_data.metrics if m.id == source_id), None
        )
        if not capture:
            return None

        # If already linked to an existing metric, skip
        if capture.existing_metric_id:
            return {"id": capture.existing_metric_id, "already_exists": True}

        metric_id = overrides.get(
            "id", capture.metric_name.lower().strip().replace(" ", "_")
        )
        metric = Metric(
            id=metric_id,
            name=overrides.get("name", capture.metric_name),
            description=overrides.get("description", capture.business_question),
            business_question=capture.business_question,
            calculated_by_measure_ids=overrides.get("calculated_by_measure_ids", []),
            perspective_ids=overrides.get("perspective_ids", capture.perspective_ids),
        )

        existing = self.metrics.get_by_id(metric_id)
        if existing:
            return {"id": metric_id, "already_exists": True}

        created = self.metrics.create(metric)
        return {"id": created.id, "created": True, "type": "metric"}

    def _materialize_measure(
        self, session: WorkshopSession, source_id: str, overrides: dict
    ) -> Optional[dict]:
        """Create a Measure from a top-down measure requirement."""
        if not session.top_down_data:
            return None

        # Search across all metric captures for the measure
        requirement = None
        for mc in session.top_down_data.metrics:
            requirement = next(
                (m for m in mc.required_measures if m.id == source_id), None
            )
            if requirement:
                break

        if not requirement:
            return None

        if requirement.existing_measure_id:
            return {"id": requirement.existing_measure_id, "already_exists": True}

        measure_id = overrides.get(
            "id", requirement.name.lower().strip().replace(" ", "_")
        )
        measure = Measure(
            id=measure_id,
            name=overrides.get("name", requirement.name),
            description=overrides.get("description", ""),
            logic=overrides.get("logic", requirement.logic or ""),
            input_attribute_ids=overrides.get("input_attribute_ids", []),
            perspective_ids=overrides.get("perspective_ids", []),
        )

        existing = self.measures.get_by_id(measure_id)
        if existing:
            return {"id": measure_id, "already_exists": True}

        created = self.measures.create(measure)
        return {"id": created.id, "created": True, "type": "measure"}

    def _materialize_attribute(
        self, session: WorkshopSession, source_id: str, overrides: dict
    ) -> Optional[dict]:
        """Create an Attribute from a top-down attribute requirement."""
        if not session.top_down_data:
            return None

        # Search across all metric captures → measures for the attribute
        requirement = None
        for mc in session.top_down_data.metrics:
            for mr in mc.required_measures:
                requirement = next(
                    (a for a in mr.required_attributes if a.id == source_id), None
                )
                if requirement:
                    break
            if requirement:
                break

        if not requirement:
            return None

        if requirement.existing_attribute_id:
            return {"id": requirement.existing_attribute_id, "already_exists": True}

        attr_id = overrides.get(
            "id", requirement.name.lower().strip().replace(" ", "_")
        )
        attribute = Attribute(
            id=attr_id,
            name=overrides.get("name", requirement.name),
            description=overrides.get("description", ""),
            entity_id=overrides.get("entity_id", requirement.entity_hint or "unknown"),
            system_id=overrides.get("system_id", "unknown"),
        )

        existing = self.attributes.get_by_id(attr_id)
        if existing:
            return {"id": attr_id, "already_exists": True}

        created = self.attributes.create(attribute)
        return {"id": created.id, "created": True, "type": "attribute"}
