# Business Ontology Framework

A framework for connecting semantic models, measures, and metrics to business processes across operational, management, and financial perspectives.

## Overview

This tool bridges the gap between:
- **Operational data** (where data is born)
- **Measures** (calculations and derivations)
- **Metrics** (business KPIs)
- **Business processes** (how work flows)

## Quick Start

### Using Docker (Recommended)

1. **Start the application:**
   ```bash
   docker-compose up --build
   ```

2. **Seed the database:**
   ```bash
   docker-compose exec backend python seed_db.py
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

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
Frontend (React + TypeScript)
    │
    │ REST API
    ▼
Backend (Python + FastAPI)
    │
    ▼
SQLite Database
```

## Key Concepts

### Perspectives
- **Operational**: Where work happens and data is created
- **Management**: Where performance is measured
- **Financial**: Where business value is assessed

### Data Flow
```
Observation (data born) → Measure (calculation) → Metric (business KPI)
```

### Entities
Business objects that exist across perspectives with different interpretations (lenses).

### Processes
Cross-perspective workflows with steps that crystallize observations.

## API Endpoints

### Core CRUD
- `GET /api/perspectives` - List perspectives
- `GET /api/metrics` - List metrics
- `GET /api/measures` - List measures
- `GET /api/observations` - List observations
- `GET /api/processes` - List processes

### Graph Queries
- `GET /api/graph/trace-metric/{id}` - Trace metric to source
- `GET /api/graph/perspective/{id}` - Get perspective view
- `GET /api/graph/process/{id}/flow` - Get process flow for visualization

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
- `ONTOLOGY_DESIGN.md` - Complete methodology and schema design
- `EXAMPLE_MONTH_END.md` - Full worked example
- `POC_PLAN.md` - Implementation roadmap
