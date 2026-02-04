# POC Plan: Business Ontology Framework

## Objective

Build a working prototype that demonstrates:
1. The schema can represent real business scenarios
2. The three-perspective navigation works
3. The backward-tracing from Metrics → Observations is useful
4. Integration with Power BI semantic models is feasible
5. Architecture supports AI integration for future phases

---

## POC Scope

### In Scope
- JSON Schema definitions for all entity types
- Python backend with API layer
- Graph database or document store for data persistence
- React frontend with graph visualization
- Month-end close example fully populated
- Three perspective views with filtering
- Click-through navigation (Metric → Measures → Observations → Systems)
- Power BI semantic model import (read TMDL, suggest mappings)
- AI integration hooks (structured for LLM interaction)

### Out of Scope (Phase 2+)
- Full editing/authoring UI (basic add/edit only)
- Power Automate integration
- Multi-customer/reference ontology management
- Production deployment/authentication
- Full AI-powered optimization

---

## Technical Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ Perspective │  │   Graph     │  │  Process    │                  │
│  │   Views     │  │   Canvas    │  │   Flow      │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ REST / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Python Backend (FastAPI)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Ontology   │  │   TMDL      │  │     AI      │  │  Graph     │ │
│  │    API      │  │   Parser    │  │   Service   │  │  Queries   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │   Neo4j / SQLite     │  │   JSON File Store    │                 │
│  │   (Graph queries)    │  │   (Portability)      │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + TypeScript | Modern, component-based, good graph libraries |
| Graph Visualization | Cytoscape.js or React Flow | Purpose-built for node/edge graphs |
| Process Flow | React Flow | Designed for flowcharts/diagrams |
| Backend | Python + FastAPI | Fast, async, good for AI integration |
| Data Store | Neo4j (preferred) or SQLite + JSON | Neo4j native graph queries; SQLite for simpler deployment |
| AI Integration | LangChain / Claude API | Structured for RAG and agent patterns |
| Schema Validation | Pydantic (Python) + JSON Schema | Type safety and validation |

### Data Store Decision

**Option A: Neo4j**
```
Pros:
- Native graph database, perfect for ontology relationships
- Cypher query language is intuitive for traversals
- "Find all observations that feed COGS" is one query
- Scales well for complex relationship queries

Cons:
- Additional infrastructure
- Learning curve if unfamiliar
- Overkill for small datasets
```

**Option B: SQLite + JSON**
```
Pros:
- Zero infrastructure, single file
- Easy to version control and share
- Python has excellent SQLite support
- JSON columns for flexible schema

Cons:
- Graph traversals require multiple queries or CTEs
- Less elegant for deep relationship queries
```

**Recommendation**: Start with **SQLite + JSON** for POC portability, design API layer so Neo4j can be swapped in later. The ontology size in POC won't stress SQLite, and it keeps deployment simple.

---

## Project Structure

```
/ontology-investigation
├── /schema
│   ├── perspective.schema.json
│   ├── entity.schema.json
│   ├── system.schema.json
│   ├── observation.schema.json
│   ├── measure.schema.json
│   ├── metric.schema.json
│   ├── process.schema.json
│   └── mapping.schema.json
│
├── /backend
│   ├── /app
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── /models              # Pydantic models
│   │   │   ├── perspective.py
│   │   │   ├── entity.py
│   │   │   ├── observation.py
│   │   │   ├── measure.py
│   │   │   ├── metric.py
│   │   │   ├── process.py
│   │   │   └── mapping.py
│   │   ├── /routers             # API endpoints
│   │   │   ├── ontology.py
│   │   │   ├── graph.py
│   │   │   ├── tmdl.py
│   │   │   └── ai.py
│   │   ├── /services
│   │   │   ├── ontology_service.py
│   │   │   ├── graph_service.py
│   │   │   ├── tmdl_parser.py
│   │   │   └── ai_service.py
│   │   └── /db
│   │       ├── database.py
│   │       └── repositories.py
│   ├── requirements.txt
│   └── tests/
│
├── /frontend
│   ├── /src
│   │   ├── /components
│   │   │   ├── PerspectiveNav.tsx
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── ProcessFlow.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── EntityDetail.tsx
│   │   │   └── MappingPanel.tsx
│   │   ├── /hooks
│   │   │   └── useOntology.ts
│   │   ├── /services
│   │   │   └── api.ts
│   │   ├── /types
│   │   │   └── ontology.ts
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── /data
│   ├── seed_data.json           # Initial month-end example
│   └── ontology.db              # SQLite database
│
└── /docs
    ├── ONTOLOGY_DESIGN.md
    ├── EXAMPLE_MONTH_END.md
    └── API.md
```

