# PowerBI Automation Architecture

## Overview

This system automates PowerBI measure creation, modification, and validation through a git-based workflow with CI/CD integration.

---

## System Components

### 1. **MCP Tools** (Local TMDL Manipulation)
**Location**: `mcp-servers/powerbi-semantic/`
**Purpose**: Safe, text-based TMDL file manipulation
**Technology**: TypeScript, Node.js

**Write Operations:**
- `manage_measure` - Create/update/delete measures
- `manage_calculated_column` - Create/update/delete calculated columns
- `format_dax` - Format DAX expressions consistently
- `suggest_measure_table` - Recommend table placement for measures

**Read Operations:**
- 50+ analysis tools (dependencies, complexity, quality, naming, etc.)
- Model exploration, relationship analysis, hierarchy inspection
- Pattern detection, circular dependency checks

**Why Text-Based?**
- No file locks (PowerBI Desktop not required)
- No corruption from round-tripping
- Safe for concurrent operations
- Git-friendly line-by-line changes

---

### 2. **tmsl-executor** (AAS Deployment Only)
**Location**: `tmsl-executor/`
**Purpose**: One-way deployment from TMDL to Azure Analysis Services
**Technology**: C# .NET Core 3.1, Microsoft.AnalysisServices.Tabular

**Commands:**
```bash
# Deploy TMDL model to AAS
dotnet run --project tmsl-executor deploy \
  <model-path> <server> <database> <access-token>

# Delete ephemeral test database
dotnet run --project tmsl-executor delete-database \
  <server> <database> <access-token>
```

**Why One-Way?**
- TOM libraries can corrupt files during round-trip serialization
- Deployment doesn't need to write back to TMDL
- Avoids the issues that caused original abandonment

**History:**
- Originally built for local TMDL manipulation (failed due to corruption)
- Pivoted to PowerShell text-based approach
- Repurposed for deployment only (no file corruption risk)

---

### 3. **Backend Services**
**Location**: `backend/src/services/`

**TmdlExecutionService** (`tmdlExecutionService.ts`)
- Orchestrates measure creation/modification
- Uses MCPClient to call PowerBI MCP tools
- Handles request validation and change generation

**MCPClient** (`mcpClient.ts`)
- Spawns MCP servers
- Routes tool calls to appropriate servers
- Manages server lifecycle

**AzureAnalysisService** (`azureAnalysisService.ts`)
- Connects to AAS via XMLA
- Runs DAX validation queries
- Used for testing deployed models

**TmdlService** (`tmdlService.ts`)
- Reads TMDL file structure
- Parses models, tables, measures
- Used by MCP tools for analysis

---

### 4. **CI/CD Pipeline**
**Location**: `.github/workflows/pr-tests.yml`

**Workflow:**
```
PR Created → 2 Parallel Jobs:

├─ Job 1: validate-changes (always runs)
│  ├─ Validate clients.json structure
│  ├─ Extract PR metadata
│  └─ Post validation summary comment
│
└─ Job 2: dax-validation (if ENABLE_AAS_VALIDATION='true')
   ├─ Build tmsl-executor
   ├─ Start AAS server (billing begins)
   ├─ Deploy model to ephemeral DB (ci-test-pr{number}-{timestamp})
   ├─ Run DAX validation tests
   ├─ Delete ephemeral database
   └─ Stop AAS server (billing stops)
```

**Key Features:**
- Ephemeral per-PR databases (no contamination between tests)
- Automatic AAS cost management (start/stop)
- Model auto-detection from PR diff
- OIDC authentication (no stored credentials)

---

## Request Automation Workflow

### User Request Flow:
```
1. User submits request via API/UI
   ↓
2. TmdlExecutionService.executeRequest()
   ↓
3. MCPClient spawns powerbi-semantic server
   ↓
4. MCP analyze model + validate DAX
   ↓
5. MCP suggest_measure_table (smart placement)
   ↓
6. MCP format_dax (consistent style)
   ↓
7. MCP manage_measure (write to TMDL)
   ↓
8. TmdlService detects file changes
   ↓
9. Git: add → commit → push → create PR
   ↓
10. GitHub Actions: validate + deploy to AAS
   ↓
11. AAS validation: test queries + cleanup
   ↓
12. PR comment: validation results
   ↓
13. Human review + merge
```

---

## Architecture Decisions

### Why MCP Instead of TOM?
| Aspect | MCP (Text-Based) | TOM (.NET) |
|--------|------------------|------------|
| File Safety | ✅ No corruption | ❌ Corrupts on round-trip |
| Performance | ✅ Fast (regex) | ⚠️ Slower (parse+serialize) |
| Dependencies | ✅ Node.js only | ❌ .NET, native libs |
| Maintainability | ✅ Easy to debug | ⚠️ Complex XML/BIM |
| Use Case | Local TMDL edits | AAS deployment |

