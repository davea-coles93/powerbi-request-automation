# Self-Healing Feedback Loop

## Architecture: Option B - Post-PR Auto-Correction

### How It Works

```
Business Request
    ↓
Triage & Auto-Fix
    ↓
Create PR (fast!)
    ↓
CI Tests Run
    ├─ PowerBI Validation ✅
    ├─ DAX Validation ❌ FAILED
    ↓
Self-Heal Trigger
    ↓
Claude Reads Error
    ↓
Fixes TMDL File
    ↓
Pushes Fix
    ↓
Tests Re-Run Automatically
    ├─ Success ✅ → PR Ready
    └─ Failure ❌ → Retry (max 2 attempts)
```

### Cost Control Safeguards

#### 1. **Hard Limit: 2 Attempts Per PR**
- Maximum 2 self-heal attempts
- After 2 failures, stops automatically
- Adds `auto-heal-failed` label
- Requires human intervention

#### 2. **Label-Based Tracking**
- `heal-attempt-1` - First fix attempt
- `heal-attempt-2` - Second fix attempt
- `auto-heal-failed` - Giving up, needs human review

#### 3. **Loop Prevention**
- Workflow won't trigger if `auto-heal-failed` label exists
- Checks attempt count before starting
- Comments on PR when giving up

#### 4. **Scope Limiting**
Claude is explicitly instructed to ONLY:
- Modify the TMDL file changed in the PR
- Fix measure syntax/DAX errors
- NOT modify infrastructure (workflows, backend code)
- NOT retry if infrastructure issues detected

### Cost Estimates

**Per Self-Heal Attempt:**
- Claude API call: ~$0.015 - $0.10 (depends on context size)
- GitHub Actions: ~$0.008/minute
- Azure AAS: ~$0.10/hour (already running for tests)

**Maximum Cost Per PR:**
- 2 attempts × $0.10 = **$0.20 maximum**
- Most PRs succeed first time: **$0.015 typical**

### Triggers

**Activates When:**
- ✅ PR is updated (`synchronize` event)
- ✅ DAX Validation check fails
- ✅ Less than 2 previous attempts
- ✅ NOT labeled `auto-heal-failed`

**Does NOT Activate When:**
- ❌ Manual PR update without test failure
- ❌ Other tests fail (only DAX validation)
- ❌ Already attempted 2 times
- ❌ Infrastructure issues (server down, etc.)

### Example Flow

#### Success Case (1 attempt):
```
1. PR created with measure: "Sales Amount YTD"
2. DAX validation fails (syntax error in EVALUATE)
3. Claude triggered → fixes syntax → pushes
4. Tests re-run → ✅ PASS
5. PR ready for merge
```

#### Failure Case (2 attempts):
```
1. PR created with measure using wrong table name
2. Attempt 1: Claude fixes → still wrong column
3. Attempt 2: Claude fixes column → still wrong relationship
4. Auto-heal gives up → Comments: "Manual review needed"
5. Human reviews and fixes properly
```

### Monitoring

**Check Self-Heal Activity:**
```bash
# See all healing attempts
gh pr list --label "heal-attempt-1,heal-attempt-2"

# See failed auto-heals needing attention
gh pr list --label "auto-heal-failed"

# View healing activity on specific PR
gh pr view <number> --comments
```

### Future Enhancements

**Potential Additions:**
1. **Cost tracking** - Track total API spend per day/week
2. **Success rate metrics** - % of successful first attempts
3. **Error classification** - Learn which errors are auto-fixable
4. **Exponential backoff** - Wait longer between attempts
5. **Budget limits** - Daily/weekly spend caps

### Configuration

**To Adjust Limits:**

Edit `.github/workflows/claude.yml`:
```yaml
const MAX_HEAL_ATTEMPTS = 2;  # Change this value
```

**To Disable Self-Healing:**
```bash
# Set repository variable
gh variable set ENABLE_SELF_HEAL --body "false"

# Or add to workflow condition
if: vars.ENABLE_SELF_HEAL == 'true' && ...
```

### Troubleshooting

**Issue: Too many attempts happening**
- Check labels - they should prevent >2 attempts
- Verify `auto-heal-failed` label stops workflow

**Issue: Not triggering when it should**
- Check PR doesn't have `auto-heal-failed` label
- Verify DAX validation actually failed (not just warnings)
- Check workflow permissions (contents: write, pull-requests: write)

**Issue: Healing same error repeatedly**
- This indicates Claude isn't reading the logs correctly
- Or the error is outside TMDL scope (infrastructure)
- Should stop after 2 attempts anyway

---

## Design Rationale

**Why Option B (Post-PR) vs Option A (Pre-PR)?**

| Aspect | Option A (Pre-PR) | Option B (Post-PR) |
|--------|-------------------|---------------------|
| **Speed** | Slower (must validate first) | Faster (PR created immediately) |
| **Cost** | Higher (validates every request) | Lower (only validates when needed) |
| **UX** | Clean (no failed PRs visible) | Transparent (see failures temporarily) |
| **Complexity** | Simple | Moderate (feedback loop) |
| **Learning** | No feedback data | Learns from failures |

**Option B chosen because:**
- ✅ Fast user feedback (PR created in ~30 seconds)
- ✅ Lower cost (only pays for AAS when tests run)
- ✅ Transparent (users see the system self-correcting)
- ✅ Provides data for improving triage logic
- ✅ More realistic (production systems have failures)
