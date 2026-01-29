# Test Examples for Power BI Request Automation

## Quick Test Suite

### 1. Simple Measure (Auto-Fix)
**Why**: Tests basic triage + TMDL execution + PR creation

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Total Revenue",
    "description": "Sum of Sales Amount",
    "urgency": "low"
  }'
```

**Expected**:
- Triage: `auto_fix` (high confidence)
- Creates measure: `Total Revenue = SUM(Sales[Sales Amount])`
- Creates PR with 1 commit
- Status: `pr_created`

---

### 2. Year-over-Year Calculation (Auto-Fix with Time Intelligence)
**Why**: Tests complex DAX patterns, multiple measures

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Sales YoY Growth",
    "description": "Calculate year-over-year growth percentage comparing this year to last year",
    "urgency": "medium"
  }'
```

**Expected**:
- Triage: `auto_fix`
- Creates 3 measures: Current Year, Prior Year, YoY %
- Tests time intelligence functions (SAMEPERIODLASTYEAR)
- PR with multiple measure changes

---

### 3. Ambiguous Request (Clarification Needed)
**Why**: Tests clarification workflow

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Improve sales metrics",
    "description": "We need better sales reporting",
    "urgency": "high"
  }'
```

**Expected**:
- Triage: `clarification_needed`
- Status: `awaiting_clarification`
- Frontend shows `ClarificationForm` with questions
- After clarification: proceeds to execution

---

### 4. Complex Business Logic (Assisted Fix)
**Why**: Tests human-in-loop for complex scenarios

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Customer Lifetime Value",
    "description": "Calculate CLV with custom retention rates varying by product category and region",
    "urgency": "medium"
  }'
```

**Expected**:
- Triage: `assisted_fix` or `human_design`
- Requires review before execution
- Tests complex multi-step logic

---

### 5. Existing Work Test (State Awareness)
**Why**: Tests that triage reads current state and doesn't propose overwrites

```bash
# First create a measure
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Gross Profit",
    "description": "Sales Amount minus Total Product Cost",
    "urgency": "low"
  }'

# Then request similar measure - should recognize existing work
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "adventure-works",
    "modelName": "sales-sample",
    "title": "Update profit calculation",
    "description": "Need to calculate profit",
    "urgency": "low"
  }'
```

**Expected**:
- First request: Creates `Gross Profit` measure
- Second request: Triage sees existing measure in logs
- Should reference existing work, not recreate

---

### 6. Multi-Client Test
**Why**: Tests client isolation, different models

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "acme-hr",
    "modelName": "human-resources",
    "title": "Headcount",
    "description": "Count of active employees",
    "urgency": "low"
  }'
```

**Expected**:
- Works with different client/model
- Creates PR in correct branch: `feature/acme-hr-human-resources-*`
- No cross-contamination with adventure-works

---

### 7. Error Handling Test
**Why**: Tests invalid inputs, error recovery

```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "invalid-client",
    "modelName": "nonexistent",
    "title": "Test",
    "description": "This should fail gracefully",
    "urgency": "low"
  }'
```

**Expected**:
- Status: `failed`
- Clear error message in execution log
- No partial changes committed

---

## Frontend Test Workflow

1. Open http://localhost:5173
2. Submit "Sales YoY Growth" request
3. Watch request card update in real-time
4. Verify status changes: `pending` → `triaging` → `in_progress` → `pr_created`
5. Click to expand, see execution log
6. Verify PR link appears

---

## Checking Results

### View Request Status
```bash
REQUEST_ID="<paste-id-here>"
curl http://localhost:3001/api/requests/$REQUEST_ID | jq
```

### Check if PR Created
```bash
gh pr list --repo davea-coles93/powerbi-request-automation
```

### View Execution Logs
```bash
curl http://localhost:3001/api/requests/$REQUEST_ID | jq '.executionLog'
```

### Verify TMDL Changes
```bash
cd models/adventure-works
git diff sales-sample.SemanticModel/definition/tables/Sales.tmdl
```

---

## Test Coverage

| Scenario | What It Tests |
|----------|---------------|
| Simple measure | Basic flow: triage → execute → PR |
| YoY calculation | Time intelligence, multiple measures |
| Ambiguous request | Clarification workflow, frontend integration |
| Complex logic | Assisted/human design triage |
| Existing work | State awareness, no overwrites |
| Multi-client | Client isolation, branch naming |
| Error handling | Graceful failure, rollback |

---

## Success Criteria

✅ **Triage Accuracy**: 80%+ auto-fix confidence on clear requests
✅ **Execution Success**: TMDL changes compile, no syntax errors
✅ **PR Creation**: GitHub PR created with correct reviewers
✅ **State Awareness**: Doesn't propose recreating existing measures
✅ **Clarification**: Unclear requests trigger clarification form
✅ **Error Handling**: Failures logged clearly, no partial commits