---

## API Design

### Core Endpoints

```
# Ontology CRUD
GET    /api/perspectives
GET    /api/entities
GET    /api/entities/{id}
POST   /api/entities
GET    /api/observations
GET    /api/measures
GET    /api/metrics
GET    /api/processes
GET    /api/systems

# Graph Queries (the interesting part)
GET    /api/graph/trace-metric/{metric_id}
       → Returns full tree: Metric → Measures → Observations → Systems

GET    /api/graph/perspective/{perspective_id}
       → Returns all elements relevant to a perspective

GET    /api/graph/entity/{entity_id}/full
       → Returns entity with all lenses and related observations

GET    /api/graph/impact/{observation_id}
       → Returns "what metrics would be affected if this observation is wrong?"

# Process
GET    /api/processes/{id}/flow
       → Returns process with step dependencies for visualization

GET    /api/processes/{id}/crystallization
       → Returns which observations crystallize at which steps

# TMDL Integration
POST   /api/tmdl/parse
       → Upload TMDL files, get parsed tables/measures/columns

GET    /api/tmdl/suggest-mappings
       → Given parsed TMDL + ontology, suggest entity/observation mappings

# AI Endpoints
POST   /api/ai/explain-metric
       → "Explain what COGS means and where its data comes from"

POST   /api/ai/find-gaps
       → "What's missing in our ontology for month-end close?"

POST   /api/ai/suggest-measures
       → "Given this metric requirement, what measures would we need?"
```

### Graph Query Example

```python
# GET /api/graph/trace-metric/cogs

{
  "metric": {
    "id": "cogs",
    "name": "Cost of Goods Sold",
    "business_question": "What did it cost to produce what we sold?"
  },
  "trace": {
    "measures": [
      {
        "id": "material_cost_consumed",
        "name": "Material Cost Consumed",
        "observations": [
          {
            "id": "goods_issues",
            "name": "Goods Issues (Materials)",
            "system": {"id": "erp", "name": "ERP", "type": "ERP"},
            "entity": {"id": "material_document", "name": "Material Document"}
          },
          {
            "id": "standard_costs",
            "name": "Standard Costs",
            "system": {"id": "erp", "name": "ERP", "type": "ERP"},
            "entity": {"id": "material", "name": "Material"}
          }
        ]
      },
      {
        "id": "labor_cost_applied",
        "name": "Labor Cost Applied",
        "observations": [
          {
            "id": "labor_time",
            "name": "Labor Time Recordings",
            "system": {"id": "time_system", "name": "Time System", "type": "Other"},
            "entity": {"id": "time_entry", "name": "Time Entry"}
          }
        ]
      }
    ]
  }
}
```

---

## AI Integration Design

### Architecture for AI

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Service Layer                          │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Ontology RAG    │  │  Gap Analyzer    │  │  Suggester    │  │
│  │                  │  │                  │  │               │  │
│  │  - Embeds all    │  │  - Compares      │  │  - Generates  │  │
│  │    ontology      │  │    ontology to   │  │    new        │  │
│  │    elements      │  │    reference     │  │    measures/  │  │
│  │  - Semantic      │  │  - Identifies    │  │    metrics    │  │
│  │    search        │  │    missing       │  │    based on   │  │
│  │  - Q&A           │  │    elements      │  │    patterns   │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
│              │                   │                   │           │
│              └───────────────────┼───────────────────┘           │
│                                  │                               │
│                          ┌───────▼───────┐                       │
│                          │  Claude API   │                       │
│                          │  / LangChain  │                       │
│                          └───────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### AI Use Cases for POC

1. **Explain**: "What is this metric and where does its data come from?"
   - Input: metric_id
   - Process: Traverse graph, format as context, ask LLM to explain
   - Output: Natural language explanation

2. **Gap Analysis**: "What's missing?"
   - Input: Current ontology + reference patterns
   - Process: Compare, identify missing entities/observations/measures
   - Output: List of gaps with recommendations

3. **Suggest**: "I need to track X, what do I need?"
   - Input: Natural language requirement
   - Process: Match to patterns, suggest measures/observations needed
   - Output: Proposed additions to ontology

### Context Preparation for LLM

```python
def prepare_metric_context(metric_id: str) -> str:
    """Prepare rich context for LLM explanation."""

    metric = get_metric(metric_id)
    trace = trace_metric(metric_id)

    context = f"""
    METRIC: {metric.name}
    Business Question: {metric.business_question}
    Relevant Perspectives: {metric.perspectives}

    CALCULATED BY MEASURES:
    {format_measures(trace.measures)}

    SOURCED FROM OBSERVATIONS:
    {format_observations(trace.observations)}

    DATA ORIGINATES IN SYSTEMS:
    {format_systems(trace.systems)}

    USED IN PROCESSES:
    {format_process_steps(metric.used_in_steps)}
    """

    return context
```

