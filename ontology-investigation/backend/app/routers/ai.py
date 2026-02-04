from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..services.ai_service import AIService

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ExplainRequest(BaseModel):
    """Request to explain a metric."""

    metric_id: str


class ExplainResponse(BaseModel):
    """Natural language explanation of a metric."""

    metric_name: str
    explanation: str
    lineage_summary: str


class GapAnalysisRequest(BaseModel):
    """Request for gap analysis."""

    focus_area: Optional[str] = None  # e.g., "month-end close", "inventory"


class GapAnalysisResponse(BaseModel):
    """Identified gaps in the ontology."""

    gaps: list[dict]
    recommendations: list[str]


class SuggestRequest(BaseModel):
    """Request for measure suggestions."""

    requirement: str  # Natural language requirement


class SuggestResponse(BaseModel):
    """Suggested measures and observations."""

    suggested_measures: list[dict]
    suggested_observations: list[dict]
    rationale: str


@router.post("/explain-metric", response_model=ExplainResponse)
async def explain_metric(request: ExplainRequest, db: Session = Depends(get_db)):
    """
    Explain what a metric means and where its data comes from.

    Uses AI to generate a natural language explanation based on the metric trace.
    """
    service = AIService(db)
    result = await service.explain_metric(request.metric_id)
    if not result:
        raise HTTPException(status_code=404, detail="Metric not found")
    return result


@router.post("/find-gaps", response_model=GapAnalysisResponse)
async def find_gaps(request: GapAnalysisRequest, db: Session = Depends(get_db)):
    """
    Identify gaps in the ontology.

    Analyzes the current ontology and suggests missing elements.
    """
    service = AIService(db)
    result = await service.find_gaps(request.focus_area)
    return result


@router.post("/suggest-measures", response_model=SuggestResponse)
async def suggest_measures(request: SuggestRequest, db: Session = Depends(get_db)):
    """
    Suggest measures and observations for a requirement.

    Given a natural language requirement, suggests what measures and observations
    would be needed to fulfill it.
    """
    service = AIService(db)
    result = await service.suggest_measures(request.requirement)
    return result


@router.get("/health")
async def ai_health():
    """Check if AI service is configured and available."""
    service = AIService(None)
    return {"configured": service.is_configured()}
