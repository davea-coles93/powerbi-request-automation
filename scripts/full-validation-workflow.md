# Full TMDL Validation Workflow

## Summary

**Option 1** (Syntax Validation) ✅ - Complete and working locally
**Option 2** (Full Model Deployment) ⚠️ - Requires CI/CD environment with PowerShell SqlServer module

## Option 1: Syntax Validation (Local & CI/CD)

```bash
node scripts/validate-tmdl.js [model-path]
```

This validates:
- ✅ Measure definitions exist
- ✅ DAX syntax (parentheses balancing)
- ✅ Empty expression detection

## Option 2: Full Model Deployment (CI/CD Only)

Requires CI/CD environment because:
1. TMSL execution needs PowerShell SqlServer module or TOM library
2. ADOMD.NET (what we have locally) doesn't support TMSL createOrReplace
3. Model deployment requires server to be running (costly to keep on)

### Implementation for CI/CD

The workflow would:
1. Parse TMDL model structure
2. Generate TMSL JSON for schema-only deployment
3. Deploy to temporary AAS database using PowerShell
4. Validate all DAX measures against deployed schema
5. Delete temporary database

### Cost Optimization

- Only run on PR creation/update
- Start AAS server, deploy, validate, delete, stop server
- Total runtime: ~2-3 minutes per PR

## Current Status

- ✅ `scripts/validate-tmdl.js` - Syntax validation working
- ✅ `.NET validator` - DAX validation against existing database working
- ✅ `scripts/deploy-tmdl-model.js` - Parses TMDL and generates TMSL (needs PowerShell for execution)
- ⚠️ TMSL execution blocked locally (needs PowerShell SqlServer module or proper TOM setup)

## Recommendation

For immediate value:
1. Use Option 1 (syntax validation) in local development
2. Implement Option 2 in CI/CD pipeline where PowerShell SqlServer module can be installed
3. Keep AAS server paused when not running tests to minimize cost
