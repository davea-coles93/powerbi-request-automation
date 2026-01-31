#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * TMDL Validation Test Runner
 *
 * Runs the test suite against the TMDL validation system to ensure
 * it correctly validates DAX measures in different scenarios.
 */

// Load test suite
const testSuitePath = path.join(__dirname, 'test-suite.json');
const testSuite = JSON.parse(fs.readFileSync(testSuitePath, 'utf8'));

console.log(`\n🧪 Running TMDL Validation Test Suite\n`);
console.log(`Description: ${testSuite.description}`);
console.log(`Total tests: ${testSuite.tests.length}\n`);

let passedTests = 0;
let failedTests = 0;
const results = [];

// Check if AAS credentials are available
const hasAasCredentials = process.env.AZURE_AAS_SERVER &&
                          process.env.AAS_ACCESS_TOKEN;

if (!hasAasCredentials) {
  console.log('⚠️  Warning: AAS credentials not found. Only syntax validation will be tested.\n');
}

// Run each test
for (const test of testSuite.tests) {
  console.log(`Running test ${test.id}: ${test.name}`);
  console.log(`  Description: ${test.description}`);

  try {
    // Step 1: Test syntax validation (Option 1)
    const syntaxResult = testSyntaxValidation(test);

    // Step 2: Test semantic validation (Option 2) if credentials available
    let semanticResult = null;
    if (hasAasCredentials && test.expectedValidation.semanticValid !== undefined) {
      semanticResult = testSemanticValidation(test);
    }

    // Evaluate test result
    const testPassed = evaluateTest(test, syntaxResult, semanticResult);

    if (testPassed) {
      console.log(`  ✅ PASSED\n`);
      passedTests++;
      results.push({ test: test.id, status: 'PASSED', details: syntaxResult });
    } else {
      console.log(`  ❌ FAILED\n`);
      failedTests++;
      results.push({ test: test.id, status: 'FAILED', details: { syntaxResult, semanticResult } });
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
    failedTests++;
    results.push({ test: test.id, status: 'ERROR', error: error.message });
  }
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total tests: ${testSuite.tests.length}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success rate: ${((passedTests / testSuite.tests.length) * 100).toFixed(1)}%`);

// Write results to file
const resultsPath = path.join(__dirname, 'test-results.json');
fs.writeFileSync(resultsPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    total: testSuite.tests.length,
    passed: passedTests,
    failed: failedTests
  },
  results
}, null, 2));

console.log(`\nResults written to: ${resultsPath}\n`);

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);

/**
 * Test syntax validation (Option 1)
 */
function testSyntaxValidation(test) {
  // Create temporary TMDL file with the measure
  const tempDir = path.join(__dirname, '.temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `${test.id}.tmdl`);
  const tmdlContent = `table ${test.measure.table}

\tmeasure '${test.measure.name}' = \`\`\`
\t\t${test.measure.dax}
\t\t\`\`\`
`;

  fs.writeFileSync(tempFile, tmdlContent);

  try {
    // Check basic syntax
    const issues = [];

    // Check for empty DAX
    if (!test.measure.dax || test.measure.dax.trim().length === 0) {
      issues.push('Empty DAX expression');
    }

    // Check for unbalanced parentheses
    const openParens = (test.measure.dax.match(/\(/g) || []).length;
    const closeParens = (test.measure.dax.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unbalanced parentheses (${openParens} open, ${closeParens} close)`);
    }

    return {
      valid: issues.length === 0,
      issues
    };

  } finally {
    // Cleanup
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Test semantic validation (Option 2) - requires AAS deployment
 */
function testSemanticValidation(test) {
  const validatorPath = path.join(__dirname, '..', '..', 'aas-validator', 'AasValidator');
  const server = process.env.AZURE_AAS_SERVER;
  const database = process.env.AZURE_AAS_DATABASE || process.env.CI_DATABASE_NAME;
  const token = process.env.AAS_ACCESS_TOKEN;

  try {
    const result = execSync(
      `dotnet run --project "${validatorPath}" --no-build --configuration Release -- ` +
      `--server "${server}" --database "${database}" --token "${token}" ` +
      `--command validate --query "${test.measure.dax.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    const response = JSON.parse(result.trim());
    return response;

  } catch (error) {
    // Parse error from output
    try {
      const output = error.stdout || error.stderr || '';
      const jsonMatch = output.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    return { success: false, valid: false, error: error.message };
  }
}

/**
 * Evaluate if test passed based on expected vs actual results
 */
function evaluateTest(test, syntaxResult, semanticResult) {
  const expected = test.expectedValidation;

  // Check syntax validation
  if (expected.syntaxValid !== undefined) {
    if (syntaxResult.valid !== expected.syntaxValid) {
      console.log(`    Expected syntax valid: ${expected.syntaxValid}, got: ${syntaxResult.valid}`);
      if (syntaxResult.issues && syntaxResult.issues.length > 0) {
        console.log(`    Issues: ${syntaxResult.issues.join(', ')}`);
      }
      return false;
    }
  }

  // Check semantic validation if available
  if (semanticResult && expected.semanticValid !== undefined) {
    if (semanticResult.valid !== expected.semanticValid) {
      console.log(`    Expected semantic valid: ${expected.semanticValid}, got: ${semanticResult.valid}`);
      if (semanticResult.error) {
        console.log(`    Error: ${semanticResult.error}`);
      }
      return false;
    }
  }

  return true;
}
