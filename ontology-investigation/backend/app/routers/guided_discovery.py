"""API endpoints for guided discovery sessions."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.db.database import get_db
from app.services.guided_discovery_service import (
    GuidedDiscoveryService,
    list_knowledge_packs,
)


router = APIRouter(prefix="/api/ai/discovery", tags=["guided-discovery"])


class StartSessionRequest(BaseModel):
    perspective: str  # "financial" | "management" | "operational"
    industry: str  # e.g. "services", "manufacturing"


class ChatRequest(BaseModel):
    message: str


class CaptureRequest(BaseModel):
    proposals: dict


# ── Knowledge Packs ───────────────────────────────────────────────────────


@router.get("/knowledge")
def get_knowledge_packs():
    """List available industry knowledge packs."""
    return list_knowledge_packs()


# ── Session Management ────────────────────────────────────────────────────


@router.post("/sessions")
def start_session(
    req: StartSessionRequest,
    db: Session = Depends(get_db),
):
    """Start a new guided discovery session."""
    if req.perspective not in ("financial", "management", "operational"):
        raise HTTPException(status_code=400, detail="Invalid perspective")
    service = GuidedDiscoveryService(db)
    return service.start_session(req.perspective, req.industry)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get current session state and progress."""
    service = GuidedDiscoveryService(db)
    state = service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


# ── Chat ──────────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/chat")
async def chat(
    session_id: str,
    req: ChatRequest,
    db: Session = Depends(get_db),
):
    """Stream a discovery conversation response via SSE."""
    service = GuidedDiscoveryService(db)
    state = service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return StreamingResponse(
        service.chat_stream(session_id, req.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Navigation ────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/skip")
def skip_question(session_id: str, db: Session = Depends(get_db)):
    """Skip the current question and advance."""
    service = GuidedDiscoveryService(db)
    state = service.skip_question(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


@router.post("/sessions/{session_id}/back")
def go_back(session_id: str, db: Session = Depends(get_db)):
    """Go back to the previous question."""
    service = GuidedDiscoveryService(db)
    state = service.go_back(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


# ── Capture & Materialize ─────────────────────────────────────────────────


@router.post("/sessions/{session_id}/capture")
def capture_elements(
    session_id: str,
    req: CaptureRequest,
    db: Session = Depends(get_db),
):
    """Add accepted proposals to the session's captured elements."""
    service = GuidedDiscoveryService(db)
    state = service.add_captured_elements(session_id, req.proposals)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


@router.post("/sessions/{session_id}/materialize")
def materialize(session_id: str, db: Session = Depends(get_db)):
    """Create all captured elements in the ontology."""
    service = GuidedDiscoveryService(db)
    result = service.materialize_captured(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.get("/sessions/{session_id}/summary")
def get_summary(session_id: str, db: Session = Depends(get_db)):
    """Get a summary of all captured elements and cross-perspective notes."""
    service = GuidedDiscoveryService(db)
    summary = service.get_summary(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary
