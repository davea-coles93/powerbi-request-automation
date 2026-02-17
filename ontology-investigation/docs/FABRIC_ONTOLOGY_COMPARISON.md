# Fabric Ontology (Preview) vs Our Business Ontology Framework

Research conducted February 2026. Fabric Ontology announced at Ignite November 2025, currently in public preview. Billing expected first half of 2026.

---

## What Fabric Ontology Is

Part of **Fabric IQ** - Microsoft's push to turn Fabric from a data platform into an "intelligence platform." It's a new item type that defines **entity types** (Customer, Product), **properties** (name, email), and **relationships** (Customer places Order), then binds them to live data in OneLake without copying.

Fabric IQ has five integrated components:
1. **Ontology** - the core semantic vocabulary
2. **Graph** - native graph storage and GQL compute
3. **Data Agent** - conversational Q&A grounded in ontology
4. **Operations Agent** - real-time monitoring with automated actions
5. **Semantic Models** - traditional Power BI definitions extended into AI workflows

### How You Create One

Two paths:
- **Generate from a Power BI semantic model** - tables become entity types, columns become properties, relationships carry over. Only works with Direct Lake mode for data bindings. Measures and calculated columns are NOT supported.
- **Build manually** - define entity types, properties, relationships in the Fabric UI, then bind each to lakehouse tables or eventhouse streams.

### Data Model

| Concept | Description |
|---------|-------------|
| **Entity Type** | Reusable model of a real-world concept (Shipment, Product, Sensor) |
| **Entity Instance** | Concrete occurrence populated from data bindings |
| **Property** | Named fact about an entity with a data type |
| **Relationship** | Typed directional link between entity types with cardinality rules |
| **Data Binding** | Live connection to OneLake data (no copy) |
| **Business Rule** | Constraint with acceptable ranges/values and triggered actions |

---

## What We Have in Common

| Shared Concept | Fabric | Our Framework |
|---|---|---|
| Entity modeling | Entity Types with Properties | Entities with Core Attributes |
| Relationships | Typed directional links with cardinality | Entity-to-entity relationships |
| Graph querying | Native GQL, multi-hop traversal, graph algorithms | `graph_service.py` traversals |
| Data source tracking | Data bindings to OneLake sources | Systems (ERP, MES, WMS, etc.) |
| AI integration | Data agents grounded in ontology | AI endpoints (explain-metric, find-gaps) |
| Single source of truth | One definition per business concept | One entity with perspective lenses |
| Gap identification | Rules/constraints detect violations | Gap analysis dashboard (missing supply, unused supply) |

Both give **business meaning to data** and use **graph-based reasoning** to traverse relationships.

---

## What's Different

