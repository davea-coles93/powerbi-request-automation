import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, ExecutionLogEntry, TestResult } from '../types/request';
import { IPowerBIService, PowerBIMeasure } from '../types/powerbi';

/**
 * Self-healing execution service that:
 * 1. Attempts to implement changes
 * 2. Runs tests
 * 3. If tests fail, analyzes the failure and generates a fix
 * 4. Retries with the fix
 * 5. Repeats until success or max retries
 */

const MAX_FIX_ATTEMPTS = 3;

export interface FixAttempt {
  attempt: number;
  action: string;
  expression: string;
  testResults: TestResult[];
  success: boolean;
  failureAnalysis?: string;
  fixApplied?: string;
}

export interface SelfHealingResult {
  success: boolean;
  finalExpression?: string;
  attempts: FixAttempt[];
  logs: ExecutionLogEntry[];
  testResults: TestResult[];
}

const FAILURE_ANALYSIS_PROMPT = `You are a PowerBI DAX expert analyzing test failures.

Given:
1. The original request
2. The DAX expression that was applied
3. The test results showing what failed

Your job is to:
1. Analyze WHY the test failed
2. Identify the root cause in the DAX expression
3. Generate a CORRECTED DAX expression

Common failure causes:
- Wrong column/table references
- Incorrect filter context
- Division by zero not handled
- Date/time intelligence functions need proper date table
- Circular dependencies
- Missing relationships
- Wrong aggregation function

Respond with JSON:
{
  "failureAnalysis": "Why the test failed",
  "rootCause": "The specific issue in the DAX",
  "correctedExpression": "The fixed DAX expression",
  "explanation": "What was changed and why",
  "confidence": 0.0-1.0
}`;

export class SelfHealingService {
  private anthropic: Anthropic;
  private powerbiService: IPowerBIService;

  constructor(powerbiService: IPowerBIService) {
    this.anthropic = new Anthropic();
    this.powerbiService = powerbiService;
  }

  async executeWithSelfHealing(
    request: ChangeRequest,
    initialExpression: string,
    tableName: string,
    measureName: string
  ): Promise<SelfHealingResult> {
    const logs: ExecutionLogEntry[] = [];
    const attempts: FixAttempt[] = [];
    let currentExpression = initialExpression;
    let success = false;

    this.log(logs, 'Self-healing execution started', `Max attempts: ${MAX_FIX_ATTEMPTS}`, 'info');

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      this.log(logs, `Attempt ${attempt}/${MAX_FIX_ATTEMPTS}`, `Applying expression...`, 'info');

      // Apply the current expression
      const applyResult = await this.powerbiService.updateMeasure(
        tableName,
        measureName,
        currentExpression
      );

      if (!applyResult.success) {
        this.log(logs, 'Apply failed', applyResult.message, 'error');

        // Try to fix the apply error
        const fixResult = await this.analyzeAndFix(
          request,
          currentExpression,
          [{ testName: 'Apply measure', passed: false, message: applyResult.message, executedAt: new Date() }],
          tableName,
          measureName
        );

        attempts.push({
          attempt,
          action: 'update_measure',
          expression: currentExpression,
          testResults: [{ testName: 'Apply measure', passed: false, message: applyResult.message, executedAt: new Date() }],
          success: false,
          failureAnalysis: fixResult.failureAnalysis,
          fixApplied: fixResult.correctedExpression || undefined,
        });

        if (fixResult.correctedExpression) {
          currentExpression = fixResult.correctedExpression;
          this.log(logs, 'Fix generated', fixResult.explanation || 'Attempting corrected expression', 'info');
          continue;
        } else {
          this.log(logs, 'Could not generate fix', 'Manual intervention required', 'error');
          break;
        }
      }

      // Run tests
      this.log(logs, 'Running tests', 'Validating the change...', 'info');
      const testResults = await this.runTests(measureName);

      const allPassed = testResults.every(t => t.passed);

      attempts.push({
        attempt,
        action: 'update_measure',
        expression: currentExpression,
        testResults,
        success: allPassed,
      });

      if (allPassed) {
        success = true;
        this.log(logs, 'All tests passed', `Success on attempt ${attempt}`, 'success');
        break;
      }

      // Tests failed - analyze and try to fix
      this.log(logs, 'Tests failed', `${testResults.filter(t => !t.passed).length} test(s) failed`, 'error');

      if (attempt < MAX_FIX_ATTEMPTS) {
        const fixResult = await this.analyzeAndFix(
          request,
          currentExpression,
          testResults,
          tableName,
          measureName
        );

        attempts[attempts.length - 1].failureAnalysis = fixResult.failureAnalysis;
        attempts[attempts.length - 1].fixApplied = fixResult.correctedExpression || undefined;

        if (fixResult.correctedExpression && fixResult.confidence > 0.5) {
          currentExpression = fixResult.correctedExpression;
          this.log(logs, 'Fix generated',
            `${fixResult.explanation} (confidence: ${(fixResult.confidence * 100).toFixed(0)}%)`,
            'info');
        } else {
          this.log(logs, 'Low confidence fix',
            'Generated fix has low confidence, stopping attempts',
            'error');
          break;
        }
      }
    }

