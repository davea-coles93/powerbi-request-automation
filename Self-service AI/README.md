# PowerBI Request Automation POC

AI-powered automation for PowerBI change requests. Demonstrates:
- Intake form for client requests
- Automatic triage via Claude (change type classification)
- Auto-execution of simple changes (DAX formulas, new measures)
- Test validation against PowerBI model
- PR creation for approved changes

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Form    │────▶│  Express API    │────▶│  Claude API     │
│   (Intake)      │     │  (Triage/Route) │     │  (Execute)      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  PowerBI MCP    │
                        │  (Validate/Test)│
                        └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- PowerBI Desktop (for real MCP integration)
- Anthropic API key

### Installation

```bash
# Install all dependencies
npm run install:all

# Copy environment file and add your API key
cp backend/.env.example backend/.env
# Edit backend/.env with your ANTHROPIC_API_KEY
```

### Running

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:5173
```

## PowerBI MCP Setup

The PowerBI MCP has been configured. To complete setup:

1. **Restart Claude Code** to load the MCP server
2. **Open PowerBI Desktop** with a model before using real integration
3. The POC uses a mock Contoso Finance model for testing

### MCP Server Location
```
C:\Users\Dave\PowerBI-MCP\powerbi-desktop-mcp.exe
```

## Request Flow

1. **Submit** - Client fills out the intake form with change request
2. **Quick Classify** - Pattern matching for common request types
3. **Triage** - Claude analyzes and classifies:
   - `auto_fix` - Simple changes (DAX tweaks, new measures)
   - `assisted_fix` - Claude helps, human reviews
   - `human_design` - Complex, needs architect
   - `clarification_needed` - More info required
4. **Execute** - For auto_fix, Claude implements changes
5. **Test** - DAX validation queries run against model
6. **PR** - Successful changes generate a pull request

## Triage Classification

| Change Type | Description | Typical Result |
|-------------|-------------|----------------|
| dax_formula_tweak | Minor formula fixes | auto_fix |
| new_measure | Create new measures | auto_fix/assisted |
| modify_measure | Update existing measures | assisted_fix |
| schema_change | Table/relationship changes | human_design |
| new_report | New report pages | human_design |
| formatting | Visual changes | auto_fix |

## Integration with Existing Systems

### PowerApps/Dataverse Integration
This POC frontend can be replaced with a PowerApps form that POSTs to the same API:

```
POST http://localhost:3001/api/requests
Content-Type: application/json

{
  "clientId": "Contoso Corp",
  "modelName": "Finance Model",
  "title": "Add YoY Sales Measure",
  "description": "Create a year-over-year comparison measure",
  "urgency": "medium"
}
```

### CI/CD Pipeline Integration
For production deployment:

1. **GitHub Action** triggers on Dataverse webhook
2. **Claude Code** runs in container with PowerBI MCP
3. **Changes** committed to feature branch
4. **PR** created automatically for review
5. **Tests** run in pipeline with sample model

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/requests | Create new request |
| GET | /api/requests | List all requests |
| GET | /api/requests/:id | Get request by ID |
| POST | /api/requests/:id/execute | Manually trigger execution |
| GET | /api/requests/stats/summary | Get dashboard stats |
| GET | /api/model | Get PowerBI model info |
| GET | /api/health | Health check |

## Project Structure

```
powerbi-request-automation/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   ├── routes/
│   │   │   └── requests.ts    # API routes
│   │   ├── services/
│   │   │   ├── triageService.ts      # Claude triage
│   │   │   ├── executionService.ts   # Claude execution
│   │   │   ├── powerbiMockService.ts # Mock PBI for testing
│   │   │   └── requestStore.ts       # In-memory store
│   │   └── types/
│   │       ├── request.ts     # Request types
│   │       └── powerbi.ts     # PowerBI types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts             # API client
│   │   ├── types.ts
│   │   └── components/
│   │       ├── IntakeForm.tsx
│   │       ├── RequestList.tsx
│   │       └── Dashboard.tsx
│   └── package.json
└── package.json               # Root scripts
```

## Next Steps for Production

1. **Database** - Replace in-memory store with Dataverse or SQL
2. **Authentication** - Add Azure AD integration
3. **Real PowerBI MCP** - Connect to actual PowerBI Desktop/Service
4. **Git Integration** - Real PR creation via GitHub API
5. **Pipeline** - GitHub Actions or Azure DevOps workflow
6. **Monitoring** - Add logging and observability
