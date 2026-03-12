from sqlalchemy.orm import Session
from typing import TypeVar, Generic, Type, Optional
from .database import (
    PerspectiveDB,
    SystemDB,
    EntityDB,
    AttributeDB,
    MeasureDB,
    MetricDB,
    ProcessDB,
    SemanticMappingDB,
    SemanticTableDB,
    EntityRelationshipDB,
    WorkshopSessionDB,
)
from ..models import (
    Perspective,
    System,
    Entity,
    Attribute,
    Measure,
    Metric,
    Process,
    SemanticMapping,
    EntityRelationship,
)
from ..models.workshop import WorkshopSession
from ..models.semantic_model import Table

T = TypeVar("T")
DBModel = TypeVar("DBModel")


class BaseRepository(Generic[T, DBModel]):
    """Base repository with common CRUD operations."""

    def __init__(self, db: Session, model_class: Type[DBModel], pydantic_class: Type[T]):
        self.db = db
        self.model_class = model_class
        self.pydantic_class = pydantic_class

    def get_all(self) -> list[T]:
        items = self.db.query(self.model_class).all()
        return [self._to_pydantic(item) for item in items]

    def get_by_id(self, id: str) -> Optional[T]:
        item = self.db.query(self.model_class).filter(self.model_class.id == id).first()
        return self._to_pydantic(item) if item else None

    def create(self, data: T) -> T:
        db_item = self.model_class(**data.model_dump())
        self.db.add(db_item)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(db_item)
        return self._to_pydantic(db_item)

    def update(self, id: str, data: T) -> Optional[T]:
        db_item = self.db.query(self.model_class).filter(self.model_class.id == id).first()
        if not db_item:
            return None
        for key, value in data.model_dump().items():
            setattr(db_item, key, value)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(db_item)
        return self._to_pydantic(db_item)

    def delete(self, id: str) -> bool:
        db_item = self.db.query(self.model_class).filter(self.model_class.id == id).first()
        if not db_item:
            return False
        self.db.delete(db_item)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return True

    def exists(self, id: str) -> bool:
        """Check if an item with the given ID exists."""
        from sqlalchemy import select, func
        count = self.db.execute(
            select(func.count()).where(self.model_class.id == id)
        ).scalar()
        return count > 0

    def upsert(self, data: T, strategy: str = "skip") -> tuple[T, str]:
        """Insert or update based on whether the ID already exists.

        Args:
            data: The Pydantic model to insert/update.
            strategy: "skip" (keep existing) or "update" (overwrite existing).

        Returns:
            Tuple of (result model, action: "created" | "skipped" | "updated").
        """
        existing = self.db.query(self.model_class).filter(
            self.model_class.id == data.id
        ).first()

        if existing is None:
            db_item = self.model_class(**data.model_dump())
            self.db.add(db_item)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(db_item)
            return self._to_pydantic(db_item), "created"

        if strategy == "update":
            for key, value in data.model_dump().items():
                setattr(existing, key, value)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(existing)
            return self._to_pydantic(existing), "updated"

        # Default: skip
        return self._to_pydantic(existing), "skipped"

    def get_by_ids(self, ids: list[str]) -> list[T]:
        """Fetch multiple items by their IDs in a single query."""
        if not ids:
            return []
        items = self.db.query(self.model_class).filter(
            self.model_class.id.in_(ids)
        ).all()
        return [self._to_pydantic(item) for item in items]

    def _to_pydantic(self, db_item: DBModel) -> T:
        return self.pydantic_class.model_validate(
            {c.name: getattr(db_item, c.name) for c in db_item.__table__.columns}
        )


class PerspectiveRepository(BaseRepository[Perspective, PerspectiveDB]):
    def __init__(self, db: Session):
        super().__init__(db, PerspectiveDB, Perspective)


class SystemRepository(BaseRepository[System, SystemDB]):
    def __init__(self, db: Session):
        super().__init__(db, SystemDB, System)


class EntityRepository(BaseRepository[Entity, EntityDB]):
    def __init__(self, db: Session):
        super().__init__(db, EntityDB, Entity)


class AttributeRepository(BaseRepository[Attribute, AttributeDB]):
    def __init__(self, db: Session):
        super().__init__(db, AttributeDB, Attribute)

    def get_by_entity(self, entity_id: str) -> list[Attribute]:
        items = self.db.query(self.model_class).filter(
            self.model_class.entity_id == entity_id
        ).all()
        return [self._to_pydantic(item) for item in items]

    def get_by_system(self, system_id: str) -> list[Attribute]:
        items = self.db.query(self.model_class).filter(
            self.model_class.system_id == system_id
        ).all()
        return [self._to_pydantic(item) for item in items]


class MeasureRepository(BaseRepository[Measure, MeasureDB]):
    def __init__(self, db: Session):
        super().__init__(db, MeasureDB, Measure)

    def get_by_perspective(self, perspective_id: str) -> list[Measure]:
        # perspective_ids is stored as JSON array string; filter in Python
        # to avoid fragile LIKE patterns that can match partial IDs
        all_items = self.db.query(self.model_class).all()
        results = []
        for item in all_items:
            pydantic_item = self._to_pydantic(item)
            if pydantic_item.perspective_ids and perspective_id in pydantic_item.perspective_ids:
                results.append(pydantic_item)
        return results