---

## Implementation Steps

### Phase 1: Foundation
- [ ] Set up Python backend with FastAPI
- [ ] Define Pydantic models matching schema
- [ ] Set up SQLite database with tables
- [ ] Implement basic CRUD endpoints
- [ ] Seed database with month-end example

### Phase 2: Graph Queries
- [ ] Implement trace-metric endpoint
- [ ] Implement perspective filtering
- [ ] Implement impact analysis
- [ ] Add process flow queries

### Phase 3: React Frontend
- [ ] Set up React + TypeScript project
- [ ] Build perspective navigation
- [ ] Integrate Cytoscape.js for graph
- [ ] Build metric detail view with trace
- [ ] Build process flow visualization

### Phase 4: TMDL Integration
- [ ] Port/adapt existing TMDL parser
- [ ] Build mapping suggestion logic
- [ ] Create mapping UI panel
- [ ] Show gaps visually

### Phase 5: AI Integration
- [ ] Set up Claude API / LangChain
- [ ] Implement explain endpoint
- [ ] Implement gap analysis
- [ ] Add AI chat panel to frontend

---

## Database Schema (SQLite)

```sql
-- Core tables
CREATE TABLE perspectives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT,
    primary_concern TEXT,
    typical_actors JSON,  -- ["Production Manager", "Warehouse Manager"]
    consumes_from JSON,   -- ["operational"]
    feeds JSON            -- ["financial"]
);

CREATE TABLE systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('ERP', 'MES', 'WMS', 'Spreadsheet', 'Manual', 'BI', 'Other')),
    vendor TEXT,
    reliability_default TEXT CHECK(reliability_default IN ('High', 'Medium', 'Low')),
    integration_status TEXT,
    notes TEXT
);

CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    core_attributes JSON,  -- [{"name": "ID", "type": "string"}, ...]
    lenses JSON            -- [{"perspective": "operational", "interpretation": "...", "derived_attributes": [...]}]
);

CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    entity_id TEXT REFERENCES entities(id),
    system_id TEXT REFERENCES systems(id),
    source_actor TEXT,
    reliability TEXT CHECK(reliability IN ('High', 'Medium', 'Low')),
    volatility TEXT CHECK(volatility IN ('Point-in-time', 'Accumulating', 'Continuous')),
    notes TEXT
);

CREATE TABLE measures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logic TEXT,
    input_observations JSON,  -- ["obs_id_1", "obs_id_2"]
    input_measures JSON,      -- ["measure_id_1"]
    delivers_metrics JSON,    -- ["metric_id_1"]
    perspectives JSON         -- ["management", "financial"]
);

CREATE TABLE metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business_question TEXT,
    calculated_by_measures JSON,  -- ["measure_id_1", "measure_id_2"]
    perspectives JSON             -- ["financial"]
);

CREATE TABLE processes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    steps JSON  -- Full step definitions as JSON array
);

-- Mapping tables (separate layer)
CREATE TABLE semantic_mappings (
    id TEXT PRIMARY KEY,
    ontology_type TEXT,      -- 'entity', 'observation', 'measure'
    ontology_id TEXT,
    semantic_object TEXT,    -- 'FactProductionOrders', '[Total COGS]'
    semantic_type TEXT,      -- 'table', 'column', 'measure'
    status TEXT,             -- 'mapped', 'partial', 'gap'
    notes TEXT
);
```

---

## Success Criteria

1. **Full Trace Works**: Start from COGS metric, click through to see ERP goods issues observation
2. **Three Views**: Switch perspectives, see same data filtered appropriately
3. **Process Flow**: Visualize month-end close with dependencies and crystallization
4. **TMDL Parse**: Load a .pbip, see tables/measures, get mapping suggestions
5. **AI Explains**: Ask "what is COGS?" and get coherent explanation with lineage
6. **Extensible**: Adding a new metric is straightforward (API + UI)

---

## Open Questions

1. **Hosting**: Local only for POC, or deploy somewhere (Vercel/Railway)?
2. **Auth**: Skip for POC, but design for it?
3. **Multi-tenant**: Single ontology for POC, but consider customer isolation?
4. **Version control**: Track ontology changes in git, or database versioning?

---

## Next Steps

1. Confirm architecture approach
2. Set up project structure and dependencies
3. Define JSON schemas formally
4. Build backend foundation
5. Seed with month-end data
6. Build first API endpoints