| Dimension | Fabric Ontology | Our Framework |
|---|---|---|
| **Core purpose** | Unify entity definitions for AI agents and cross-domain querying | Trace the full value chain from operational data to financial reporting, including process waste |
| **Process modeling** | None - no process steps, sequences, or dependencies | First-class: steps with dependencies, actors, crystallization |
| **Execution metadata** | None | `manual_effort_percentage`, `waste_category`, `systems_used_ids` per step |
| **Perspectives** | One unified definition per entity (that's the point) | Three lenses (Operational/Management/Financial) on same entity |
| **Metric/Measure/Attribute chain** | Not modeled - measures stay in semantic models | Core concept: Metric -> Measure -> Attribute -> System |
| **Business questions** | Implicit via NL queries | Explicit field on every Metric - the anchor point |
| **Crystallization** | Not present | When attributes freeze at process steps |
| **Data binding** | Live bindings to OneLake (lakehouse, eventhouse, semantic models) | Static seed data in SQLite |
| **Scale** | Enterprise - connects across Fabric workspaces | Single business unit POC |
| **Graph engine** | Native Fabric Graph with GQL, graph algorithms, community detection | Python service with manual traversal |
| **Real-time monitoring** | Operations agents detect constraint violations and trigger workflows | Not present |
| **Industry templates** | Planned but not yet available | Scenario templates (Manufacturing, Toyota Connected, TCEU) |

### Terminology Mapping

| Our Term | Fabric Equivalent | Notes |
|----------|-------------------|-------|
| Attribute | Property | Close mapping - both are facts about entities |
| Measure | No equivalent | Fabric ontology does NOT model calculations. Measures stay in semantic models |
| Metric | No equivalent | Fabric has no concept of "metric" distinct from "measure" or "KPI" |
| Business Question | Implicit via NL2Ontology | Users ask questions but it's not a modeled entity |
| Entity | Entity Type / Entity Instance | Direct mapping |
| Process Step | No equivalent | No processes, steps, or workflows as first-class concepts |
| System | No equivalent | No concept of "systems used" or source tool tracking |
| Perspective | No equivalent | No multi-perspective views |
| Crystallization | No equivalent | No concept of when attributes freeze |
| Waste Category | No equivalent | No execution metadata |

### Philosophical Difference

Fabric Ontology aims to create **one authoritative definition** per concept - eliminating conflicting definitions is its stated goal. Our approach recognizes that the same entity legitimately has **different meanings in different contexts** (a Production Order IS a work instruction AND a performance unit AND a cost collector simultaneously).

---

## Why Ours Would Be Used Over Fabric

### 1. Process visibility is the killer feature
Fabric has zero process modeling. It cannot show that the physical inventory count step is 90% manual with paper-to-Excel-to-WMS waste. Our framework exposes the hidden execution burden that no other tool captures.

### 2. The methodology is the product, not just the software
Fabric gives you a tool but no methodology. Our workshop-based approach (2hrs strategic intent -> 2-3hrs current reality -> 2hrs connect & gaps) is a consulting engagement framework. The software supports the methodology, not the other way around.

### 3. Multi-perspective views are legitimate
A Production Order genuinely IS different things to different people. Entity lenses capture this without creating redundancy. Fabric's "one definition" approach forces you to pick a single interpretation or model separate entity types for each perspective.

### 4. Metric-driven requirements tracing
Starting from "What business question are we answering?" and tracing backwards to source systems is how business actually thinks. Fabric ontology doesn't model metrics, measures, or the chain between them at all.

### 5. Waste quantification drives ROI
"This 80% manual step feeds a $10M revenue forecast" gets budget. Fabric can't produce that insight.

### 6. No Fabric dependency
Works for organizations not on Fabric, during evaluation phases, or as a pre-Fabric planning tool.

### 7. Scenario templates accelerate workshops
Pre-built scenarios (Manufacturing, Toyota Connected) give teams a starting point. Fabric has no industry templates yet.

---

## Why Fabric's Would Be Used Over Ours

### 1. Live data bindings
Fabric binds to actual lakehouse/eventhouse data without copying. Our framework uses seeded JSON in SQLite with no live connection to production data.

### 2. Enterprise graph engine
Native GQL, graph algorithms (pathfinding, centrality, community detection), pushdown query optimization. Our Python traversals don't scale.

### 3. AI agent grounding at scale
Fabric agents consume ontology definitions to answer NL questions against live data and take autonomous actions. Our AI endpoints are add-on, not core.

### 4. Real-time monitoring
Operations agents watch for constraint violations and trigger workflows automatically. Our framework is descriptive, not reactive.

### 5. Platform integration
If already on Fabric, ontology connects to Power BI, lakehouses, eventhouses, and notebooks natively. No separate infrastructure.

### 6. Governance and collaboration
Inherits workspace security, audit trails, multi-user collaboration. Our SQLite approach is single-user.

### 7. Microsoft investment
Fabric is getting massive investment. The ontology feature will mature rapidly through 2026.

---

## Fabric Ontology Current Limitations (Preview)

Worth noting - these may change as the feature matures:

- No versioning for ontology definitions
- No industry-specific templates
- No entity type inheritance
- No N:M relationships without mapping tables
- No CLI/REST API for programmatic management
- Decimal data type not supported by Graph (returns null)
- No measures/calculated columns when querying via semantic model bindings
- Import mode and DirectQuery semantic models cannot bind data (only Direct Lake)
- Each entity type limited to one static data binding
- Manual refresh required for upstream data changes
- Business rules feature announced but not yet available
- Performance delays when loading entity instances
- Billing meters not yet published

---

## Product Enhancement Opportunities

### High Value, Low Effort

**1. Data source binding (descriptive)**
Add the ability to bind attributes to actual data source references (connection strings, table/column names, API endpoints) instead of purely descriptive metadata. Not live queries - just structured references that say "this attribute lives in SAP table AFKO, column GAMNG." Makes the ontology actionable for IT teams building integrations.

**2. Business rules / constraints on attributes**
Model acceptable ranges and constraint rules: "Yield Rate must be 0-100%", "Manual effort > 80% on a step feeding a financial metric triggers review." Feed these into the gap analysis dashboard as automated findings.

**3. NL querying as primary interface**
Our AI endpoints exist but are secondary. Make natural language the primary query mode: "What feeds COGS?", "What's the impact if goods issues data quality drops?", "Show me all steps with > 70% manual effort that feed financial metrics." We can answer metric-chain questions that Fabric's NL cannot.

### Medium Value, Medium Effort

**4. Auto-generate ontology from TMDL**
Fabric auto-generates ontology from semantic models (tables -> entities, columns -> properties). We could do the same from TMDL files already in our `models/` directory - pre-populate entities and attributes from existing Power BI models as a starting point for workshops.

**5. Entity instance population**
Currently our entities are definitions only. Showing actual data instances (like Fabric does) makes workshops more tangible: "here are your actual Production Orders, not just the concept of one."

**6. Export to Fabric ontology format**
If customers are moving to Fabric, export our richer ontology (minus process/perspective layers Fabric can't handle) into Fabric's format. Position as: design in our tool, deploy to Fabric.

**7. Import from Fabric ontology**
Reverse direction: import a Fabric ontology as a starting point, then layer on perspectives, processes, and execution metadata that Fabric can't model.

### Strategic Positioning

**8. Complementary, not competitive**
Position as a **pre-implementation design tool and workshop platform** that feeds INTO Fabric (or any BI platform). The workflow becomes:

```
Workshop -> Our Ontology -> Export entities/attributes -> Fabric Ontology + Semantic Model
                         -> Keep process modeling, waste analysis, perspectives as ongoing "why" layer
```

**9. Process overlay concept**
Fabric will never model processes with execution metadata - it's not what it's built for. This is our permanent differentiator. Position the process layer as an overlay that sits on top of ANY semantic layer (Fabric, Power BI, Tableau, dbt) rather than being tied to one platform.

**10. Crystallization as temporal governance**
Fabric has no concept of when data freezes. As organizations adopt Fabric for real-time analytics, the question of "when does this number become final?" becomes more important, not less. Crystallization could become a governance feature that integrates with Fabric's timeline.

---

## Summary

| | Fabric Ontology | Our Framework |
|---|---|---|
| **Answers** | "What does this data mean?" | "Why do we need this data, where does it come from, and what's the human cost of getting it?" |
| **Strength** | Live data, enterprise scale, AI agents | Process modeling, waste quantification, workshop methodology, perspectives |
| **Weakness** | No process modeling, no perspectives, no metric chain | No live data, no enterprise scale, no real-time monitoring |
| **Best for** | Runtime semantic layer for AI and cross-domain queries | Design-time planning, workshop facilitation, process improvement |

The strongest path forward: our framework is the **design and discovery tool** (workshops, requirements, process analysis), and Fabric ontology is the **runtime deployment target** (live data, AI agents, governance). They solve adjacent problems and the overlap is smaller than it first appears.

---

## Power Apps Vibe Coding - UX Research (February 2026)

### What It Is

A new AI-native app type in Power Apps (preview, vibe.powerapps.com). You describe an app in natural language and a team of GPT-5-powered agents simultaneously generates a **plan** (user stories, requirements), a **Dataverse data model** (tables, columns, relationships), and a **full React + TypeScript app** using Fluent UI v9. Announced at Build 2025, entered preview mid-2025, currently English-only in select regions.

### Why It's Relevant

The data entity views and table experiences in Power Apps - both in the vibe-generated apps and in the existing model-driven/canvas app controls - represent a significantly more polished approach to data entity management than our current Tailwind + TanStack Table implementation. Understanding what makes them compelling and what's achievable with open-source tooling helps scope our UX improvements.

### What Makes Power Apps Data Views Compelling

**1. Visual ERD for data modeling**
The "Data Workspace" shows tables as draggable cards on a canvas with relationship lines. Click to edit columns, drag handles to create relationships. Schema is tangible and spatial rather than a list of forms.

**2. Data-type-aware cell rendering**
Grid cells understand their data type. Date columns render date pickers. Lookup columns render searchable dropdowns with linked record previews. Choice fields render as colored pills. Numbers show with formatting. This is automatic - the grid inspects the schema and picks the right renderer.

**3. Inline editing**
Edit records directly in the grid without opening a separate modal. Cells transition from read to edit mode in-place. Saves round-trips and keeps context.

**4. Infinite scroll (no pagination)**
The Power Apps Grid Control uses infinite scrolling by default. No "Page 1 of 5" - just continuous data. Supports selecting up to 1,000 rows for bulk operations.

**5. Nested/expandable rows**
Expand a row to see a subgrid of related records inline. Multiple rows can be expanded simultaneously. This progressive disclosure keeps the primary view clean while making related data one click away.

**6. Column grouping and aggregation**
Group by any column. Collapsed groups show aggregates (sum, min, max, avg) on numeric columns. This turns a flat table into an analytical view.

**7. Design system consistency (Fluent)**
Every component - buttons, inputs, tables, dialogs, icons - follows the same design tokens, spacing, typography, and color system. The visual coherence is hard to achieve with per-component Tailwind classes.

**8. Draft-first data modeling**
Tables exist in-memory as "draft tables" until you publish. Iterate on schema and sample data rapidly without committing to a database. This is a novel UX pattern for workshop-style exploration.

### What Power Apps Uses Under the Hood

| Context | UI Library |
|---------|-----------|
| Vibe-generated apps | `@fluentui/react-components` (Fluent UI v9) + React + TypeScript |
| Generative pages (model-driven) | `@mui/x-data-grid` + `@mui/material` (Material UI) |
| Canvas app modern controls | Fluent UI v2 |
| Icons (everywhere) | `@fluentui/react-icons` |

Notable: even Microsoft uses **MUI X DataGrid** for their AI-generated data pages. It's the most feature-complete open-source React grid available.

### Our Current State

We use **TanStack Table** (`@tanstack/react-table`) with **Tailwind CSS** styling in a generic `DataTable.tsx` component. This is solid plumbing but the experience is basic:

| Capability | Power Apps | Our App |
|---|---|---|
| Cell rendering | Data-type-aware (dates, lookups, pills) | Plain text for everything |
| Editing | Inline in grid | Open separate modal |
| Scrolling | Infinite scroll | Pagination (page N of M) |
| Related records | Nested expandable rows | Navigate to separate view |
| Schema visualization | Draggable ERD canvas | No schema view |
| Grouping/aggregation | Built-in | Not available |
| Design system | Fluent tokens throughout | Per-component Tailwind classes |
| Draft data | In-memory until publish | Direct DB writes |

### Open-Source Equivalents

**Data grids:**
- `@fluentui/react-components` DataGrid - Microsoft's own React grid, closest to Power Apps native
- `@mui/x-data-grid` - what Power Apps generative pages actually use, most feature-complete
- `@tanstack/react-table` - what we already have (headless), needs custom renderers for parity
- `@fluentui/react` DetailsList (v8) - mature with grouping, selection, column resizing
- `FluentUIEditableDetailsList` - Microsoft's own wrapper adding inline editing to DetailsList

**CRUD frameworks:**
- **Refine** (refine.dev) - open-source React meta-framework for CRUD apps, 28K+ GitHub stars, headless architecture, auto-generated CRUD UIs
- **React-Admin** - most popular open-source React admin framework, REST/GraphQL, built on MUI

**Design systems:**
- `@fluentui/react-components` (Fluent UI v9) - exact same design language as Power Apps
- `@fluentui/react-icons` - icon set matching Power Apps
- Microsoft **Creator Kit** (github.com/microsoft/powercat-code-components) - open-source Fluent PCF controls

### UX Enhancement Themes

Based on this research, three themes emerge for improving our data entity experience:

**Theme 1: Smarter tables**
Replace plain-text cell rendering with type-aware renderers. Perspective IDs become colored pills. System references become linked badges. Percentages get visual bars. Business questions get distinct typography. This is achievable with our existing TanStack Table - just needs custom cell components.

**Theme 2: Inline editing**
Reduce the modal-for-everything pattern. At minimum, simple fields (name, description, percentages) should be editable inline. Complex fields (multi-select relationships, nested objects) can stay as modals. TanStack Table supports this pattern natively.

**Theme 3: Relationship visualization**
Add an ERD-style schema view using ReactFlow (which we already have for process maps). Show entities as nodes, attributes as properties on nodes, and relationships as edges. This replaces having to mentally reconstruct the data model from separate table views.

### What NOT to Do

- Don't adopt Fluent UI wholesale. We'd be rewriting the entire frontend for marginal visual improvement. Tailwind is fine; the issue is component design patterns, not the CSS framework.
- Don't add MUI X DataGrid alongside TanStack Table. Pick one. TanStack is more flexible and we already use it.
- Don't try to replicate the vibe coding AI-generation pattern. That's a platform play, not a feature.
- Don't chase infinite scroll for our dataset sizes. With < 100 entities per scenario, pagination vs scroll is irrelevant. Focus on information density instead.