class MetricRepository(BaseRepository[Metric, MetricDB]):
    def __init__(self, db: Session):
        super().__init__(db, MetricDB, Metric)

    def get_by_perspective(self, perspective_id: str) -> list[Metric]:
        # perspective_ids is stored as JSON array string; filter in Python
        # to avoid fragile LIKE patterns that can match partial IDs
        all_items = self.db.query(self.model_class).all()
        results = []
        for item in all_items:
            pydantic_item = self._to_pydantic(item)
            if pydantic_item.perspective_ids and perspective_id in pydantic_item.perspective_ids:
                results.append(pydantic_item)
        return results


class ProcessRepository(BaseRepository[Process, ProcessDB]):
    def __init__(self, db: Session):
        super().__init__(db, ProcessDB, Process)

    def update_step(self, process_id: str, step_id: str, step_data: dict) -> Optional[Process]:
        """Update a specific step within a process."""
        # Get the process
        process = self.get_by_id(process_id)
        if not process:
            return None

        # Find and update the step
        step_found = False
        updated_steps = []
        for step in process.steps:
            if step.id == step_id:
                # Update the step with new data
                updated_step = step.model_copy(update=step_data)
                updated_steps.append(updated_step)
                step_found = True
            else:
                updated_steps.append(step)

        if not step_found:
            return None

        # Update the process with modified steps
        process.steps = updated_steps
        return self.update(process_id, process)

    def create_step(self, process_id: str, step_data: dict) -> Optional[Process]:
        """Add a new step to a process."""
        from ..models import ProcessStep

        # Get the process
        process = self.get_by_id(process_id)
        if not process:
            return None

        # Create new step
        new_step = ProcessStep(**step_data)

        # Add to process steps
        process.steps.append(new_step)

        # Update the process
        return self.update(process_id, process)

    def delete_step(self, process_id: str, step_id: str) -> Optional[Process]:
        """Remove a step from a process."""
        process = self.get_by_id(process_id)
        if not process:
            return None

        original_count = len(process.steps)
        process.steps = [s for s in process.steps if s.id != step_id]

        if len(process.steps) == original_count:
            return None  # step not found

        # Also remove references to this step from depends_on_step_ids
        for step in process.steps:
            if step_id in step.depends_on_step_ids:
                step.depends_on_step_ids = [
                    sid for sid in step.depends_on_step_ids if sid != step_id
                ]

        return self.update(process_id, process)


class SemanticMappingRepository(BaseRepository[SemanticMapping, SemanticMappingDB]):
    def __init__(self, db: Session):
        super().__init__(db, SemanticMappingDB, SemanticMapping)

    def get_by_ontology_id(self, ontology_id: str) -> list[SemanticMapping]:
        items = self.db.query(self.model_class).filter(
            self.model_class.ontology_id == ontology_id
        ).all()
        return [self._to_pydantic(item) for item in items]

    def get_gaps(self) -> list[SemanticMapping]:
        items = self.db.query(self.model_class).filter(
            self.model_class.status == "gap"
        ).all()
        return [self._to_pydantic(item) for item in items]


class SemanticTableRepository(BaseRepository[Table, SemanticTableDB]):
    def __init__(self, db: Session):
        super().__init__(db, SemanticTableDB, Table)

    def get_by_entity(self, entity_id: str) -> list[Table]:
        """Get tables mapped to a specific entity."""
        items = self.db.query(self.model_class).filter(
            self.model_class.mapped_entity_id == entity_id
        ).all()
        return [self._to_pydantic(item) for item in items]

    def get_by_source_system(self, system_id: str) -> list[Table]:
        """Get tables from a specific source system."""
        items = self.db.query(self.model_class).filter(
            self.model_class.source_system_id == system_id
        ).all()
        return [self._to_pydantic(item) for item in items]


class EntityRelationshipRepository(BaseRepository[EntityRelationship, EntityRelationshipDB]):
    def __init__(self, db: Session):
        super().__init__(db, EntityRelationshipDB, EntityRelationship)

    def _to_pydantic(self, db_item: EntityRelationshipDB) -> EntityRelationship:
        """Override to handle SQLite int -> bool conversion for is_active."""
        data = {c.name: getattr(db_item, c.name) for c in db_item.__table__.columns}
        data["is_active"] = bool(data.get("is_active", 1))
        return EntityRelationship.model_validate(data)

    def get_by_entity(self, entity_id: str) -> list[EntityRelationship]:
        """Get all relationships involving an entity (as source or target)."""
        items = self.db.query(self.model_class).filter(
            (self.model_class.from_entity_id == entity_id) |
            (self.model_class.to_entity_id == entity_id)
        ).all()
        return [self._to_pydantic(item) for item in items]


class WorkshopSessionRepository(BaseRepository[WorkshopSession, WorkshopSessionDB]):
    def __init__(self, db: Session):
        super().__init__(db, WorkshopSessionDB, WorkshopSession)

    def get_by_type(self, session_type: str) -> list[WorkshopSession]:
        """Get sessions by type (top_down, bottom_up, gap_analysis)."""
        items = self.db.query(self.model_class).filter(
            self.model_class.session_type == session_type
        ).all()
        return [self._to_pydantic(item) for item in items]
