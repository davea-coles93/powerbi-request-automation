# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered PowerBI change request automation POC. Clients submit natural-language requests (e.g., "add a profit margin measure") which are triaged by Claude, auto-executed as TMDL changes, committed via PR, and validated against Azure Analysis Services. A self-healing loop auto-fixes DAX validation failures (max 2 attempts for cost control).

## Common Commands

### Development
```bash
npm run install:all          # Install root + backend + frontend dependencies
npm run dev                  # Start backend (port 3001) + frontend (port 5173) concurrently
npm run dev:backend          # Backend only with nodemon hot reload
npm run dev:frontend         # Frontend only (Vite dev server)
npm run build                # Build both backend and frontend
```

### Backend only
```bash
cd backend
npm run dev                  # nodemon --exec ts-node src/index.ts
npm run build                # tsc
npm start                    # node dist/index.js
```

### Frontend only
```bash
cd frontend
npm run dev                  # vite
npm run build                # tsc -b && vite build
npm run lint                 # eslint
```

### MCP Servers
```bash
# powerbi-report (Node.js)
cd mcp-servers/powerbi-report && npm run build    # tsc

# powerbi-semantic (Node.js)
cd mcp-servers/powerbi-semantic && npm run build  # tsc

# powerbi-automation (Python, Windows only, requires Python 3.10+)
cd mcp-servers/powerbi-automation && pip install -e .
```

### Docker
```bash
docker-compose up --build    # Full stack in containers
```

### Ontology Investigation (separate sub-app)
```bash
# Backend (FastAPI + SQLAlchemy + SQLite)
cd ontology-investigation/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (React + Vite + Tailwind + ReactFlow)
cd ontology-investigation/frontend
npm install && npm run dev

# E2E tests (Playwright)
cd ontology-investigation/e2e-tests
npx playwright test
npx playwright test --headed     # with browser visible
```

## Architecture

### Request Processing Pipeline
```
Submit Request → Claude Triage → Route by confidence:
  auto_fix         → Execute with Claude → Generate TMDL → Create PR → DAX Validation → (Self-Heal if failed)
  assisted_fix     → Create PR for human review → Human approves → Execute
  human_design     → Requires manual implementation
  clarification    → Generate questions → User responds → Re-triage
```

### Main App (backend + frontend)

**Backend** (`backend/src/`) - Express 5 + TypeScript

- Entry point: `src/index.ts` - Express server with Helmet, CORS, rate limiting
- Routes: `src/routes/` - `tmdlRequests.ts` (main request CRUD + execution), `visualRequests.ts` (visual creation), `requests.ts` (legacy)
- Types: `src/types/request.ts` (ChangeRequest, TriageResult, ChangeType), `src/types/powerbi.ts`

Key services in `src/services/`:
| Service | Role |
|---------|------|
| `triageService` | Claude-powered request classification with rule-based fallback |
| `tmdlService` | Read/write TMDL model files (measures, tables) |
| `executionService` | Claude-powered TMDL change generation |
| `githubService` | PR creation via GitHub API |
| `workflowService` | Orchestrates the full request pipeline |
| `selfHealingService` | Auto-fix DAX validation failures (max 2 retries) |
| `azureAnalysisService` | Azure AAS connectivity, DAX execution, model deployment |
| `requestStore` | In-memory request storage (no DB yet) |
| `visualFeedbackService` | Visual creation with iterative feedback |
| `clarificationService` | Generate clarification questions for ambiguous requests |
| `automationMcpService` / `reportMcpService` | Bridge to MCP servers |

**Frontend** (`frontend/src/`) - React 19 + Vite + Axios
- Components: `IntakeForm` (submit requests), `RequestList` (view status), `Dashboard` (stats), `ClarificationForm` (answer questions)

### MCP Servers (`mcp-servers/`)

Three stdio-based MCP servers configured in `.mcp.json`:
- **powerbi-report** (Node.js) - Report layer: pages, visuals, filters on `.Report/` PBIP files
- **powerbi-semantic** (Node.js) - Semantic model: 88 tools for TMDL exploration, DAX analysis, quality checks
- **powerbi-automation** (Python) - Windows automation: launch PowerBI Desktop, take screenshots, refresh data via pywinauto

### Ontology Investigation (`ontology-investigation/`)

Separate sub-application (not part of the main PowerBI automation flow). Full docs in `ontology-investigation/docs/`.

**The Problem It Solves:** Existing tools solve pieces in isolation - process mapping (Visio) has no data lineage, data modeling (ER diagrams) has no business context, BI dashboards show results but not the journey, and data lineage tools (Purview) are technical not business-oriented. Nobody connects: "This person on the floor does this action -> which creates this data -> which feeds this metric -> which answers this business question -> which is used in this financial process." That gap is currently filled by tribal knowledge, spreadsheets, and hope.

