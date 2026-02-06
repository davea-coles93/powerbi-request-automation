from sqlalchemy.orm import Session
from typing import TypeVar, Generic, Type, Optional
from .database import (
    PerspectiveDB,
    SystemDB,
    EntityDB,
    ObservationDB,
    MeasureDB,
    MetricDB,
    ProcessDB,
    SemanticMappingDB,
    SemanticTableDB,
)
from ..models import (
    Perspective,
    System,
    Entity,
    Observation,
    Measure,
    Metric,
    Process,
    SemanticMapping,
)
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
        self.db.commit()
        self.db.refresh(db_item)
        return self._to_pydantic(db_item)

    def update(self, id: str, data: T) -> Optional[T]:
        db_item = self.db.query(self.model_class).filter(self.model_class.id == id).first()
        if not db_item:
            return None
        for key, value in data.model_dump().items():
            setattr(db_item, key, value)
        self.db.commit()
        self.db.refresh(db_item)
        return self._to_pydantic(db_item)

    def delete(self, id: str) -> bool:
        db_item = self.db.query(self.model_class).filter(self.model_class.id == id).first()
        if not db_item:
            return False
        self.db.delete(db_item)
        self.db.commit()
        return True

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


class ObservationRepository(BaseRepository[Observation, ObservationDB]):
    def __init__(self, db: Session):
        super().__init__(db, ObservationDB, Observation)

    def get_by_entity(self, entity_id: str) -> list[Observation]:
        items = self.db.query(self.model_class).filter(
            self.model_class.entity_id == entity_id
        ).all()
        return [self._to_pydantic(item) for item in items]

    def get_by_system(self, system_id: str) -> list[Observation]:
        items = self.db.query(self.model_class).filter(
            self.model_class.system_id == system_id
        ).all()
        return [self._to_pydantic(item) for item in items]


class MeasureRepository(BaseRepository[Measure, MeasureDB]):
    def __init__(self, db: Session):
        super().__init__(db, MeasureDB, Measure)

    def get_by_perspective(self, perspective_id: str) -> list[Measure]:
        # SQLite JSON contains query
        items = self.db.query(self.model_class).all()
        return [
            self._to_pydantic(item)
            for item in items
            if perspective_id in (item.perspective_ids or [])
        ]


class MetricRepository(BaseRepository[Metric, MetricDB]):
    def __init__(self, db: Session):
        super().__init__(db, MetricDB, Metric)

    def get_by_perspective(self, perspective_id: str) -> list[Metric]:
        items = self.db.query(self.model_class).all()
        return [
            self._to_pydantic(item)
            for item in items
            if perspective_id in (item.perspective_ids or [])
        ]


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
