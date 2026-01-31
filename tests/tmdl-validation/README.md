# TMDL Validation Test Suite

Comprehensive test suite for validating the TMDL (Tabular Model Definition Language) validation system.

## Overview

This test suite validates that the TMDL validation system correctly:
- ✅ Accepts valid DAX measures
- ❌ Rejects DAX measures with syntax errors
- ❌ Rejects DAX measures with semantic errors (non-existent columns/tables)
- ✅ Handles complex scenarios (relationships, time intelligence)

## Test Cases

### Test 001: Valid Simple Aggregation
Tests that a basic SUM aggregation passes validation.
```dax
SUM(Sales[Sales Amount])
```

### Test 002: Valid Relationship Navigation
Tests that USERELATIONSHIP with inactive relationships works correctly.
```dax
CALCULATE(SUM(Sales[Sales Amount]), USERELATIONSHIP(Sales[ShipDateKey], 'Date'[DateKey]))
```

### Test 003: Invalid Syntax - Unbalanced Parentheses
Tests that syntax errors are caught during validation.
```dax
SUM(Sales[Sales Amount]  // Missing closing parenthesis
```

### Test 004: Invalid Reference - Non-Existent Column
Tests that semantic validation catches references to non-existent columns.
```dax
SUM(Sales[NonExistentColumn])
```

### Test 005: Valid Complex Time Intelligence
Tests that time intelligence functions work correctly.
```dax
CALCULATE(SUM(Sales[Sales Amount]), DATESYTD('Date'[Date]))
```

## Running the Tests

### Prerequisites
- Node.js installed
- TMDL model deployed (for semantic validation)
- Azure AAS credentials (optional, for full validation)

### Run All Tests
```bash
node tests/tmdl-validation/run-tests.js
```

### Run with Azure AAS Validation
```bash
export AZURE_AAS_SERVER="asazure://region.asazure.windows.net/servername"
export AZURE_AAS_DATABASE="database-name"
export AAS_ACCESS_TOKEN="your-token"
node tests/tmdl-validation/run-tests.js
```

## Test Results

Test results are written to `test-results.json` with the following structure:

```json
{
  "timestamp": "2026-01-31T12:00:00.000Z",
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1
  },
  "results": [
    {
      "test": "test-001",
      "status": "PASSED",
      "details": { ... }
    }
  ]
}
```

## Integration with CI/CD

These tests are automatically run as part of the GitHub Actions workflow in `.github/workflows/tmdl-tests.yml`.

## Adding New Tests

To add a new test case:

1. Edit `test-suite.json`
2. Add a new test object with:
   - `id`: Unique test identifier (e.g., "test-006")
   - `name`: Descriptive test name
   - `description`: What the test validates
   - `measure`: DAX measure to test
   - `expectedResult`: "valid" or "invalid"
   - `expectedValidation`: Expected validation results

Example:
```json
{
  "id": "test-006",
  "name": "Valid CALCULATE with Multiple Filters",
  "description": "Test CALCULATE with multiple filter conditions",
  "model": "models/adventure-works/sales-sample.SemanticModel",
  "measure": {
    "name": "High Value Sales",
    "table": "Sales",
    "dax": "CALCULATE(SUM(Sales[Sales Amount]), Sales[Sales Amount] > 1000)"
  },
  "expectedResult": "valid",
  "expectedValidation": {
    "syntaxValid": true,
    "semanticValid": true
  }
}
```

## Troubleshooting

### Tests fail with "Column cannot be found"
- Ensure the TMDL model is deployed to Azure AAS
- Verify column names match exactly (including case and spaces)

### Tests fail with "Authentication error"
- Check that `AAS_ACCESS_TOKEN` is valid and not expired
- Verify `AZURE_AAS_SERVER` format is correct

### Syntax tests pass but semantic tests fail
- This is expected when running without Azure AAS credentials
- Set up AAS credentials for full validation