**The Core Idea:** Connect the complete value chain from operational data creation through to financial analysis. Data flows upward from operations, but requirements flow downward from finance. The ontology captures both directions:

```
Business Question → Metric → Measure → Attribute → System
                                ↓
                         Process Steps (showing execution work,
                                       manual effort, waste)
```

**The Terminology Chain:** `Attribute` (raw data born at point of activity) → `Measure` (calculation applied to attributes) → `Metric` (business KPI answering a business question). Standard BI uses "metric" and "measure" interchangeably; we distinguish them because metrics justify everything else - we capture attributes and build measures *because* we need metrics. Metrics are the anchor point: requirements start there and trace backwards.

**Three-Perspective Framework:** These are modes of thinking about the same underlying reality, not organizational layers:
- **Operational** - "What work is being done? What happened?" (Production Operators, Warehouse Clerks)
- **Management** - "How are we performing? Are we on track?" (Production Managers, Controllers). Management is the *measurement function* within each operational area, not a separate layer.
- **Financial** - "What's the financial position?" (Cost Accountants, CFOs). Consumes from both Operational and Management.

**Entity Lenses:** The same business object means different things per perspective. A Production Order is simultaneously a "work instruction" (Operational), a "performance measurement unit" (Management), and a "cost collector" (Financial). Modeled as one entity with perspective-specific lenses to avoid redundancy.

**Crystallization:** Attributes don't inherently freeze - they crystallize *because of process steps*. "Production confirmations" become frozen facts when the "Production Cutoff" step executes. The same attribute might crystallize at different times for different processes (monthly close vs weekly flash).

**Process Steps with Execution Metadata:** Each step tracks `systems_used_ids` (reveals tool sprawl), `manual_effort_percentage` (automation opportunities), and `waste_category` (Manual Data Entry, Physical Media, System Switching, Waiting Time, Manual Verification). This exposes the hidden execution burden - e.g., a physical inventory count step might be 90% manual, paper → Excel → WMS.

**Scenarios:** Complete switchable ontology instances for different business domains:
- **Manufacturing Operations** - Month-end close, production tracking, COGS lineage
- **Toyota Connected** - Project portfolio management, digital initiative governance, quarterly forecasting
- **TCEU** - Digital consulting practice

Each scenario includes its own perspectives, systems, entities, attributes, measures, metrics, and processes. Scenarios are loaded by clearing the DB and seeding from JSON files (`backend/data/seed_data*.json`).

**Graph Queries (the intelligence layer):** `graph_service.py` implements:
- **Metric tracing** - Metric → Measures → Attributes → Systems (full lineage)
- **Impact analysis** - "If this attribute has a data quality problem, what metrics are at risk?"
- **Perspective views** - All elements filtered by perspective
- **Process flow** - Steps with dependencies for visualization
- **Crystallization points** - Which attributes freeze at which process steps
- **Full step lineage** - How a single operational task connects to business metrics

**Methodology (workshop-based, see `docs/METHODOLOGY.md`):**
1. **Top-Down** (2hrs with executives) - Define business questions and metrics, trace to required attributes. Output: demand signal.
2. **Bottom-Up** (2-3hrs with operational teams) - Map processes, identify produced attributes, document systems and pain points. Output: as-is reality.
3. **Connect & Fill Gaps** (2hrs cross-functional) - Cross-reference demand vs supply, identify gaps: Missing Supply (needed attribute not produced), Unused Supply (collected but unused), Shadow Systems (Excel replacing proper tools), High Manual Effort (80%+ on critical processes).

**Use Cases:**
1. **Power BI Semantic Model Design** - Start with business questions, trace what data you need, use attributes as columns, measures as DAX
2. **Process Improvement** - Quantify waste: "This 80% manual process feeds our $10M revenue forecast"
3. **Data Governance** - Which systems are source of truth? Where are shadow systems?
4. **Requirements Gathering** - Finance says "We need COGS" → ontology traces to production confirmations, goods issues, labor time → IT knows exactly what to integrate

**Business Unit Scope:** Each ontology instance represents ONE business unit/domain. Cross-unit integration happens via shared attributes flowing between units.

**Tech Stack:** FastAPI + SQLAlchemy + SQLite (backend, port 8000), React 18 + Vite + Tailwind + Cytoscape.js + ReactFlow (frontend, port 3000), Playwright (e2e tests), pytest (backend tests)

### Client Models

Multi-tenant via `models/clients.json`. Each client has TMDL-format models stored in `models/` subdirectories. TMDL is a git-friendly text format for PowerBI semantic models.

## Environment

