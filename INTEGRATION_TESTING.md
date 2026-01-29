# Integration Testing with Azure Analysis Services

## Current State

**What Works:**
- ✅ PR workflow triggers on model changes
- ✅ OIDC authentication to Azure
- ✅ AAS server start/stop (cost optimization)
- ✅ Basic connectivity tests
- ✅ DAX validation API calls

**What's Missing:**
- ❌ Deploy changed model to AAS
- ❌ Run queries against actual data
- ❌ Verify calculation results
- ❌ Test with real-world scenarios

---

## Integration Test Strategy

### Phase 1: Deploy & Validate (Current)
```
PR Created → Deploy TMDL to AAS → Run DAX Queries → Verify Results → Report Back
```

### Phase 2: Full E2E (Future)
```
Request → Execute → Deploy to Test AAS → Validate → Create PR → Deploy to Prod AAS
```

---

## Enhanced Integration Tests

### Test 1: Deploy Model to AAS
```javascript
// backend/tests/integration/aas-deployment.test.js

const { AzureAnalysisService } = require('../services/azureAnalysisService');
const { TmdlService } = require('../services/tmdlService');

async function deployModelToAAS(modelPath) {
  const aas = new AzureAnalysisService();
  const tmdl = new TmdlService();

  // 1. Read TMDL from PR changes
  const modelDefinition = await tmdl.readTmdlModel(modelPath);

  // 2. Deploy to AAS test instance
  await aas.deployModel(modelDefinition);

  // 3. Wait for processing
  await aas.waitForProcessing();

  console.log('✅ Model deployed to AAS');
}
```

### Test 2: Validate Measures Return Data
```javascript
async function validateMeasures() {
  const aas = new AzureAnalysisService();

  // Test each new/modified measure
  const measures = await aas.getMeasures();

  for (const measure of measures) {
    console.log(`Testing ${measure.name}...`);

    // Run DAX query
    const result = await aas.executeDax(`
      EVALUATE
      ROW(
        "MeasureValue", [${measure.name}]
      )
    `);

    // Verify it returns a value (not error)
    if (result.error) {
      throw new Error(`Measure ${measure.name} failed: ${result.error}`);
    }

    console.log(`  Result: ${result.value}`);
    console.log(`✅ ${measure.name} works`);
  }
}
```

### Test 3: Verify Calculations
```javascript
async function verifyCalculations() {
  const aas = new AzureAnalysisService();

  // Test expected values for known scenarios
  const tests = [
    {
      name: 'Total Revenue',
      dax: `EVALUATE ROW("Total", [Total Revenue])`,
      expected: result => result.Total > 0
    },
    {
      name: 'YoY Growth',
      dax: `
        EVALUATE
        TOPN(1,
          ADDCOLUMNS(
            VALUES('Date'[Year]),
            "Growth", [Sales YoY Growth %]
          ),
          'Date'[Year], DESC
        )
      `,
      expected: result => result.Growth !== null
    }
  ];

  for (const test of tests) {
    const result = await aas.executeDax(test.dax);
    if (!test.expected(result)) {
      throw new Error(`${test.name} failed validation`);
    }
    console.log(`✅ ${test.name} validated`);
  }
}
```

---

## Updated GitHub Workflow

### Enhanced DAX Validation Job

```yaml
- name: Deploy model to test AAS
  id: deploy-model
  run: |
    echo "Deploying changed model to AAS..."
    node -e "
      const { deployModelToAAS } = require('./backend/tests/integration/aas-deployment.test');
      const { steps.pr-info.outputs.client } = process.env;
      const { steps.pr-info.outputs.model } = process.env;

      const modelPath = \`models/\${client}/\${model}.SemanticModel\`;

      deployModelToAAS(modelPath).then(() => {
        console.log('✅ Model deployed');
      }).catch(err => {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
      });
    "

- name: Run measure validation
  run: |
    echo "Validating measures return data..."
    node backend/tests/integration/measure-validation.test.js

- name: Run calculation tests
  run: |
    echo "Verifying calculations..."
    node backend/tests/integration/calculation-tests.test.js
```

