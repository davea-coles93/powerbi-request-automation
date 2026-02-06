# Business Ontology Framework

A framework for designing Power BI-friendly semantic models by connecting metrics, measures, attributes, and business processes across operational, management, and financial perspectives.

## Overview

This tool bridges the gap between:
- **Business questions** (What do we need to know?)
- **Metrics & Measures** (How do we calculate answers?)
- **Attributes** (What data elements do we need?)
- **Systems** (Where does data come from?)
- **Processes** (What work creates/uses this data?)

### Key Innovation

**Complete data lineage with execution context:**
```
Business Question → Metric → Measure → Attributes → Systems
                                 ↓
                          Process Steps (showing execution work,
                                        manual effort, waste)
```

## Features

### 🎯 Multiple Scenario Support
Switch between different business domain examples:
- **Manufacturing Operations** 🏭 - Production tracking, quality control, month-end close
- **Toyota Connected** 📊 - Project management, portfolio planning, financial forecasting

Use the scenario selector in the app header to switch between examples.

### 📊 Three-Perspective Framework
View your business through complementary lenses:
- **Operational** - Execute and record core business activities
- **Management** - Monitor performance and optimize operations
- **Financial** - Plan and report financial position

### 🔍 Complete Data Lineage
Trace any metric back to its source:
- Which measures calculate it?
- Which attributes feed those measures?
- Which systems produce those attributes?
- What processes collect that data?

### ⚙️ Process Execution Visibility
See the hidden work in your business processes:
- **systems_used_ids** - Tool sprawl and system switching
- **manual_effort_percentage** - Automation opportunities
- **waste_category** - Pain points (manual data entry, physical media, etc.)

### 🤖 AI-Powered Analysis
(Requires ANTHROPIC_API_KEY)
- Explain metrics in business terms
- Find gaps in your ontology
- Suggest measures for requirements

## Quick Start

### Using Docker (Recommended)

1. **Start the application:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

The database is automatically seeded with the Manufacturing scenario on startup.

### Switch Scenarios

Use the scenario selector dropdown in the app header to switch between:
- **Manufacturing Operations** 🏭
- **Toyota Connected - Project Portfolio** 📊

### Development Mode

For hot-reloading during development:

```bash
docker-compose --profile dev up
```

### Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python seed_db.py
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
Frontend (React + TypeScript + Vite)
    │
    │ REST API
    ▼
Backend (Python + FastAPI + Pydantic)
    │
    ▼
SQLite Database (SQLAlchemy ORM)
```

## Key Concepts

### Perspectives
Three universal lenses for viewing business operations:
- **Operational**: Execute core business work (production, projects, sales)
- **Management**: Optimize performance and allocate resources
- **Financial**: Plan and report financial position

### Business Unit Scope
**Important:** Each ontology instance represents ONE business unit/domain.
- Manufacturing unit → One complete ontology
- Sales unit → Separate ontology instance
- Supply Chain unit → Separate ontology instance

Cross-unit integration happens via shared attributes flowing between units.

### Data Flow
```
System → Attribute → Measure → Metric
                       ↓
                Process Steps (execution work)
```

### Entities with Lenses
Business objects that exist across perspectives with different interpretations:
- **Production Order**:
  - Operational: "Work instruction to execute"
  - Management: "Performance measurement unit"
  - Financial: "Cost collector"

### Processes with Execution Metadata
Cross-perspective workflows with steps that show the execution burden:
```json
{
  "id": "physical_count",
  "perspective_id": "operational",
  "systems_used_ids": ["wms", "excel"],
  "manual_effort_percentage": 90,
  "waste_category": "Manual Data Entry, Physical Media"
}
```

## API Endpoints

### Core CRUD
- `GET /api/perspectives` - List perspectives
- `GET /api/metrics` - List metrics
- `GET /api/measures` - List measures
- `GET /api/attributes` - List attributes
- `GET /api/systems` - List systems
- `GET /api/entities` - List entities
- `GET /api/processes` - List processes

### Scenarios
- `GET /api/scenarios/status` - Get current scenario and available scenarios
- `POST /api/scenarios/load/{scenario_id}` - Load a different scenario

### Graph Queries
- `GET /api/graph/trace-metric/{id}` - Trace metric to source
- `GET /api/graph/perspective/{id}` - Get perspective view
- `GET /api/graph/process/{id}/flow` - Get process flow for visualization

### Semantic Model
- `GET /api/semantic-model/tables` - Get Power BI semantic model tables
- `GET /api/semantic-model/tables/{table_name}` - Get table details with measures

### AI (requires ANTHROPIC_API_KEY)
- `POST /api/ai/explain-metric` - Explain a metric
- `POST /api/ai/find-gaps` - Find ontology gaps
- `POST /api/ai/suggest-measures` - Suggest measures for requirements

## Configuration

Set environment variables in `.env`:

```
ANTHROPIC_API_KEY=your-api-key-here
```

## Documentation

See `/docs` folder for:
- **[METHODOLOGY.md](docs/METHODOLOGY.md)** - Workshop approach for building ontologies with customers
- **[ONTOLOGY_DESIGN.md](docs/ONTOLOGY_DESIGN.md)** - Complete framework design and philosophy
- **[EXAMPLE_MONTH_END.md](docs/EXAMPLE_MONTH_END.md)** - Full worked example of month-end close
- **[POC_PLAN.md](docs/POC_PLAN.md)** - Implementation roadmap

## Use Cases

### 1. Power BI Semantic Model Design
Design your semantic model by starting with business questions:
- What metrics answer our business questions?
- What measures calculate those metrics?
- What attributes do we need?
- What grain/granularity is required?

### 2. Process Improvement
Identify waste and automation opportunities:
- Which steps have high manual effort?
- Where do we switch between systems?
- What data entry is manual vs automated?

### 3. Data Governance
Understand data lineage and quality:
- Which systems are source of truth?
- What's the reliability level?
- Where are shadow systems (Excel)?

### 4. Requirements Gathering
Bridge business and technical teams:
- Finance: "We need to know COGS"
- Ontology: Traces to production confirmations, goods issues, labor time
- IT: Now knows exactly what data to integrate

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- Cytoscape.js (graph visualization)

**Backend:**
- Python 3.11+
- FastAPI (REST API framework)
- Pydantic (data validation)
- SQLAlchemy (ORM)
- SQLite (database)

**Testing:**
- Playwright (E2E tests)
- pytest (backend tests)

## Contributing

1. Create feature branches from `main`
2. Write clear commit messages
3. Include tests for new features
4. Update documentation as needed

## License

[License details]
