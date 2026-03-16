"""
Guided Discovery Service — structured, perspective-based ontology discovery.

Conducts AI-guided interviews per perspective (Financial top-down, Management
middle-out, Operational bottom-up), using knowledge packs to arm the AI with
industry-specific patterns, metrics, and question frameworks.

Sessions track progress through phases/questions and accumulate proposals.
"""

import json
import time
import uuid
from collections import OrderedDict
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from .base_ai_service import BaseAIService
from .ontology_context import OntologyContextBuilder
from .workshop_ai_service import WorkshopAIService


# ── Knowledge Pack Loading ────────────────────────────────────────────────


def _knowledge_dir() -> Path:
    """Resolve the knowledge directory (Docker or local)."""
    docker_path = Path("/app/data/knowledge")
    if docker_path.exists():
        return docker_path
    return Path(__file__).parent.parent.parent / "data" / "knowledge"


def list_knowledge_packs() -> list[dict]:
    """List available industry knowledge packs (excluding _base)."""
    kdir = _knowledge_dir()
    packs = []
    for f in sorted(kdir.glob("*.json")):
        if f.stem.startswith("_"):
            continue
        try:
            meta = json.loads(f.read_text(encoding="utf-8")).get("knowledge_meta", {})
            packs.append({
                "id": meta.get("id", f.stem),
                "name": meta.get("name", f.stem),
                "icon": meta.get("icon", "📦"),
                "description": meta.get("description", ""),
            })
        except (json.JSONDecodeError, KeyError):
            continue
    return packs


def _load_pack(pack_id: str) -> dict:
    """Load a knowledge pack by ID."""
    kdir = _knowledge_dir()
    path = kdir / f"{pack_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Knowledge pack '{pack_id}' not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _load_base() -> dict:
    """Load the universal base knowledge pack."""
    return _load_pack("_base")


# ── Discovery Session ─────────────────────────────────────────────────────


class DiscoverySession:
    """In-memory session state for a guided discovery flow."""

    def __init__(self, perspective: str, industry: str):
        self.id = uuid.uuid4().hex
        self.created_at = time.time()
        self.perspective = perspective  # "financial" | "management" | "operational"
        self.industry = industry  # e.g. "services", "manufacturing"
        self.current_phase_index = 0
        self.current_question_index = 0
        self.captured_elements: dict = {
            "metrics": [],
            "measures": [],
            "attributes": [],
        }
        self.conversation_history: list[dict] = []
        self.cross_perspective_notes: list[dict] = []
        self.completed = False
        # Cache phases to avoid re-reading JSON from disk on every method call
        self._phases_cache: list[dict] | None = None

    def to_dict(self) -> dict:
        phases = self._get_phases()
        total_questions = sum(len(p.get("questions", [])) for p in phases)
        answered = 0
        for i, p in enumerate(phases):
            if i < self.current_phase_index:
                answered += len(p.get("questions", []))
            elif i == self.current_phase_index:
                answered += self.current_question_index
        return {
            "id": self.id,
            "perspective": self.perspective,
            "industry": self.industry,
            "current_phase_index": self.current_phase_index,
            "current_question_index": self.current_question_index,
            "total_phases": len(phases),
            "total_questions": total_questions,
            "questions_answered": answered,
            "progress_pct": round(answered / total_questions * 100) if total_questions else 0,
            "current_phase": phases[self.current_phase_index] if self.current_phase_index < len(phases) else None,
            "current_question": self._current_question(),
            "captured_counts": {k: len(v) for k, v in self.captured_elements.items()},
            "cross_perspective_notes": self.cross_perspective_notes,
            "completed": self.completed,
        }

    def _get_phases(self) -> list[dict]:
        """Get phases for this session's perspective from the industry pack (cached)."""
        if self._phases_cache is not None:
            return self._phases_cache
        try:
            pack = _load_pack(self.industry)
        except FileNotFoundError:
            pack = {}
        perspective_key = {
            "financial": "financial_discovery",
            "management": "management_discovery",
            "operational": "operational_discovery",
        }.get(self.perspective, "financial_discovery")
        self._phases_cache = pack.get(perspective_key, {}).get("phases", [])
        return self._phases_cache

    def _current_question(self) -> dict | None:
        phases = self._get_phases()
        if self.current_phase_index >= len(phases):
            return None
        questions = phases[self.current_phase_index].get("questions", [])
        if self.current_question_index >= len(questions):
            return None
        return questions[self.current_question_index]

    def advance(self):
        """Move to the next question, or next phase if at end of questions."""
        phases = self._get_phases()
        if self.current_phase_index >= len(phases):
            self.completed = True
            return
        questions = phases[self.current_phase_index].get("questions", [])
        self.current_question_index += 1
        if self.current_question_index >= len(questions):
            self.current_phase_index += 1
            self.current_question_index = 0
        if self.current_phase_index >= len(phases):
            self.completed = True

    def go_back(self):
        """Move to the previous question."""
        if self.current_question_index > 0:
            self.current_question_index -= 1
        elif self.current_phase_index > 0:
            self.current_phase_index -= 1
            phases = self._get_phases()
            questions = phases[self.current_phase_index].get("questions", [])
            self.current_question_index = max(0, len(questions) - 1)
        self.completed = False