Backend requires `backend/.env` (see `backend/.env.example`):
- `ANTHROPIC_API_KEY` - Required for Claude integration
- `PORT` - Backend port (default 3001)
- `ALLOWED_ORIGINS` - CORS origins
- Azure AAS variables - For CI/CD DAX validation (optional for local dev)

## CI/CD

- `.github/workflows/claude.yml` - Claude Code action for autonomous fixes on @claude mentions, self-healing on failed DAX validation
- `.github/workflows/pr-tests.yml` - Validates PowerBI model changes, checks `clients.json` structure, optional AAS DAX validation
- `scripts/deploy-via-powershell.ps1` - Deploy models to Azure Analysis Services
- `tmsl-executor/` - .NET tool for AAS deployment via TMSL

## Agent Team Composition & Best Practices

When using Claude Code's TeamCreate feature for multi-agent work, always use structured teams with quality-focused roles. Do NOT use ad-hoc background Task agents for non-trivial work.

### Standard Team Roles

Based on the "Pizza Team" pattern for agent swarms (adapted from industry research):

| Role | Responsibility | Quality Function |
|------|---------------|-----------------|
| **Lead / Coordinator** | Decomposes tasks, assigns work, resolves blockers, coordinates handoffs | Ensures architectural consistency across agents |
| **Implementer(s)** | Writes code for assigned features | Focused execution on well-scoped tasks |
| **Reviewer** | Reviews all code changes against patterns, security, and requirements | Catches bugs, hallucinations, style violations, and architectural drift |
| **Tester / QA** | Runs type-checks, tests, validates compilation, checks edge cases | Prevents broken code from being considered "done" |

### When to Use Each Configuration

**Solo agent** (Task tool, no team): Single-file changes, simple searches, quick fixes.

**2-agent team** (implementer + reviewer): Moderate changes touching 2-5 files. Reviewer validates after implementer finishes.

**3-4 agent team** (lead + implementers + reviewer/QA): Complex features touching many files. Multiple implementers work in parallel on non-overlapping files, reviewer checks quality.

**5+ agent team** (full pizza team): Major features or multi-component work. Add a dedicated QA agent separate from the reviewer.

### Quality Principles

1. **Never skip the review step.** Every implementation must be verified by a different agent than the one that wrote it. A dedicated review agent can analyze changes against architectural patterns, security considerations, and testing coverage simultaneously.

2. **Test-first when possible.** QA agent writes/runs tests before and after implementation. Failing tests are created first to establish acceptance criteria.

3. **Reviewer catches hallucinations.** LLM agents can fabricate libraries, APIs, or patterns. The reviewer role exists specifically to catch these.

4. **Type-check is mandatory.** For TypeScript projects, `npx tsc --noEmit` must pass before any task is marked complete. For Python, run `python -m py_compile` or project-specific linting.

5. **One in-progress task per agent.** Agents should claim one task, complete it, mark it done, then claim the next. No multi-tasking.

6. **File ownership boundaries.** When multiple implementers work in parallel, assign clear file ownership to prevent merge conflicts. Agents should NOT edit files owned by other agents.

### Team Task Flow

```
Lead creates tasks → Implementers claim & execute → Reviewer checks each completion →
QA runs type-check/tests → Lead verifies integration → Done
```

### Token Burn Control

- Set `max_turns` on agents to prevent runaway loops (typically 30-50 for implementers, 15-20 for reviewers)
- If an agent is stuck after 3 attempts at the same problem, it should message the lead rather than retrying

### Cleaning Up Agent Teams

Teams must be cleaned up after work completes, or they block creation of new teams ("Already leading team X" error).

**Normal shutdown flow:**
1. Send `shutdown_request` to each teammate via `SendMessage`
2. Wait for agents to acknowledge and terminate
3. Call `TeamDelete` to remove team files

**If TeamDelete fails with "Cannot cleanup team with N active members"** (common with stale agents from crashed/expired sessions):
1. The agents are likely dead but the team state is stale
2. Force cleanup by removing the directories:
   ```bash
   rm -rf ~/.claude/teams/{team-name}
   rm -rf ~/.claude/tasks/{team-name}
   ```
3. Then call `TeamDelete` to clear the in-memory state
4. Now `TeamCreate` will work for the new team

**Prevention:** Always shut down teams at the end of a session. If a session ends abruptly, the next session should check for and clean up stale teams before creating new ones.

### Anti-patterns to Avoid

- **No reviewer**: Every bug the reviewer catches saves 10x the cost of fixing it later
- **Too many agents**: More agents = more coordination overhead. 3-4 is the sweet spot for most tasks
- **Agents editing the same file**: Race conditions and overwrites. Assign clear file ownership
- **Skipping type-check**: "It looks right" is not verification. Always compile/lint
- **Not cleaning up teams**: Stale teams from previous sessions block new team creation. Always clean up at session end
