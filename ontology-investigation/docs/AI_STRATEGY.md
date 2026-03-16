# AI Capabilities Strategy

This document defines the AI capabilities in the ontology tool, when to use each one, and how they work together.

## The Five AI Surfaces

The ontology tool has five distinct AI-powered capabilities. Each serves a specific purpose in the ontology discovery and building workflow.

### 1. AI Assistant (Workshop AI)

**Access:** Purple sparkle button in the header toolbar (always available)

**Purpose:** General-purpose ontology assistant for exploration and building. The "default" AI — use it when you're not sure which tool to use.

**What it does:**
- **Exploration mode:** Answer questions about the current ontology — explain metrics, trace lineage, describe data coverage, compare elements
- **Building mode:** Structure new business questions into Metric → Measure → Attribute chains, linking to existing elements where possible

**When to use:**
- "What metrics do we have for COGS?"
- "Explain the lineage for Gross Margin"
- "I need a metric to track on-time delivery — what would that look like?"
- "What attributes are unused?"

**How it works:** Chat-based with streaming responses. Proposals appear as editable cards that can be accepted (materialized) into the ontology. References existing ontology context including processes and crystallisation pathways.

**Key behaviours:**
- Proposes ONE metric at a time (prevents overwhelm)
- References existing elements by name — won't re-propose what already exists
- Keeps responses concise (<200 words of prose)
- Includes crystallisation context: flags attributes without crystallisation points

---

### 2. Guided Discovery

**Access:** Teal compass button in the header toolbar (always available)

**Purpose:** Structured, interview-style ontology population. Used during workshops to systematically build the ontology from each perspective.

**What it does:**
- Conducts a phased interview from one of three perspectives:
  - **Financial (top-down):** Start with business questions, trace backward to data needed
  - **Management (middle-out):** Connect financial metrics to operational data via KPIs
  - **Operational (bottom-up):** Map what actually happens — systems, data creation, pain points
- Uses industry-specific knowledge packs (manufacturing, services) with pre-built question frameworks, common metrics, and domain vocabulary

**When to use:**
- At the start of an engagement — the primary workshop tool
- When you need systematic coverage, not ad-hoc exploration
- When working with stakeholders who need structured conversation prompts
- Follow the methodology: Financial first (demand), then Operational (supply), then Management (connect)

**How it works:** Session-based with phases and questions. The AI adapts questions based on the industry pack and existing ontology. Proposals accumulate across the session and can be materialized at the end. Cross-perspective notes flag dependencies for other workshop sessions.

**Key behaviours:**
- Asks ONE question at a time
- Adapts industry-specific hints and follow-ups from knowledge packs
- Tracks progress through phases with a progress bar
- Detects cross-perspective dependencies automatically
- Session persists for 4 hours

---

### 3. Process Builder AI

**Access:** Available within the Process Canvas view (context-specific, not in header)

**Purpose:** Build detailed process maps from natural language descriptions or meeting transcripts.

**What it does:**
- Decomposes high-level process descriptions into granular, physical/digital steps
- Extracts structured process data: actors, systems, duration, manual effort, waste categories, crystallisation points
- Links process steps to existing ontology elements (attributes consumed/produced/crystallised, systems used)

**When to use:**
- When mapping a new business process (e.g., month-end close, purchase-to-pay)
- When you have workshop notes or meeting transcripts to convert into structured processes
- When you need to understand crystallisation pathways — which steps freeze which attributes

**How it works:** Chat-based with at least 2 rounds of clarification before proposing. Can accept paste of long transcripts for direct extraction. Proposals are editable process cards with step-level detail.

**Key behaviours:**
- NEVER assumes — always asks clarifying questions about vague descriptions
- Decomposes to physical/digital action level (keyboard touches, mouse clicks)
- Aggressively flags waste categories and automation opportunities
- Identifies crystallisation points — which steps freeze data
- Assigns correct perspective per step (operational/management/financial)
- Typical processes: 10-30 steps at this granularity

