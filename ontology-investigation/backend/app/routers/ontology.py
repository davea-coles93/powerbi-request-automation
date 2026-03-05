from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

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
)

router = APIRouter(prefix="/api", tags=["ontology"])


def _generate_id(name: str) -> str:
    """Generate a slug-style ID from a name."""
    return name.lower().strip().replace(" ", "_").replace("-", "_")


class ProcessCreate(BaseModel):
    """Request model for creating a process (id is auto-generated if omitted)."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    steps: list = Field(default_factory=list)


# ============ Perspectives ============
@router.get("/perspectives", response_model=list[Perspective])
def get_perspectives(db: Session = Depends(get_db)):
    repo = PerspectiveRepository(db)
    return repo.get_all()


@router.get("/perspectives/{id}", response_model=Perspective)
def get_perspective(id: str, db: Session = Depends(get_db)):
    repo = PerspectiveRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Perspective not found")
    return result


@router.post("/perspectives", response_model=Perspective)
def create_perspective(data: Perspective, db: Session = Depends(get_db)):
    """Create a new perspective."""
    repo = PerspectiveRepository(db)
    return repo.create(data)


@router.put("/perspectives/{id}", response_model=Perspective)
def update_perspective(id: str, data: Perspective, db: Session = Depends(get_db)):
    """Update an existing perspective."""
    repo = PerspectiveRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Perspective not found")
    return result


@router.delete("/perspectives/{id}")
def delete_perspective(id: str, db: Session = Depends(get_db)):
    """Delete a perspective."""
    repo = PerspectiveRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Perspective not found")
    return {"message": f"Perspective {id} deleted successfully"}


# ============ Systems ============
@router.get("/systems", response_model=list[System])
def get_systems(db: Session = Depends(get_db)):
    repo = SystemRepository(db)
    return repo.get_all()


@router.get("/systems/{id}", response_model=System)
def get_system(id: str, db: Session = Depends(get_db)):
    repo = SystemRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="System not found")
    return result


@router.post("/systems", response_model=System)
def create_system(data: System, db: Session = Depends(get_db)):
    """Create a new system."""
    repo = SystemRepository(db)
    return repo.create(data)


@router.put("/systems/{id}", response_model=System)
def update_system(id: str, data: System, db: Session = Depends(get_db)):
    """Update an existing system."""
    repo = SystemRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="System not found")
    return result


@router.delete("/systems/{id}")
def delete_system(id: str, db: Session = Depends(get_db)):
    """Delete a system."""
    repo = SystemRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="System not found")
    return {"message": f"System {id} deleted successfully"}


# ============ Entities ============
@router.get("/entities", response_model=list[Entity])
def get_entities(db: Session = Depends(get_db)):
    repo = EntityRepository(db)
    return repo.get_all()


@router.get("/entities/{id}", response_model=Entity)
def get_entity(id: str, db: Session = Depends(get_db)):
    repo = EntityRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Entity not found")
    return result


@router.post("/entities", response_model=Entity)
def create_entity(data: Entity, db: Session = Depends(get_db)):
    """Create a new entity."""
    repo = EntityRepository(db)
    return repo.create(data)


@router.put("/entities/{id}", response_model=Entity)
def update_entity(id: str, data: Entity, db: Session = Depends(get_db)):
    """Update an existing entity."""
    repo = EntityRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Entity not found")
    return result


@router.delete("/entities/{id}")
def delete_entity(id: str, db: Session = Depends(get_db)):
    """Delete an entity."""
    repo = EntityRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": f"Entity {id} deleted successfully"}


# ============ Attributes ============
@router.get("/attributes", response_model=list[Attribute])
def get_attributes(
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


@router.get("/attributes/{id}", response_model=Attribute)
def get_attribute(id: str, db: Session = Depends(get_db)):
    repo = AttributeRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return result


@router.post("/attributes", response_model=Attribute)
def create_attribute(data: Attribute, db: Session = Depends(get_db)):
    """Create a new attribute."""
    repo = AttributeRepository(db)
    return repo.create(data)


@router.put("/attributes/{id}", response_model=Attribute)
def update_attribute(id: str, data: Attribute, db: Session = Depends(get_db)):
    """Update an existing attribute."""
    repo = AttributeRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return result


@router.delete("/attributes/{id}")
def delete_attribute(id: str, db: Session = Depends(get_db)):
    """Delete an attribute."""
    repo = AttributeRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return {"message": f"Attribute {id} deleted successfully"}


# ============ Measures ============
@router.get("/measures", response_model=list[Measure])
def get_measures(
    perspective_id: Optional[str] = None, db: Session = Depends(get_db)
):
    repo = MeasureRepository(db)
    if perspective_id:
        return repo.get_by_perspective(perspective_id)
    return repo.get_all()


@router.get("/measures/{id}", response_model=Measure)
def get_measure(id: str, db: Session = Depends(get_db)):
    repo = MeasureRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Measure not found")
    return result


@router.post("/measures", response_model=Measure)
def create_measure(data: Measure, db: Session = Depends(get_db)):
    """Create a new measure."""
    repo = MeasureRepository(db)
    return repo.create(data)


@router.put("/measures/{id}", response_model=Measure)
def update_measure(id: str, data: Measure, db: Session = Depends(get_db)):
    """Update an existing measure."""
    repo = MeasureRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Measure not found")
    return result


@router.delete("/measures/{id}")
def delete_measure(id: str, db: Session = Depends(get_db)):
    """Delete a measure."""
    repo = MeasureRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Measure not found")
    return {"message": f"Measure {id} deleted successfully"}


# ============ Metrics ============
@router.get("/metrics", response_model=list[Metric])
def get_metrics(
    perspective_id: Optional[str] = None, db: Session = Depends(get_db)
):
    repo = MetricRepository(db)
    if perspective_id:
        return repo.get_by_perspective(perspective_id)
    return repo.get_all()


@router.get("/metrics/{id}", response_model=Metric)
def get_metric(id: str, db: Session = Depends(get_db)):
    repo = MetricRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Metric not found")
    return result


@router.post("/metrics", response_model=Metric)
def create_metric(data: Metric, db: Session = Depends(get_db)):
    """Create a new metric."""
    repo = MetricRepository(db)
    return repo.create(data)


@router.put("/metrics/{id}", response_model=Metric)
def update_metric(id: str, data: Metric, db: Session = Depends(get_db)):
    """Update an existing metric."""
    repo = MetricRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Metric not found")
    return result


@router.delete("/metrics/{id}")
def delete_metric(id: str, db: Session = Depends(get_db)):
    """Delete a metric."""
    repo = MetricRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"message": f"Metric {id} deleted successfully"}


# ============ Processes ============
@router.get("/processes", response_model=list[Process])
def get_processes(db: Session = Depends(get_db)):
    repo = ProcessRepository(db)
    return repo.get_all()


@router.get("/processes/{id}", response_model=Process)
def get_process(id: str, db: Session = Depends(get_db)):
    repo = ProcessRepository(db)
    result = repo.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.post("/processes", response_model=Process)
def create_process(data: ProcessCreate, db: Session = Depends(get_db)):
    """
    Create a new process with steps.

    The `id` field is optional — if omitted, it will be auto-generated from the name.
    """
    process_id = data.id or _generate_id(data.name)
    repo = ProcessRepository(db)

    # Check for duplicate id
    if repo.get_by_id(process_id):
        raise HTTPException(
            status_code=409,
            detail=f"Process with id '{process_id}' already exists",
        )

    process = Process(
        id=process_id,
        name=data.name,
        description=data.description,
        steps=data.steps,
    )
    return repo.create(process)


@router.post("/processes/{id}/duplicate", response_model=Process)
def duplicate_process(id: str, db: Session = Depends(get_db)):
    """
    Deep-copy a process with all steps, remapping internal step IDs.
    """
    repo = ProcessRepository(db)
    source = repo.get_by_id(id)
    if not source:
        raise HTTPException(status_code=404, detail="Process not found")

    import time
    suffix = str(int(time.time()))

    # Build step ID mapping
    id_map = {}
    for step in source.steps:
        new_id = f"{step.id}_copy_{suffix}"
        id_map[step.id] = new_id

    # Deep copy steps with remapped IDs
    from ..models import ProcessStep
    new_steps = []
    for step in source.steps:
        new_step = step.model_copy(update={
            "id": id_map[step.id],
            "depends_on_step_ids": [id_map.get(d, d) for d in step.depends_on_step_ids],
            "parent_step_id": id_map.get(step.parent_step_id) if step.parent_step_id else None,
        })
        new_steps.append(new_step)

    new_id = _generate_id(f"{source.name} Copy")
    # Ensure unique
    counter = 1
    base_id = new_id
    while repo.get_by_id(new_id):
        counter += 1
        new_id = f"{base_id}_{counter}"

    new_process = Process(
        id=new_id,
        name=f"{source.name} (Copy)",
        description=source.description,
        steps=new_steps,
    )
    return repo.create(new_process)


@router.put("/processes/{id}", response_model=Process)
def update_process(id: str, data: Process, db: Session = Depends(get_db)):
    """
    Update an existing process and all its steps.

    This replaces the entire process including all steps.
    To update individual steps, use the step-specific endpoints.
    """
    repo = ProcessRepository(db)
    result = repo.update(id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.delete("/processes/{id}")
def delete_process(id: str, db: Session = Depends(get_db)):
    """
    Delete a process and all its steps.

    This will permanently remove the process and all associated steps
    (financial, management, and operational levels).
    """
    repo = ProcessRepository(db)
    success = repo.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Process not found")
    return {"message": f"Process {id} deleted successfully"}


@router.put("/processes/{process_id}/steps/{step_id}", response_model=Process)
def update_process_step(
    process_id: str,
    step_id: str,
    step_data: dict,
    db: Session = Depends(get_db)
):
    """
    Update a specific step within a process.

    This allows updating individual step properties without replacing the entire process.
    Useful for the Process Map Editor to update step metadata, automation info, and links.
    """
    repo = ProcessRepository(db)
    result = repo.update_step(process_id, step_id, step_data)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Process {process_id} or step {step_id} not found"
        )
    return result


@router.post("/processes/{process_id}/steps", response_model=Process)
def create_process_step(
    process_id: str,
    step_data: dict,
    db: Session = Depends(get_db)
):
    """
    Add a new step to an existing process.

    This allows creating new steps in the Process Map Editor.
    """
    repo = ProcessRepository(db)
    result = repo.create_step(process_id, step_data)
    if not result:
        raise HTTPException(status_code=404, detail=f"Process {process_id} not found")
    return result


@router.put("/processes/{process_id}/reorder", response_model=Process)
def reorder_process_step(
    process_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Reorder a step within a process by setting its new sequence number.
    Other steps shift accordingly.
    Body: { "step_id": "...", "new_sequence": 3 }
    """
    step_id = body.get("step_id")
    new_sequence = body.get("new_sequence")
    if not step_id or new_sequence is None:
        raise HTTPException(status_code=400, detail="step_id and new_sequence are required")

    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    # Find the step
    target_step = None
    other_steps = []
    for step in process.steps:
        if step.id == step_id:
            target_step = step
        else:
            other_steps.append(step)

    if not target_step:
        raise HTTPException(status_code=404, detail="Step not found")

    # Sort remaining by current sequence
    other_steps.sort(key=lambda s: s.sequence)

    # Insert at new position and renumber
    new_sequence = max(1, min(new_sequence, len(process.steps)))
    other_steps.insert(new_sequence - 1, target_step)

    for i, step in enumerate(other_steps):
        step.sequence = i + 1

    process.steps = other_steps
    return repo.update(process_id, process)


@router.put("/processes/{process_id}/steps/bulk-update", response_model=Process)
def bulk_update_steps(
    process_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Bulk-update properties on multiple steps.
    Body: { "step_ids": ["..."], "updates": { "perspective_id": "management" } }
    """
    step_ids = body.get("step_ids", [])
    updates = body.get("updates", {})
    if not step_ids or not updates:
        raise HTTPException(status_code=400, detail="step_ids and updates are required")

    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    ids_set = set(step_ids)
    for step in process.steps:
        if step.id in ids_set:
            for key, value in updates.items():
                if hasattr(step, key):
                    setattr(step, key, value)

    return repo.update(process_id, process)


@router.delete("/processes/{process_id}/steps/bulk-delete", response_model=Process)
def bulk_delete_steps(
    process_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Delete multiple steps at once.
    Body: { "step_ids": ["..."] }
    """
    step_ids = body.get("step_ids", [])
    if not step_ids:
        raise HTTPException(status_code=400, detail="step_ids is required")

    repo = ProcessRepository(db)
    process = repo.get_by_id(process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    ids_set = set(step_ids)
    process.steps = [s for s in process.steps if s.id not in ids_set]

    # Clean up depends_on_step_ids references
    for step in process.steps:
        step.depends_on_step_ids = [
            sid for sid in step.depends_on_step_ids if sid not in ids_set
        ]

    return repo.update(process_id, process)


@router.delete("/processes/{process_id}/steps/{step_id}", response_model=Process)
def delete_process_step(
    process_id: str,
    step_id: str,
    db: Session = Depends(get_db)
):
    """Delete a specific step from a process."""
    repo = ProcessRepository(db)
    result = repo.delete_step(process_id, step_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Process {process_id} or step {step_id} not found"
        )
    return result


# ============ Semantic Mappings ============
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
    repo = SemanticMappingRepository(db)
    return repo.create(data)
