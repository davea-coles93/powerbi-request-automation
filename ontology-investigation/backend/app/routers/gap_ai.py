"""Gap Analysis AI Router — SSE streaming gap analysis."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.gap_ai_service import GapAIService

router = APIRouter(prefix="/api/ai/gaps", tags=["gap-ai"])


@router.get("/analyze")
async def analyze_gaps(
    focus: Optional[str] = Query(None, description="Optional focus area"),
    db: Session = Depends(get_db),
):
    """Stream an AI-powered gap analysis via SSE."""
    service = GapAIService(db)
    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Set ANTHROPIC_API_KEY.",
        )

    return StreamingResponse(
        service.analyze_stream(focus),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
