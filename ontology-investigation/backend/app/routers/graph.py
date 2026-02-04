from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..services.graph_service import GraphService

router = APIRouter(prefix="/api/graph", tags=["graph"])


class MetricTrace(BaseModel):
    """Full trace from metric back to observations and systems."""

    metric: dict
    measures: list[dict]
    observations: list[dict]
    systems: list[dict]
    entities: list[dict]


class ImpactAnalysis(BaseModel):
    """What metrics would be affected if an observation changes."""

    observation: dict
    affected_measures: list[dict]
    affected_metrics: list[dict]


class PerspectiveView(BaseModel):
    """All elements relevant to a perspective."""

    perspective: dict
    metrics: list[dict]
    measures: list[dict]
    observations: list[dict]
    entities: list[dict]
    process_steps: list[dict]


@router.get("/trace-metric/{metric_id}", response_model=MetricTrace)
def trace_metric(metric_id: str, db: Session = Depends(get_db)):
    """
    Trace a metric back to its source observations and systems.

    This is the key navigation: Metric → Measures → Observations → Systems/Entities
    """
    service = GraphService(db)
    result = service.trace_metric(metric_id)
    if not result:
        raise HTTPException(status_code=404, detail="Metric not found")
    return result


@router.get("/impact/{observation_id}", response_model=ImpactAnalysis)
def analyze_impact(observation_id: str, db: Session = Depends(get_db)):
    """
    Analyze what metrics would be affected if this observation is wrong or changes.

    Reverse trace: Observation → Measures → Metrics
    """
    service = GraphService(db)
    result = service.analyze_impact(observation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Observation not found")
    return result


@router.get("/measure/{measure_id}/usage")
def get_measure_usage(measure_id: str, db: Session = Depends(get_db)):
    """
    Get usage information for a measure.

    Shows:
    - Which metrics use this measure
    - Which other measures use this measure
    - Which observations this measure depends on
    - Which measures this measure depends on
    """
    service = GraphService(db)
    result = service.get_measure_usage(measure_id)
    if not result:
        raise HTTPException(status_code=404, detail="Measure not found")
    return result


@router.get("/perspective/{perspective_id}", response_model=PerspectiveView)
def get_perspective_view(perspective_id: str, db: Session = Depends(get_db)):
    """
    Get all elements relevant to a perspective.

    Complete view of metrics, measures, observations for a given perspective.
    """
    service = GraphService(db)
    result = service.get_perspective_view(perspective_id)
    if not result:
        raise HTTPException(status_code=404, detail="Perspective not found")
    return result


@router.get("/entity/{entity_id}/full")
def get_entity_full(entity_id: str, db: Session = Depends(get_db)):
    """
    Get an entity with all its lenses and related observations.
    """
    service = GraphService(db)
    result = service.get_entity_full(entity_id)
    if not result:
        raise HTTPException(status_code=404, detail="Entity not found")
    return result


@router.get("/process/{process_id}/flow")
def get_process_flow(
    process_id: str,
    perspective_level: Optional[str] = None,
    parent_step_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get process with step dependencies formatted for visualization.

    Can filter by perspective_level (financial, management, operational)
    or get sub-steps of a specific parent step.
    """
    service = GraphService(db)
    result = service.get_process_flow(process_id, perspective_level, parent_step_id)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.get("/process/{process_id}/crystallization")
def get_crystallization_points(process_id: str, db: Session = Depends(get_db)):
    """
    Get which observations crystallize at which steps.
    """
    service = GraphService(db)
    result = service.get_crystallization_points(process_id)
    if not result:
        raise HTTPException(status_code=404, detail="Process not found")
    return result


@router.get("/step/{step_id}/full-lineage")
def get_step_full_lineage(step_id: str, db: Session = Depends(get_db)):
    """
    Get complete lineage from a process step through the entire ontology.

    Traces:
    - Process Step → Observations → Measures → Metrics → Systems
    - Includes waste analysis showing automation potential and time savings

    This endpoint reveals the complete story of how an operational task
    connects to business metrics and identifies improvement opportunities.
    """
    service = GraphService(db)
    result = service.get_full_lineage(step_id)
    if not result:
        raise HTTPException(status_code=404, detail="Process step not found")
    return result