    if (!success) {
      // Rollback to original if we have it
      const originalMeasure = await this.getOriginalExpression(tableName, measureName);
      if (originalMeasure) {
        await this.powerbiService.updateMeasure(tableName, measureName, originalMeasure);
        this.log(logs, 'Rolled back', 'Restored original expression', 'info');
      }
    }

    return {
      success,
      finalExpression: success ? currentExpression : undefined,
      attempts,
      logs,
      testResults: attempts[attempts.length - 1]?.testResults || [],
    };
  }

  private async analyzeAndFix(
    request: ChangeRequest,
    expression: string,
    testResults: TestResult[],
    tableName: string,
    measureName: string
  ): Promise<{
    failureAnalysis: string;
    rootCause: string;
    correctedExpression: string | null;
    explanation: string;
    confidence: number;
  }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return this.ruleBasedFix(expression, testResults);
    }

    // Get model context
    const model = await this.powerbiService.getModelInfo();
    const table = model.tables.find(t => t.name === tableName);

    const prompt = `Analyze this test failure and generate a fix:

## Original Request
Title: ${request.title}
Description: ${request.description}

## Applied DAX Expression
Table: ${tableName}
Measure: ${measureName}
Expression:
${expression}

## Test Results
${testResults.map(t => `- ${t.testName}: ${t.passed ? 'PASSED' : 'FAILED'} - ${t.message}`).join('\n')}

## Available Context
Table columns: ${table?.columns.map(c => c.name).join(', ') || 'unknown'}
Existing measures: ${table?.measures.map(m => `${m.name}: ${m.expression}`).join('\n') || 'none'}

Analyze the failure and provide a corrected expression.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: FAILURE_ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const result = JSON.parse(content.text);
        return {
          failureAnalysis: result.failureAnalysis,
          rootCause: result.rootCause,
          correctedExpression: result.correctedExpression,
          explanation: result.explanation,
          confidence: result.confidence,
        };
      }
    } catch (error) {
      console.error('Failure analysis failed:', error);
    }

    return this.ruleBasedFix(expression, testResults);
  }

  private ruleBasedFix(
    expression: string,
    testResults: TestResult[]
  ): {
    failureAnalysis: string;
    rootCause: string;
    correctedExpression: string | null;
    explanation: string;
    confidence: number;
  } {
    const failedTests = testResults.filter(t => !t.passed);
    const errorMessages = failedTests.map(t => t.message.toLowerCase()).join(' ');

    // Common fixes based on error patterns
    if (errorMessages.includes('divide by zero') || errorMessages.includes('division by zero')) {
      const fixed = this.wrapWithDivide(expression);
      return {
        failureAnalysis: 'Division by zero error detected',
        rootCause: 'Expression divides without handling zero denominator',
        correctedExpression: fixed,
        explanation: 'Wrapped division in DIVIDE() function with 0 as alternate result',
        confidence: 0.8,
      };
    }

    if (errorMessages.includes('column') && errorMessages.includes('not found')) {
      return {
        failureAnalysis: 'Column reference error',
        rootCause: 'Expression references a column that does not exist',
        correctedExpression: null,
        explanation: 'Cannot auto-fix - column name needs manual verification',
        confidence: 0.2,
      };
    }

    if (errorMessages.includes('circular dependency')) {
      return {
        failureAnalysis: 'Circular dependency detected',
        rootCause: 'Measure references itself or creates a dependency loop',
        correctedExpression: null,
        explanation: 'Cannot auto-fix circular dependencies - requires restructuring',
        confidence: 0.1,
      };
    }

    if (errorMessages.includes('blank') || errorMessages.includes('null')) {
      const fixed = this.handleBlanks(expression);
      return {
        failureAnalysis: 'Blank/null value handling issue',
        rootCause: 'Expression does not handle blank values properly',
        correctedExpression: fixed,
        explanation: 'Added BLANK handling with COALESCE or IF(ISBLANK())',
        confidence: 0.7,
      };
    }

    return {
      failureAnalysis: 'Unknown error pattern',
      rootCause: 'Could not determine root cause from test results',
      correctedExpression: null,
      explanation: 'Manual analysis required',
      confidence: 0.1,
    };
  }

  private wrapWithDivide(expression: string): string {
    // Find division operations and wrap with DIVIDE
    // Pattern: [something] / [something]
    const divisionPattern = /\[([^\]]+)\]\s*\/\s*\[([^\]]+)\]/g;
    return expression.replace(divisionPattern, 'DIVIDE([$1], [$2], 0)');
  }

  private handleBlanks(expression: string): string {
    // Wrap the entire expression in a blank check
    return `IF(ISBLANK(${expression}), 0, ${expression})`;
  }

  private async runTests(measureName: string): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Measure returns a value
    try {
      const result = await this.powerbiService.executeDAX(
        `EVALUATE ROW("Result", [${measureName}])`
      );
      tests.push({
        testName: 'Returns value',
        passed: result.rows.length > 0,
        message: result.rows.length > 0
          ? `Returned value: ${JSON.stringify(result.rows[0])}`
          : 'No rows returned',
        executedAt: new Date(),
      });
    } catch (error) {
      tests.push({
        testName: 'Returns value',
        passed: false,
        message: error instanceof Error ? error.message : 'Query failed',
        executedAt: new Date(),
      });
    }

    // Test 2: Measure works with filter context
    try {
      const result = await this.powerbiService.executeDAX(
        `EVALUATE SUMMARIZECOLUMNS(DimDate[Year], "Value", [${measureName}])`
      );
      tests.push({
        testName: 'Works with filter context',
        passed: result.rows.length > 0,
        message: `Returned ${result.rows.length} rows across date context`,
        executedAt: new Date(),
      });
    } catch (error) {
      tests.push({
        testName: 'Works with filter context',
        passed: false,
        message: error instanceof Error ? error.message : 'Filter context test failed',
        executedAt: new Date(),
      });
    }

    // Test 3: No errors in calculation
    try {
      const result = await this.powerbiService.executeDAX(
        `EVALUATE TOPN(10, ALL(FactSales), [${measureName}], DESC)`
      );
      tests.push({
        testName: 'Calculates without errors',
        passed: true,
        message: `Calculated for ${result.rows.length} rows`,
        executedAt: new Date(),
      });
    } catch (error) {
      tests.push({
        testName: 'Calculates without errors',
        passed: false,
        message: error instanceof Error ? error.message : 'Calculation error',
        executedAt: new Date(),
      });
    }

    return tests;
  }

  private async getOriginalExpression(tableName: string, measureName: string): Promise<string | null> {
    try {
      const measures = await this.powerbiService.getMeasures(tableName);
      const measure = measures.find(m => m.name === measureName);
      return measure?.expression || null;
    } catch {
      return null;
    }
  }

  private log(
    logs: ExecutionLogEntry[],
    action: string,
    details: string,
    status: 'success' | 'error' | 'info'
  ): void {
    logs.push({
      timestamp: new Date(),
      action,
      details,
      status,
    });
    console.log(`[SelfHealing] [${status.toUpperCase()}] ${action}: ${details}`);
  }
}