**Decision**: Use MCP for local edits, TOM only for deployment (one-way).

### Why Ephemeral Databases?
- **Isolation**: Each PR tests independently
- **Reproducibility**: Fresh environment per test
- **Cost**: Only pay for test duration (~3-5 minutes)
- **Safety**: No risk of contaminating production models

### Why Git-Based Workflow?
- **Audit Trail**: All changes tracked in git history
- **Collaboration**: Multiple users can request changes
- **Rollback**: Easy to revert bad changes
- **Review**: Human approval before production
- **TMDL Native**: Text-based format is git-friendly

---

## Key Files

### TMDL Structure
```
models/
├── clients.json                    # Client/model registry
└── {client-name}/
    └── {model-name}.SemanticModel/
        ├── definition/
        │   ├── model.tmdl          # Model metadata
        │   ├── tables/
        │   │   └── {Table}.tmdl    # Table definitions (measures, columns)
        │   └── relationships/
        │       └── *.tmdl          # Relationship definitions
        └── {model-name}.pbip       # Project file
```

### CI/CD Configuration
- `.github/workflows/pr-tests.yml` - PR validation pipeline
- GitHub Secrets:
  - `AZURE_AAS_SERVER` - AAS connection string
  - `AZURE_CLIENT_ID` - OIDC client ID
  - `AZURE_TENANT_ID` - Azure tenant
  - `AZURE_SUBSCRIPTION_ID` - Azure subscription
  - `AZURE_RESOURCE_GROUP` - AAS resource group
  - `AZURE_AAS_SERVER_NAME` - AAS server name (for management)
- GitHub Variables:
  - `ENABLE_AAS_VALIDATION` - Enable/disable AAS testing

---

## Development Guidelines

### Adding New MCP Tools

1. **Define the tool** in `mcp-servers/powerbi-semantic/src/tools/index.ts`
2. **Add to createTools()** array
3. **Run build**: `npm run build`
4. **Test locally** before committing
5. **Update this doc** with new capabilities

### Testing Changes Locally

```bash
# Test MCP tools
cd mcp-servers/powerbi-semantic
npm run build
npm start  # Launches MCP server

# Test tmsl-executor
cd tmsl-executor
dotnet build
dotnet run -- deploy <test-args>
```

### Adding New Measure Patterns

Add to `format_dax` or create template-based generators in MCP tools.

---

## Troubleshooting

### DAX Validation Fails in CI
1. Check AAS server is running: `az resource list --resource-group <rg>`
2. Verify OIDC permissions: `az ad app show --id <client-id>`
3. Check database was deployed: logs should show "✓ Database deployed"
4. Review validation test output in GitHub Actions logs

### Measure Creation Fails
1. Check MCP server logs for errors
2. Verify table exists: `list_tables` tool
3. Validate DAX: `validate_dax` tool first
4. Check naming conflicts: `check_name_conflict` tool

### File Corruption
- **If using MCP**: Should never happen (text-based)
- **If using tmsl-executor for local edits**: Don't! Use MCP instead
- **Recovery**: Revert to last known good commit

---

## Performance Considerations

### MCP Operations
- **Fast**: Regex-based parsing, minimal overhead
- **Cached**: TmdlService instances cached per model path
- **Parallel**: Multiple independent operations can run concurrently

### AAS Deployment
- **Cost**: ~$1-2 per test run (3-5 minutes active)
- **Speed**: Deploy + validate + cleanup = ~4 minutes
- **Optimization**: Only runs if `ENABLE_AAS_VALIDATION='true'`

### CI/CD Pipeline
- **Parallel Jobs**: validate-changes + dax-validation run concurrently
- **Early Exit**: Fast validation fails prevent expensive AAS startup
- **Caching**: Node modules and .NET packages cached between runs

---

## Future Enhancements

### Planned
- [ ] DAX template library (YTD, MTD, QTD patterns)
- [ ] Batch measure operations
- [ ] Measure migration tools (move between tables)
- [ ] Auto-suggest measure improvements based on quality analysis

### Under Consideration
- [ ] Relationship management tools
- [ ] Display folder organization
- [ ] Perspective management
- [ ] Data source connection updates

---

## References

### Documentation
- [TMDL Format Specification](https://learn.microsoft.com/power-bi/developer/projects/projects-dataset)
- [Tabular Object Model (TOM)](https://learn.microsoft.com/analysis-services/tom/introduction-to-the-tabular-object-model-tom-in-analysis-services-amo)
- [Azure Analysis Services](https://learn.microsoft.com/azure/analysis-services/)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)

### Key Commits
- `4bf283c` - Fix: Implement text-based TMDL manipulation (PowerShell)
- `caf951a` - Refactor: Repurpose tmsl-executor for AAS deployment
- `7a0e62d` - Add enhanced MCP tools for automation workflow

---

**Last Updated**: 2026-02-02
**Maintained By**: Development Team + Claude Sonnet 4.5
