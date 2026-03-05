"""Process AI Router — SSE streaming chat + materialize for AI process generation."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.process_ai_service import ProcessAIService

router = APIRouter(prefix="/api/ai/process", tags=["process-ai"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class MaterializeProcessRequest(BaseModel):
    """Accepted process proposal to create."""
    process: dict
    steps: list[dict]


class MaterializeProcessResponse(BaseModel):
    success: bool
    process_id: str
    process_name: str
    steps_created: int


@router.post("/chat")
async def process_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Stream a process builder AI response via SSE."""
    service = ProcessAIService(db)
    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Set ANTHROPIC_API_KEY.",
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


@router.post("/materialize", response_model=MaterializeProcessResponse)
async def materialize_process(request: MaterializeProcessRequest, db: Session = Depends(get_db)):
    """Create a process from an accepted AI proposal."""
    service = ProcessAIService(db)
    try:
        result = service.materialize_process(request.model_dump())
        return MaterializeProcessResponse(
            success=True,
            process_id=result["process_id"],
            process_name=result["process_name"],
            steps_created=result["steps_created"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create process: {str(e)}")