# ── Session Store (in-memory, bounded with TTL) ──────────────────────────

MAX_SESSIONS = 100
SESSION_TTL_SECONDS = 4 * 60 * 60  # 4 hours

_sessions: OrderedDict[str, DiscoverySession] = OrderedDict()


def _evict_stale_sessions() -> None:
    """Remove sessions older than TTL and enforce max size."""
    now = time.time()
    expired = [
        sid for sid, s in _sessions.items()
        if now - s.created_at > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _sessions[sid]
    # Evict oldest if still over limit
    while len(_sessions) > MAX_SESSIONS:
        _sessions.popitem(last=False)


def get_session(session_id: str) -> DiscoverySession | None:
    session = _sessions.get(session_id)
    if session and time.time() - session.created_at > SESSION_TTL_SECONDS:
        del _sessions[session_id]
        return None
    return session


def create_session(perspective: str, industry: str) -> DiscoverySession:
    _evict_stale_sessions()
    session = DiscoverySession(perspective, industry)
    _sessions[session.id] = session
    return session


# ── System Prompt Builder ──────────────────────────────────────────────────


def _build_system_prompt(session: DiscoverySession, ontology_context: str) -> str:
    """Build the system prompt for the discovery AI, injecting relevant knowledge."""
    perspective_names = {
        "financial": "Financial",
        "management": "Management",
        "operational": "Operational",
    }
    perspective_name = perspective_names.get(session.perspective, session.perspective)

    # Load knowledge
    try:
        base = _load_base()
        pack = _load_pack(session.industry)
    except FileNotFoundError:
        base = {}
        pack = {}

    # Perspective definition from base
    persp_def = base.get("perspective_definitions", {}).get(session.perspective, {})
    approach = persp_def.get("discovery_approach", "structured")
    approach_desc = persp_def.get("discovery_description", "")

    # Current phase and question
    current_q = session._current_question()
    phases = session._get_phases()
    current_phase = phases[session.current_phase_index] if session.current_phase_index < len(phases) else None

    # Industry-specific metrics and vocabulary
    perspective_key = {
        "financial": "financial_discovery",
        "management": "management_discovery",
        "operational": "operational_discovery",
    }.get(session.perspective, "financial_discovery")
    industry_section = pack.get(perspective_key, {})
    common_metrics = []
    if current_phase:
        common_metrics = current_phase.get("common_metrics", [])
    if not common_metrics:
        common_metrics = industry_section.get("phases", [{}])[0].get("common_metrics", []) if industry_section.get("phases") else []

    typical_systems = industry_section.get("typical_systems", [])
    domain_vocab = pack.get("domain_vocabulary", {}).get("terms", {})

    # Entity patterns
    entity_patterns = pack.get("entity_patterns", {}).get("core_entities", [])

    # Cross-perspective connections
    cross_connections = pack.get("cross_perspective_connections", [])
    base_connections = base.get("cross_perspective_connections", [])
    all_connections = cross_connections + base_connections
    relevant_connections = [c for c in all_connections if c.get("from") == session.perspective]

    # Captured elements summary
    captured_summary = ""
    for kind, items in session.captured_elements.items():
        if items:
            names = [item.get("name", item.get("id", "?")) for item in items]
            captured_summary += f"  - {kind}: {', '.join(names)}\n"

    # Build prompt sections
    sections = []

    sections.append(f"""\
You are conducting a structured {approach} discovery interview for the **{perspective_name}** perspective.

## Your Role
{approach_desc}

## Interview Rules
1. You are a skilled business analyst conducting a structured workshop interview
2. Ask ONE question at a time, then listen carefully to the answer
3. Reference existing ontology elements when relevant — don't re-discover what already exists
4. After getting a substantive answer, propose ontology elements (metrics, measures, attributes) using the proposal format
5. Always acknowledge the user's answer before asking the next question
6. Keep responses concise — under 150 words of prose (excluding proposals)
7. When you detect a cross-perspective dependency, include a cross_perspective_note block

## Key Ontology Concepts
- **Attribute**: Raw data from a source system. Born at the point of activity
- **Measure**: A calculation using attributes or other measures
- **Metric**: Business KPI answering a specific question. The anchor point — metrics justify everything else
- **Crystallisation**: Attributes crystallise when a process step executes, turning raw data into frozen facts
- **Data Flow**: Data flows upward: System → Entity → Attribute → Measure → Metric → Business Question. Requirements flow downward. In the UI, the path data takes from source to trusted fact is called a "Data Journey"

## Edge-Perspective Mapping
Each edge in the lineage corresponds to a perspective of work:
- System → Attribute = **Operational** (data capture) — discovery should identify steps that crystallise attributes
- Attribute → Measure = **Management** (measurement) — discovery should identify steps that produce measures
- Measure → Metric = **Financial** (analysis) — discovery should identify steps that produce metrics

Process steps can declare `produces_measure_ids` and `produces_metric_ids` in addition to attribute-level linkages. When interviewing:
- **Operational** interviews: focus on which steps crystallise attributes (data capture work)
- **Management** interviews: focus on which steps produce measures (calculation/measurement work)
- **Financial** interviews: focus on which steps produce metrics (analysis/reporting work)
""")

    if current_phase and current_q:
        hints = "\n".join(f"  - {h}" for h in current_q.get("hints", []))
        follow_ups = "\n".join(f"  - {f}" for f in current_q.get("follow_ups", []))
        sections.append(f"""\
## Current Phase: {current_phase.get('name', '?')} (Phase {session.current_phase_index + 1} of {len(phases)})
{current_phase.get('description', '')}

## Current Question
**Ask this (adapt naturally to the conversation):**
"{current_q.get('text', '')}"

**Follow-up probes (use if needed):**
{follow_ups}

**Industry-specific hints (use to guide conversation, don't lecture):**
{hints}

**Expected outputs from this question:** {', '.join(current_q.get('expected_outputs', []))}
""")

    if common_metrics:
        metrics_text = "\n".join(
            f"  - **{m['name']}**: \"{m.get('business_question', '')}\" → {', '.join(m.get('typical_measures', []))}"
            for m in common_metrics
        )
        sections.append(f"## Common Metrics for This Phase\n{metrics_text}")

    if typical_systems:
        systems_text = "\n".join(
            f"  - **{s['name']}** ({', '.join(s.get('examples', [])[:3])}): {s.get('role', '')}"
            for s in typical_systems
        )
        sections.append(f"## Typical Systems\n{systems_text}")

    if entity_patterns:
        entity_text = "\n".join(
            f"  - **{e['name']}**: {e.get('description', '')}"
            for e in entity_patterns[:5]
        )
        sections.append(f"## Common Entity Patterns\n{entity_text}")

    if domain_vocab:
        vocab_items = list(domain_vocab.items())[:15]
        vocab_text = "\n".join(f"  - **{k}**: {v}" for k, v in vocab_items)
        sections.append(f"## Domain Vocabulary\n{vocab_text}")

    if relevant_connections:
        conn_text = "\n".join(
            f"  - When discussing **{c.get('trigger_when', '')}**: {c.get('description', '')} → Ask: \"{c.get('suggested_question', '')}\""
            for c in relevant_connections
        )
        sections.append(f"## Cross-Perspective Connections to Flag\n{conn_text}")

    if captured_summary:
        sections.append(f"## Already Captured in This Session\n{captured_summary}")

    sections.append("""\
## Proposal Format
When proposing new ontology elements, include a proposal block:

```proposal
{
  "metrics": [{"id": "snake_case", "name": "Name", "description": "Brief", "business_question": "Question?", "calculated_by_measure_ids": ["m1"], "perspective_ids": ["financial"], "is_existing": false, "existing_id": null}],
  "measures": [{"id": "snake_case", "name": "Name", "description": "Brief", "logic": "Plain English", "formula": "", "input_attribute_ids": ["a1"], "input_measure_ids": [], "perspective_ids": ["financial"], "is_existing": false, "existing_id": null}],
  "attributes": [{"id": "snake_case", "name": "Name", "description": "Brief", "entity_id": "entity", "system_id": "system", "perspective_ids": ["operational"], "is_existing": false, "existing_id": null}]
}
```

## Cross-Perspective Note Format
When you detect a dependency on another perspective, include:

```cross_perspective_note
{
  "from_perspective": "financial",
  "to_perspective": "operational",
  "summary": "Brief description of the cross-perspective dependency",
  "suggested_action": "What needs to happen in the other perspective's discovery"
}
```

## Discovery Question Format
After each response, include the next question to ask:

```discovery_question
{
  "phase": "Phase Name",
  "question": "The next question text",
  "phase_index": 0,
  "question_index": 1
}
```
""")

    sections.append(ontology_context)

    return "\n\n".join(sections)


# ── Guided Discovery Service ──────────────────────────────────────────────


class GuidedDiscoveryService(BaseAIService):
    """Service for AI-guided ontology discovery interviews."""

    def start_session(self, perspective: str, industry: str) -> dict:
        """Create a new discovery session and return its initial state."""
        session = create_session(perspective, industry)
        return session.to_dict()

    def get_session_state(self, session_id: str) -> dict | None:
        """Get current session state."""
        session = get_session(session_id)
        if not session:
            return None
        return session.to_dict()

    async def chat_stream(
        self,
        session_id: str,
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        """Stream a discovery conversation response."""
        session = get_session(session_id)
        if not session:
            yield 'data: {"type":"error","content":"Session not found"}\n\n'
            return

        # Add user message to history
        session.conversation_history.append({"role": "user", "content": user_message})

        # Build context
        ontology_context = OntologyContextBuilder(self.db).summary()
        system_prompt = _build_system_prompt(session, ontology_context)

        # Stream response, accumulating assistant text directly
        assistant_text = ""
        async for chunk in self._stream_sse(
            system_prompt,
            session.conversation_history,
            max_tokens=2000,
        ):
            # Extract text content from each SSE chunk before yielding
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:].strip())
                    if data.get("type") == "text":
                        assistant_text += data.get("content", "")
                except (json.JSONDecodeError, KeyError):
                    pass
            yield chunk

        session.conversation_history.append({"role": "assistant", "content": assistant_text})

        # Auto-advance question after a substantive exchange
        if len(user_message.split()) > 3:  # not just "yes" or "skip"
            session.advance()

        # Emit session state update
        state_payload = json.dumps({"type": "session_update", "session": session.to_dict()})
        yield f"data: {state_payload}\n\n"

    def skip_question(self, session_id: str) -> dict | None:
        """Skip the current question and advance."""
        session = get_session(session_id)
        if not session:
            return None
        session.advance()
        return session.to_dict()

    def go_back(self, session_id: str) -> dict | None:
        """Go back to the previous question."""
        session = get_session(session_id)
        if not session:
            return None
        session.go_back()
        return session.to_dict()

    def add_captured_elements(self, session_id: str, proposals: dict) -> dict | None:
        """Add accepted proposals to the session's captured elements tally."""
        session = get_session(session_id)
        if not session:
            return None
        for kind in ("metrics", "measures", "attributes"):
            for item in proposals.get(kind, []):
                if not item.get("is_existing"):
                    session.captured_elements[kind].append(item)
        return session.to_dict()

    def materialize_captured(self, session_id: str) -> dict | None:
        """Materialize all captured elements into the ontology."""
        session = get_session(session_id)
        if not session:
            return None

        # Reuse WorkshopAIService materialization
        workshop = WorkshopAIService(self.db)
        result = workshop.materialize_proposals(session.captured_elements)
        return result

    def get_summary(self, session_id: str) -> dict | None:
        """Get a summary of everything captured in the session."""
        session = get_session(session_id)
        if not session:
            return None
        return {
            "session_id": session.id,
            "perspective": session.perspective,
            "industry": session.industry,
            "captured_elements": session.captured_elements,
            "cross_perspective_notes": session.cross_perspective_notes,
            "completed": session.completed,
            "progress": session.to_dict(),
        }
