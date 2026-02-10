from fastapi import APIRouter, Depends, HTTPException
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
def create_process(data: Process, db: Session = Depends(get_db)):
    """
    Create a new process with steps.

    The process can include steps at any level (financial, management, operational).
    Use parent_step_id to create hierarchical relationships.

    Example:
        {
            "id": "my_process",
            "name": "My Process",
            "description": "Process description",
            "steps": [
                {
                    "id": "step1",
                    "sequence": 1,
                    "name": "Financial Step",
                    "perspective_id": "financial",
                    "perspective_level": "financial",
                    "has_sub_steps": true,
                    ...
                },
                {
                    "id": "step1_mgmt_1",
                    "sequence": 1,
                    "name": "Management Sub-Process",
                    "perspective_id": "management",
                    "perspective_level": "management",
                    "parent_step_id": "step1",
                    ...
                }
            ]
        }
    """
    repo = ProcessRepository(db)
    return repo.create(data)


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
