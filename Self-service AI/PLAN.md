# PowerBI Request Automation - Implementation Plan

## Completed

- [x] Project structure (React frontend + Express backend)
- [x] Request intake form with client/model selection
- [x] Triage service with Claude classification
- [x] Execution service for auto-implementing changes
- [x] Mock PowerBI service (Contoso Finance model)
- [x] PowerBI Desktop MCP downloaded and configured
- [x] GitHub repo created: https://github.com/davea-coles93/powerbi-request-automation
- [x] Claude GitHub Action workflow added

---

## Remaining Tasks

### 1. Install Claude GitHub App (Manual Step Required)

**Action Required:** Install the Claude app to enable @claude mentions in issues/PRs

1. Go to: https://github.com/apps/claude
2. Click "Install"
3. Select `davea-coles93/powerbi-request-automation`
4. Grant required permissions (Contents, PRs, Issues)

Then add your API key as a repository secret:
1. Go to: https://github.com/davea-coles93/powerbi-request-automation/settings/secrets/actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key

---

### 2. Restart Claude Code for PowerBI MCP

**Action Required:** Restart Claude Code to load the PowerBI MCP server

The MCP is configured at: `C:\Users\Dave\PowerBI-MCP\powerbi-desktop-mcp.exe`

After restart, verify with: `claude mcp list`

---

### 3. Download Sample PowerBI Model

**Priority:** High | **Effort:** Low

Download Microsoft's Contoso sample model for testing:
- URL: https://github.com/microsoft/powerbi-desktop-samples
- Or use the AdventureWorks sample from Power BI

---

### 4. Real PowerBI MCP Integration

**Priority:** High | **Effort:** Medium

Replace mock service with real MCP calls:

```typescript
// backend/src/services/powerbiRealService.ts
// Implement IPowerBIService using actual MCP tools
```

Key tasks:
- [ ] Create PowerBI real service class
- [ ] Add MCP client connection
- [ ] Map MCP responses to our types
- [ ] Add connection health checks

---

### 5. Dataverse/PowerApps Integration

**Priority:** Medium | **Effort:** Medium

Since your ticketing is in PowerApps/Dataverse:

Option A: **PowerApps calls our API**
- Create a custom connector in PowerApps
- Point to the deployed backend API
- Trigger on Dataverse record creation

Option B: **Backend polls Dataverse**
- Add Dataverse client to backend
- Poll for new requests
- Sync status back to Dataverse

Tasks:
- [ ] Document Dataverse entity structure needed
- [ ] Create PowerApps custom connector OR Dataverse client
- [ ] Add webhook/polling mechanism
- [ ] Sync request status bidirectionally

---

### 6. Real Git/PR Integration

**Priority:** Medium | **Effort:** Medium

Replace simulated PR URLs with real GitHub integration:

Tasks:
- [ ] Add @octokit/rest dependency
- [ ] Create feature branches for changes
- [ ] Commit DAX/model changes
- [ ] Create real PRs via GitHub API
- [ ] Link PRs back to request records

---

### 7. Database Persistence

**Priority:** Medium | **Effort:** Low

Replace in-memory store with persistent database:

Options:
- SQLite (simplest for POC)
- PostgreSQL (production-ready)
- Dataverse (if integrating with PowerApps)

Tasks:
- [ ] Choose database
- [ ] Add Prisma or Drizzle ORM
- [ ] Migrate RequestStore to use DB
- [ ] Add migration scripts

---

### 8. Authentication

**Priority:** Low (for POC) | **Effort:** Medium

Add Azure AD authentication:

Tasks:
- [ ] Add @azure/msal-node
- [ ] Configure Azure AD app registration
- [ ] Protect API endpoints
- [ ] Add user context to requests

---

### 9. CI/CD Pipeline

**Priority:** Medium | **Effort:** Medium

Full automation pipeline:

```yaml
# Trigger: Dataverse webhook → GitHub Action
# 1. Fetch request details from Dataverse
# 2. Run Claude to analyze and implement
# 3. Test against PowerBI model
# 4. Create PR if successful
# 5. Update Dataverse with status
```

Tasks:
- [ ] Create dedicated workflow for automation
- [ ] Add Dataverse webhook trigger
- [ ] Set up test environment with sample model
- [ ] Add status reporting back to ticketing

---

### 10. Testing & Validation

**Priority:** High | **Effort:** Medium

Tasks:
- [ ] Add unit tests for triage service
- [ ] Add integration tests for execution
- [ ] Add E2E tests for full flow
- [ ] DAX validation test suite

---

## Quick Start Checklist

To run the POC now:

```bash
# 1. Start the backend
cd backend && npm run dev

# 2. Start the frontend (new terminal)
cd frontend && npm run dev

# 3. Open http://localhost:5173

# 4. Submit a sample request
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CURRENT (POC)                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ React Form  │───▶│ Express API │───▶│ Claude API  │              │
│  │ localhost   │    │ :3001       │    │ (Triage +   │              │
│  └─────────────┘    └──────┬──────┘    │  Execute)   │              │
│                            │           └─────────────┘              │
│                     ┌──────▼──────┐                                 │
│                     │ Mock PowerBI│                                 │
│                     │ Service     │                                 │
│                     └─────────────┘                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         TARGET (PRODUCTION)                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ PowerApps   │───▶│ Dataverse   │───▶│ GitHub      │              │
│  │ Form        │    │ Webhook     │    │ Actions     │              │
│  └─────────────┘    └─────────────┘    └──────┬──────┘              │
│                                               │                      │
│                     ┌─────────────────────────▼──────┐              │
│                     │       Claude Code Action       │              │
│                     │  ┌─────────┐   ┌───────────┐  │              │
│                     │  │ Triage  │──▶│ Execute   │  │              │
│                     │  └─────────┘   └─────┬─────┘  │              │
│                     └──────────────────────┼────────┘              │
│                                            │                        │
│                     ┌──────────────────────▼──────┐                 │
│                     │     PowerBI MCP Server      │                 │
│                     │  ┌────────┐  ┌──────────┐  │                 │
│                     │  │Desktop │  │ Fabric   │  │                 │
│                     │  │ Local  │  │ Remote   │  │                 │
│                     │  └────────┘  └──────────┘  │                 │
│                     └─────────────────────────────┘                 │
│                                                                      │
│                     ┌─────────────────────────────┐                 │
│                     │        GitHub PR            │                 │
│                     │  (Review → Merge → Deploy)  │                 │
│                     └─────────────────────────────┘                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Priority Order

1. **Now:** Test the POC locally (npm run dev)
2. **Today:** Install Claude GitHub app + add API key secret
3. **Next:** Download sample PowerBI model + restart Claude Code
4. **Soon:** Real PowerBI MCP integration
5. **Later:** Dataverse integration, real PRs, full CI/CD
