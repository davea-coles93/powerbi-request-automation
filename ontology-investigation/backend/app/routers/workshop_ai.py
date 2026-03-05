"""
Workshop AI Router — SSE streaming chat + materialize endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.workshop_ai_service import WorkshopAIService

router = APIRouter(prefix="/api/ai/workshop", tags=["workshop-ai"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class MaterializeRequest(BaseModel):
    """Proposals to materialize into the ontology."""
    metrics: list[dict] = []
    measures: list[dict] = []
    attributes: list[dict] = []


class MaterializeResponse(BaseModel):
    success: bool
    created: dict
    skipped: dict


@router.post("/chat")
async def workshop_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Stream a workshop AI response via SSE.

    Accepts conversation history and returns streamed text + structured proposals.
    """
    service = WorkshopAIService(db)
    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Set ANTHROPIC_API_KEY environment variable.",
        )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    return StreamingResponse(
        service.chat_stream(messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/materialize", response_model=MaterializeResponse)
async def materialize_proposals(request: MaterializeRequest, db: Session = Depends(get_db)):
    """
    Create ontology elements from accepted AI proposals.

    Processes in dependency order: attributes -> measures -> metrics.
    Skips elements marked as existing or already in the DB.
    """
    service = WorkshopAIService(db)
    try:
        result = service.materialize_proposals(request.model_dump())
        return MaterializeResponse(
            success=True,
            created=result["created"],
            skipped=result["skipped"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to materialize: {str(e)}")


@router.get("/health")
async def workshop_ai_health():
    """Check if workshop AI service is available."""
    service = WorkshopAIService(None)
    return {
        "configured": service.is_configured(),
        "model": "claude-sonnet-4-20250514",
    }