---

## Cost Optimization

**Current Approach** (Good):
- Start AAS only when needed
- Stop immediately after tests
- Billing only during test window (~2-5 minutes)

**Improvements**:
```yaml
# Only run AAS tests for significant changes
- name: Check if AAS tests needed
  id: check-aas
  run: |
    CHANGED=$(git diff --name-only HEAD~1 | grep -E '\.tmdl$|measures/|tables/' || true)
    if [ -n "$CHANGED" ]; then
      echo "needs_aas=true" >> $GITHUB_OUTPUT
    else
      echo "needs_aas=false" >> $GITHUB_OUTPUT
    fi

- name: Run AAS tests
  if: steps.check-aas.outputs.needs_aas == 'true'
  ...
```

**Cost Estimate**:
- AAS Dev tier: ~$5/hour
- Test duration: ~5 minutes
- Cost per test: ~$0.42
- 50 PRs/month: ~$21/month

---

## Test Data Management

### Option 1: Small Test Dataset
```javascript
// Load minimal test data for fast validation
const testData = {
  Sales: [
    { Date: '2024-01-01', Amount: 1000, Product: 'A' },
    { Date: '2024-02-01', Amount: 1200, Product: 'A' },
    // Enough to test calculations
  ]
};

await aas.loadTestData(testData);
```

### Option 2: Production Sample
```javascript
// Use TOPN to sample prod data
await aas.executeDax(`
  EVALUATE
  TOPN(1000, Sales)
`);
```

### Option 3: Synthetic Data
```javascript
// Generate data programmatically
const syntheticData = generateSalesData({
  rows: 10000,
  dateRange: ['2023-01-01', '2024-12-31'],
  products: 10,
  randomSeed: 12345
});
```

---

## Implementation Plan

### Week 1: Basic Deployment
- [ ] Create `backend/tests/integration/` directory
- [ ] Implement `deployModelToAAS()`
- [ ] Test manual deployment
- [ ] Update workflow to deploy on PR

### Week 2: Measure Validation
- [ ] Implement `validateMeasures()`
- [ ] Test each measure returns data
- [ ] Add to workflow
- [ ] Report results in PR comment

### Week 3: Calculation Tests
- [ ] Define test scenarios
- [ ] Implement `verifyCalculations()`
- [ ] Create test data set
- [ ] Add calculation tests to workflow

### Week 4: Polish & Optimize
- [ ] Add cost optimization (skip if no .tmdl changes)
- [ ] Improve error messages
- [ ] Add retry logic
- [ ] Document test failures

---

## Testing Locally

### Prerequisites
```bash
# Install Azure CLI
az login

# Set environment variables
export AZURE_AAS_SERVER="asazure://eastus.asazure.windows.net/myserver"
export AZURE_AAS_DATABASE="SalesModel"
```

### Run Integration Tests
```bash
cd backend

# Deploy to test AAS
npm run test:integration:deploy

# Validate measures
npm run test:integration:measures

# Run calculation tests
npm run test:integration:calculations

# Full suite
npm run test:integration
```

---

## Success Metrics

### Phase 1 (MVP)
- ✅ Deploy TMDL to AAS without errors
- ✅ All measures return values (not errors)
- ✅ Tests run in <5 minutes
- ✅ Cost <$1 per PR

### Phase 2 (Enhanced)
- ✅ Calculation results match expected values
- ✅ Performance tests (query time <5s)
- ✅ Data quality checks
- ✅ Cross-table relationship validation

### Phase 3 (Production-Ready)
- ✅ Automated rollback on test failure
- ✅ Test data versioning
- ✅ Parallel test execution
- ✅ Integration with monitoring/alerts