---

### 4. AI Gap Analysis

**Access:** Embedded in the Gaps & ROI view (within the gaps page, not a sidebar)

**Purpose:** Automated structural analysis of the ontology to find gaps, risks, and improvement opportunities.

**What it does:**
- Scans the entire ontology and identifies 10 categories of gaps:
  1. **Missing Supply** — metrics need data that isn't captured
  2. **Unused Supply** — attributes exist but nothing uses them
  3. **Shadow System** — signs of Excel/manual workarounds
  4. **High Manual Effort** — process steps >70% manual
  5. **Broken Lineage** — dangling references between elements
  6. **Coverage Gap** — perspectives or entities with no metrics
  7. **Process Risk** — single-actor dependencies, no system backup
  8. **Missing Crystallisation** — attributes used but never formally frozen
  9. **High Crystallisation Cost** — disproportionate effort to freeze data
  10. **Late Crystallisation** — data frozen too late for timely reporting
- Assigns severity (high/medium/low) and health score (0-100)

**When to use:**
- After populating the ontology with Guided Discovery or AI Assistant
- To validate completeness before presenting to stakeholders
- To identify the highest-impact improvement opportunities
- To generate a backlog of issues to address

**How it works:** One-shot streaming analysis. Results appear as expandable gap cards with severity coloring. Individual gaps can be "accepted" into the gap tracking system for follow-up.

**Key behaviours:**
- Only reports real gaps found in data — never fabricates problems
- Prioritizes by severity (high = blocks reporting, medium = quality risk, low = improvement opportunity)
- Limits to 10 most important gaps
- Each gap has specific affected elements and actionable recommendations

---

### 5. Data Ingestion (AI Enrichment)

**Access:** Cyan upload button in the header toolbar (always available)

**Purpose:** Extract ontology elements from existing documents (Excel, CSV, PDF, Word, images, Power BI files).

**When to use:**
- When organizations have existing documentation (process docs, data dictionaries, org charts)
- When migrating from spreadsheet-based ontology tracking
- To bootstrap the ontology from existing artifacts before workshop sessions

---

## Recommended Workflow

The AI capabilities are designed to work together in a specific sequence:

```
1. DISCOVER (Guided Discovery)
   Financial perspective → what questions need answering?
   Operational perspective → what data exists and where?
   Management perspective → how do we connect them?

2. MAP PROCESSES (Process Builder AI)
   For each key process identified in discovery,
   map detailed steps with crystallisation points

3. EXPLORE & REFINE (AI Assistant)
   Fill gaps, explore edge cases, add missing elements,
   ask "what if" questions about the ontology

4. VALIDATE (AI Gap Analysis)
   Run gap analysis to find structural issues,
   address high-severity gaps

5. ITERATE
   Return to any step as understanding deepens
```

## Button Summary for Users

| Button | Icon | Location | Purpose | When to Use |
|--------|------|----------|---------|-------------|
| AI Assistant | Purple sparkle | Header | Ask questions, build metrics | Anytime — exploring or building |
| Guided Discovery | Teal compass | Header | Structured workshop interview | Start of engagement, systematic population |
| Import Data | Cyan upload | Header | Extract from documents | When existing docs are available |
| Process Builder | Within Process Canvas | Process view | Map detailed processes | After identifying key processes |
| Gap Analysis | Within Gaps view | Gaps page | Find ontology gaps | After initial population |

## AI Context & Knowledge

All AI services share context from the current ontology state:
- Perspectives, systems, entities, attributes, measures, metrics
- Existing processes with step-level detail
- Crystallisation coverage — which attributes are crystallised and by what

Industry-specific knowledge packs provide:
- Common metrics and measures for the industry
- Typical systems and their roles
- Domain vocabulary
- Entity patterns with perspective lenses
- Cross-perspective connection triggers

Available packs: **Manufacturing Operations**, **Professional Services**
