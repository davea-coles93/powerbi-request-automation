"""Ontology CRUD router.

Simple entity types use the generic CRUD factory. Process, Mapping, and
Relationship endpoints are defined manually because they have custom logic
(step management, filtered queries, FK validation, etc.).
"""

import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    AttributeRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
    SemanticMappingRepository,
    EntityRelationshipRepository,
)
from ..models import (
    Perspective,
    System,
    Entity,
    Attribute,
    Measure,
    Metric,
    Process,
    ProcessStep,
    SemanticMapping,
    EntityRelationship,
)
from ..utils import generate_id
from .crud_factory import make_crud_router


# ──────────────────────────────────────────────────────────────
# Request models for Process-specific endpoints
# ──────────────────────────────────────────────────────────────

class ProcessCreate(BaseModel):
    """Request model for creating a process (id is auto-generated if omitted)."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    steps: list = Field(default_factory=list)


class StepReorderRequest(BaseModel):
    step_id: str
    new_sequence: int


class StepPartialUpdate(BaseModel):
    """Allowed fields for bulk step updates — prevents mass assignment."""
    name: Optional[str] = None
    description: Optional[str] = None
    perspective_id: Optional[str] = None
    actor: Optional[str] = None
    manual_effort_percentage: Optional[int] = None
    waste_category: Optional[str] = None
    automation_potential: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    produces_measure_ids: Optional[list[str]] = None
    produces_metric_ids: Optional[list[str]] = None
    crystallizes_attribute_ids: Optional[list[str]] = None
    consumes_attribute_ids: Optional[list[str]] = None
    produces_attribute_ids: Optional[list[str]] = None

class BulkStepUpdateRequest(BaseModel):
    step_ids: list[str]
    updates: StepPartialUpdate


class BulkStepDeleteRequest(BaseModel):
    step_ids: list[str]


# ──────────────────────────────────────────────────────────────
# Factory-generated CRUD routers for simple entity types
# ──────────────────────────────────────────────────────────────

def _validate_attribute_fks(data: Attribute, db: Session) -> None:
    """Validate that entity_id and system_id reference existing records."""
    if data.entity_id and not EntityRepository(db).get_by_id(data.entity_id):
        raise HTTPException(status_code=422, detail=f"Entity '{data.entity_id}' does not exist")
    if data.system_id and not SystemRepository(db).get_by_id(data.system_id):
        raise HTTPException(status_code=422, detail=f"System '{data.system_id}' does not exist")


def _validate_measure_fks(data: Measure, db: Session) -> None:
    """Validate that input_attribute_ids and input_measure_ids reference existing records."""
    if data.input_attribute_ids:
        existing = AttributeRepository(db).get_by_ids(data.input_attribute_ids)
        existing_ids = {a.id for a in existing}
        missing = [aid for aid in data.input_attribute_ids if aid not in existing_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Attributes not found: {missing}")
    if data.input_measure_ids:
        existing = MeasureRepository(db).get_by_ids(data.input_measure_ids)
        existing_ids = {m.id for m in existing}
        missing = [mid for mid in data.input_measure_ids if mid not in existing_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Measures not found: {missing}")


def _validate_metric_fks(data: Metric, db: Session) -> None:
    """Validate that calculated_by_measure_ids reference existing records."""
    if data.calculated_by_measure_ids:
        existing = MeasureRepository(db).get_by_ids(data.calculated_by_measure_ids)
        existing_ids = {m.id for m in existing}
        missing = [mid for mid in data.calculated_by_measure_ids if mid not in existing_ids]
        if missing:
            raise HTTPException(status_code=422, detail=f"Measures not found: {missing}")


perspectives_router = make_crud_router("/api/perspectives", "Perspective", PerspectiveRepository, Perspective)
systems_router = make_crud_router("/api/systems", "System", SystemRepository, System)
entities_router = make_crud_router("/api/entities", "Entity", EntityRepository, Entity)
attributes_router = make_crud_router(
    "/api/attributes", "Attribute", AttributeRepository, Attribute,
    pre_create=_validate_attribute_fks, pre_update=_validate_attribute_fks,
)
measures_router = make_crud_router(
    "/api/measures", "Measure", MeasureRepository, Measure,
    pre_create=_validate_measure_fks, pre_update=_validate_measure_fks,
)
metrics_router = make_crud_router(
    "/api/metrics", "Metric", MetricRepository, Metric,
    pre_create=_validate_metric_fks, pre_update=_validate_metric_fks,
)

# Override the default list endpoints for types with custom query filters.
# We add the filtered version and keep get/create/update/delete from the factory.

@attributes_router.get("", response_model=list[Attribute], name="list_attributes_filtered")
def list_attributes(
    entity_id: Optional[str] = None,
    system_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = AttributeRepository(db)
    if entity_id:
        return repo.get_by_entity(entity_id)
    if system_id:
        return repo.get_by_system(system_id)
    return repo.get_all()


@measures_router.get("", response_model=list[Measure], name="list_measures_filtered")
def list_measures(
    perspective_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = MeasureRepository(db)
    if perspective_id:
        return repo.get_by_perspective(perspective_id)
    return repo.get_all()


@metrics_router.get("", response_model=list[Metric], name="list_metrics_filtered")
def list_metrics(
    perspective_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = MetricRepository(db)
    if perspective_id:
        return repo.get_by_perspective(perspective_id)
    return repo.get_all()


# ──────────────────────────────────────────────────────────────
# Processes (custom — step management, duplication, reordering)
# ──────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api", tags=["ontology"])


@router.get("/processes", response_model=list[Process])
def get_processes(db: Session = Depends(get_db)):
    return ProcessRepository(db).get_all()


@router.get("/processes/{id}", response_model=Process)
def get_process(id: str, db: Session = Depends(get_db)):
    result = ProcessRepository(db).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.post("/processes", response_model=Process)
def create_process(data: ProcessCreate, db: Session = Depends(get_db)):
    """Create a new process with steps. ID is auto-generated if omitted."""
    process_id = data.id or generate_id(data.name)
    repo = ProcessRepository(db)
    if repo.get_by_id(process_id):
        raise HTTPException(status_code=409, detail=f"Process with id '{process_id}' already exists")
    return repo.create(Process(id=process_id, name=data.name, description=data.description, steps=data.steps))


@router.post("/processes/{id}/duplicate", response_model=Process)
def duplicate_process(id: str, db: Session = Depends(get_db)):
    """Deep-copy a process with all steps, remapping internal step IDs."""
    repo = ProcessRepository(db)
    source = repo.get_by_id(id)
    if not source:
        raise HTTPException(status_code=404, detail="Process not found")

    suffix = str(int(time.time()))
    id_map = {step.id: f"{step.id}_copy_{suffix}" for step in source.steps}

    new_steps = [
        step.model_copy(update={
            "id": id_map[step.id],
            "depends_on_step_ids": [id_map.get(d, d) for d in step.depends_on_step_ids],
            "parent_step_id": id_map.get(step.parent_step_id) if step.parent_step_id else None,
        })
        for step in source.steps
    ]

    new_id = generate_id(f"{source.name} Copy")
    counter = 1
    base_id = new_id
    while repo.get_by_id(new_id):
        counter += 1
        if counter > 50:
            raise HTTPException(status_code=409, detail="Too many copies of this process exist")
        new_id = f"{base_id}_{counter}"

    return repo.create(Process(id=new_id, name=f"{source.name} (Copy)", description=source.description, steps=new_steps))


@router.put("/processes/{id}", response_model=Process)
def update_process(id: str, data: Process, db: Session = Depends(get_db)):
    """Update an existing process and all its steps."""
    result = ProcessRepository(db).update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.delete("/processes/{id}")
def delete_process(id: str, db: Session = Depends(get_db)):
    """Delete a process and all its steps."""
    if not ProcessRepository(db).delete(id):
        raise HTTPException(status_code=404, detail="Process not found")
    return {"message": f"Process {id} deleted successfully"}


@router.put("/processes/{process_id}/steps/{step_id}", response_model=Process)
def update_process_step(
    process_id: str,
    step_id: str,
    step_data: ProcessStep,
    db: Session = Depends(get_db),
):
    """Update a specific step within a process."""
    result = ProcessRepository(db).update_step(process_id, step_id, step_data.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail=f"Process {process_id} or step {step_id} not found")
    return result


@router.post("/processes/{process_id}/steps", response_model=Process)
def create_process_step(
    process_id: str,
    step_data: ProcessStep,
    db: Session = Depends(get_db),
):
    """Add a new step to an existing process."""
    result = ProcessRepository(db).create_step(process_id, step_data.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail=f"Process {process_id} not found")
    return result


@router.put("/processes/{process_id}/reorder", response_model=Process)
def reorder_process_step(
    process_id: str,
    body: StepReorderRequest,
    db: Session = Depends(get_db),
):
    """Reorder a step within a process by setting its new sequence number."""
    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    target_step = None
    other_steps = []
    for step in process.steps:
        if step.id == body.step_id:
            target_step = step
        else:
            other_steps.append(step)

    if not target_step:
        raise HTTPException(status_code=404, detail="Step not found")

    other_steps.sort(key=lambda s: s.sequence)
    pos = max(1, min(body.new_sequence, len(process.steps)))
    other_steps.insert(pos - 1, target_step)

    for i, step in enumerate(other_steps):
        step.sequence = i + 1

    process.steps = other_steps
    return repo.update(process_id, process)


@router.put("/processes/{process_id}/steps/bulk-update", response_model=Process)
def bulk_update_steps(
    process_id: str,
    body: BulkStepUpdateRequest,
    db: Session = Depends(get_db),
):
    """Bulk-update properties on multiple steps."""
    if not body.step_ids or not body.updates:
        raise HTTPException(status_code=400, detail="step_ids and updates are required")

    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    ids_set = set(body.step_ids)
    update_fields = body.updates.model_dump(exclude_unset=True)
    for step in process.steps:
        if step.id in ids_set:
            for key, value in update_fields.items():
                setattr(step, key, value)

    return repo.update(process_id, process)


@router.delete("/processes/{process_id}/steps/bulk-delete", response_model=Process)
def bulk_delete_steps(
    process_id: str,
    body: BulkStepDeleteRequest,
    db: Session = Depends(get_db),
):
    """Delete multiple steps at once."""
    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    ids_set = set(body.step_ids)
    process.steps = [s for s in process.steps if s.id not in ids_set]
    for step in process.steps:
        step.depends_on_step_ids = [sid for sid in step.depends_on_step_ids if sid not in ids_set]

    return repo.update(process_id, process)


@router.delete("/processes/{process_id}/steps/{step_id}", response_model=Process)
def delete_process_step(process_id: str, step_id: str, db: Session = Depends(get_db)):
    """Delete a specific step from a process."""
    result = ProcessRepository(db).delete_step(process_id, step_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Process {process_id} or step {step_id} not found")
    return result


# ──────────────────────────────────────────────────────────────
# Semantic Mappings (custom — filtered queries)
# ──────────────────────────────────────────────────────────────

@router.get("/mappings", response_model=list[SemanticMapping])
def get_mappings(
    ontology_id: Optional[str] = None,
    gaps_only: bool = False,
    db: Session = Depends(get_db),
):
    repo = SemanticMappingRepository(db)
    if gaps_only:
        return repo.get_gaps()
    if ontology_id:
        return repo.get_by_ontology_id(ontology_id)
    return repo.get_all()


@router.post("/mappings", response_model=SemanticMapping)
def create_mapping(data: SemanticMapping, db: Session = Depends(get_db)):
    return SemanticMappingRepository(db).create(data)


# ──────────────────────────────────────────────────────────────
# Entity Relationships (custom — bidirectional entity filter)
# ──────────────────────────────────────────────────────────────

@router.get("/relationships", response_model=list[EntityRelationship])
def get_relationships(
    entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = EntityRelationshipRepository(db)
    if entity_id:
        return repo.get_by_entity(entity_id)
    return repo.get_all()


@router.get("/relationships/{id}", response_model=EntityRelationship)
def get_relationship(id: str, db: Session = Depends(get_db)):
    result = EntityRelationshipRepository(db).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return result
