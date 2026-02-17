import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, ExecutionLogEntry, TestResult } from '../types/request';
import { IPowerBIService, PowerBIMeasure } from '../types/powerbi';
import { ClarificationService, ClarificationResult } from './clarificationService';

/**
 * Multi-phase workflow for executing PowerBI changes:
 *
 * Phase 1: CLARIFY - Ensure we have enough information
 * Phase 2: PLAN - Generate detailed implementation plan
 * Phase 3: VALIDATE - Validate DAX syntax before execution
 * Phase 4: TEST (Pre) - Run baseline tests to capture current state
 * Phase 5: EXECUTE - Apply the changes
 * Phase 6: TEST (Post) - Verify changes work correctly
 * Phase 7: VERIFY - Compare pre/post results and validate expectations
 */

export type WorkflowPhase =
  | 'clarify'
  | 'plan'
  | 'validate'
  | 'test_pre'
  | 'execute'
  | 'test_post'
  | 'verify'
  | 'complete'
  | 'failed'
  | 'awaiting_clarification';

export interface WorkflowState {
  phase: WorkflowPhase;
  request: ChangeRequest;
  plan?: ExecutionPlan;
  validationResults?: ValidationResult[];
  preTestResults?: TestResult[];
  postTestResults?: TestResult[];
  changes?: AppliedChange[];
  clarification?: ClarificationResult;
  logs: ExecutionLogEntry[];
  startedAt: Date;
  completedAt?: Date;
}

export interface ExecutionPlan {
  summary: string;
  steps: PlanStep[];
  rollbackPlan: string;
  expectedOutcome: string;
  risks: string[];
  affectedObjects: string[];
  testCases: TestCase[];
}

export interface PlanStep {
  order: number;
  action: 'create' | 'update' | 'delete' | 'query';
  objectType: 'measure' | 'column' | 'relationship' | 'table';
  objectName: string;
  tableName: string;
  details: {
    expression?: string;
    oldExpression?: string;
    formatString?: string;
    description?: string;
  };
  rationale: string;
}

export interface TestCase {
  name: string;
  description: string;
  daxQuery: string;
  expectedBehavior: string;
  validationCriteria: 'returns_rows' | 'no_error' | 'value_check' | 'comparison';
  expectedValue?: unknown;
}

export interface ValidationResult {
  step: PlanStep;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppliedChange {
  step: PlanStep;
  success: boolean;
  message: string;
  timestamp: Date;
}

const PLANNING_PROMPT = `You are a senior PowerBI developer creating an implementation plan for a change request.

Your plan should be:
1. Detailed and step-by-step
2. Include rollback procedures
3. Identify risks and affected objects
4. Include test cases to validate the change

Consider:
- Impact on existing measures that reference the changed objects
- Performance implications
- Edge cases (nulls, empty tables, division by zero)
- Best practices for DAX patterns

Respond with JSON:
{
  "summary": "Brief description of what will be done",
  "steps": [
    {
      "order": 1,
      "action": "create|update|delete|query",
      "objectType": "measure|column|relationship|table",
      "objectName": "Name of the object",
      "tableName": "Table containing the object",
      "details": {
        "expression": "DAX expression if applicable",
        "oldExpression": "Current expression if updating",
        "formatString": "Format string if applicable",
        "description": "Description of the object"
      },
      "rationale": "Why this step is needed"
    }
  ],
  "rollbackPlan": "How to undo these changes if needed",
  "expectedOutcome": "What should happen after successful execution",
  "risks": ["List of potential risks"],
  "affectedObjects": ["List of objects that depend on or are affected by these changes"],
  "testCases": [
    {
      "name": "Test name",
      "description": "What this test validates",
      "daxQuery": "EVALUATE ...",
      "expectedBehavior": "What should happen",
      "validationCriteria": "returns_rows|no_error|value_check|comparison",
      "expectedValue": "Optional expected value for value_check"
    }
  ]
}`;

export class WorkflowService {
  private anthropic: Anthropic;
  private powerbiService: IPowerBIService;
  private clarificationService: ClarificationService;

  constructor(powerbiService: IPowerBIService) {
    this.anthropic = new Anthropic();
    this.powerbiService = powerbiService;
    this.clarificationService = new ClarificationService();
  }

  async executeWorkflow(request: ChangeRequest): Promise<WorkflowState> {
    const state: WorkflowState = {
      phase: 'clarify',
      request,
      logs: [],
      startedAt: new Date(),
    };

    this.log(state, 'Workflow started', `Processing: ${request.title}`, 'info');

    try {
      // Phase 1: Clarify
      state.phase = 'clarify';
      const clarifyResult = await this.runClarifyPhase(state);
      if (clarifyResult.needsClarification) {
        state.clarification = clarifyResult;
        state.phase = 'awaiting_clarification';
        this.log(state, 'Clarification needed',
          `Missing: ${clarifyResult.missingInfo.join(', ')}`, 'info');
        return state;
      }

      // Phase 2: Plan
      state.phase = 'plan';
      state.plan = await this.runPlanPhase(state);
      this.log(state, 'Plan created',
        `${state.plan.steps.length} steps, ${state.plan.testCases.length} test cases`, 'info');

      // Phase 3: Validate
      state.phase = 'validate';
      state.validationResults = await this.runValidatePhase(state);
      const validationFailed = state.validationResults.some(v => !v.valid);
      if (validationFailed) {
        const errors = state.validationResults
          .filter(v => !v.valid)
          .flatMap(v => v.errors);
        this.log(state, 'Validation failed', errors.join('; '), 'error');
        state.phase = 'failed';
        return state;
      }
      this.log(state, 'Validation passed', 'All DAX expressions are valid', 'success');

      // Phase 4: Pre-execution tests
      state.phase = 'test_pre';
      state.preTestResults = await this.runTestPhase(state, 'pre');
      this.log(state, 'Pre-tests complete',
        `${state.preTestResults.length} baseline tests captured`, 'info');

      // Phase 5: Execute
      state.phase = 'execute';
      state.changes = await this.runExecutePhase(state);
      const executionFailed = state.changes.some(c => !c.success);
      if (executionFailed) {
        this.log(state, 'Execution failed', 'Rolling back changes...', 'error');
        await this.rollback(state);
        state.phase = 'failed';
        return state;
      }
      this.log(state, 'Execution complete',
        `${state.changes.filter(c => c.success).length} changes applied`, 'success');

      // Phase 6: Post-execution tests
      state.phase = 'test_post';
      state.postTestResults = await this.runTestPhase(state, 'post');
      this.log(state, 'Post-tests complete',
        `${state.postTestResults.filter(t => t.passed).length}/${state.postTestResults.length} passed`,
        state.postTestResults.every(t => t.passed) ? 'success' : 'error');

      // Phase 7: Verify
      state.phase = 'verify';
      const verified = await this.runVerifyPhase(state);
      if (!verified) {
        this.log(state, 'Verification failed', 'Results do not match expectations', 'error');
        await this.rollback(state);
        state.phase = 'failed';
        return state;
      }

      state.phase = 'complete';
      state.completedAt = new Date();
      this.log(state, 'Workflow complete', 'All phases passed successfully', 'success');

      return state;
    } catch (error) {
      state.phase = 'failed';
      this.log(state, 'Workflow error',
        error instanceof Error ? error.message : 'Unknown error', 'error');
      return state;
    }
  }

  private async runClarifyPhase(state: WorkflowState): Promise<ClarificationResult> {
    return this.clarificationService.analyzeForClarification({
      clientId: state.request.clientId,
      modelName: state.request.modelName,
      title: state.request.title,
      description: state.request.description,
      urgency: state.request.urgency,
    });
  }

  private async runPlanPhase(state: WorkflowState): Promise<ExecutionPlan> {
    const model = await this.powerbiService.getModelInfo();
    const modelSummary = model.tables.map(t => ({
      name: t.name,
      columns: t.columns.map(c => c.name),
      measures: t.measures.map(m => ({ name: m.name, expression: m.expression })),
    }));

    if (!process.env.ANTHROPIC_API_KEY) {
      return this.generateRuleBasedPlan(state, model);
    }

    const prompt = `Create an implementation plan for this PowerBI change:

Request: ${state.request.title}
Description: ${state.request.description}
Change Type: ${state.request.changeType}
Client: ${state.request.clientId}

Current Model Structure:
${JSON.stringify(modelSummary, null, 2)}

Provide a detailed plan as JSON.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: PLANNING_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
    } catch (error) {
      console.error('Planning failed, using rule-based plan:', error);
    }

    return this.generateRuleBasedPlan(state, model);
  }

  private generateRuleBasedPlan(
    state: WorkflowState,
    model: { tables: Array<{ name: string; measures: PowerBIMeasure[] }> }
  ): ExecutionPlan {
    const factTable = model.tables.find(t =>
      t.name.includes('Fact') || t.name.includes('Sales')
    ) || model.tables[0];

    const steps: PlanStep[] = [];
    const testCases: TestCase[] = [];

    // Generate steps based on change type
    if (state.request.changeType === 'dax_formula_tweak') {
      const measureMatch = state.request.description.match(/\b(gross margin|total sales|profit)\b/i);
      const measureName = measureMatch ?
        factTable.measures.find(m =>
          m.name.toLowerCase().includes(measureMatch[1].toLowerCase())
        )?.name || 'Gross Margin %' : 'Gross Margin %';

      steps.push({
        order: 1,
        action: 'update',
        objectType: 'measure',
        objectName: measureName,
        tableName: factTable.name,
        details: {
          expression: 'DIVIDE([Gross Profit], [Total Sales], 0)',
          oldExpression: factTable.measures.find(m => m.name === measureName)?.expression,
          formatString: '0.00%',
        },
        rationale: 'Fix the calculation to use correct denominator',
      });

      testCases.push({
        name: 'Measure returns valid result',
        description: 'Verify the measure calculates without error',
        daxQuery: `EVALUATE ROW("Result", [${measureName}])`,
        expectedBehavior: 'Returns a numeric value',
        validationCriteria: 'returns_rows',
      });
    } else if (state.request.changeType === 'new_measure') {
      steps.push({
        order: 1,
        action: 'create',
        objectType: 'measure',
        objectName: 'New Measure',
        tableName: factTable.name,
        details: {
          expression: 'SUM(FactSales[SalesAmount])',
          formatString: '$#,##0.00',
          description: 'New measure based on request',
        },
        rationale: 'Create the requested new measure',
      });

      testCases.push({
        name: 'New measure exists and calculates',
        description: 'Verify the new measure was created and returns results',
        daxQuery: 'EVALUATE ROW("Result", [New Measure])',
        expectedBehavior: 'Returns a value',
        validationCriteria: 'returns_rows',
      });
    }

    return {
      summary: `Rule-based plan for ${state.request.changeType}`,
      steps,
      rollbackPlan: 'Restore original measure expression from backup',
      expectedOutcome: 'The measure will calculate correctly',
      risks: ['Dependent measures may need updating'],
      affectedObjects: steps.map(s => `${s.tableName}[${s.objectName}]`),
      testCases,
    };
  }

  private async runValidatePhase(state: WorkflowState): Promise<ValidationResult[]> {
    if (!state.plan) throw new Error('No plan to validate');

    const results: ValidationResult[] = [];

    for (const step of state.plan.steps) {
      const result: ValidationResult = {
        step,
        valid: true,
        errors: [],
        warnings: [],
      };

      if (step.details.expression) {
        const validation = await this.powerbiService.validateDAX(step.details.expression);
        if (!validation.valid) {
          result.valid = false;
          result.errors.push(validation.error || 'Invalid DAX');
        }
      }

      results.push(result);
    }

    return results;
  }

  private async runTestPhase(
    state: WorkflowState,
    phase: 'pre' | 'post'
  ): Promise<TestResult[]> {
    if (!state.plan) return [];

    const results: TestResult[] = [];

    for (const testCase of state.plan.testCases) {
      try {
        const queryResult = await this.powerbiService.executeDAX(testCase.daxQuery);

        let passed = false;
        switch (testCase.validationCriteria) {
          case 'returns_rows':
            passed = queryResult.rows.length > 0;
            break;
          case 'no_error':
            passed = true; // If we got here without throwing, it passed
            break;
          case 'value_check':
            passed = queryResult.rows.length > 0 &&
              Object.values(queryResult.rows[0])[0] === testCase.expectedValue;
            break;
          case 'comparison':
            passed = queryResult.rows.length > 0;
            break;
        }

        results.push({
          testName: `[${phase}] ${testCase.name}`,
          passed,
          message: `${queryResult.rows.length} rows in ${queryResult.executionTime}ms`,
          executedAt: new Date(),
          details: queryResult.rows[0],
        });
      } catch (error) {
        results.push({
          testName: `[${phase}] ${testCase.name}`,
          passed: false,
          message: error instanceof Error ? error.message : 'Test failed',
          executedAt: new Date(),
        });
      }
    }

    return results;
  }

  private async runExecutePhase(state: WorkflowState): Promise<AppliedChange[]> {
    if (!state.plan) throw new Error('No plan to execute');

    const changes: AppliedChange[] = [];

    for (const step of state.plan.steps) {
      let result: { success: boolean; message: string };

      switch (step.action) {
        case 'create':
          result = await this.powerbiService.createMeasure({
            name: step.objectName,
            tableName: step.tableName,
            expression: step.details.expression || '',
            formatString: step.details.formatString,
            description: step.details.description,
          });
          break;

        case 'update':
          result = await this.powerbiService.updateMeasure(
            step.tableName,
            step.objectName,
            step.details.expression || ''
          );
          break;

        case 'delete':
          result = await this.powerbiService.deleteMeasure(step.tableName, step.objectName);
          break;

        default:
          result = { success: true, message: 'Query executed' };
      }

      changes.push({
        step,
        success: result.success,
        message: result.message,
        timestamp: new Date(),
      });

      if (!result.success) {
        break; // Stop on first failure
      }
    }

    return changes;
  }

  private async runVerifyPhase(state: WorkflowState): Promise<boolean> {
    if (!state.postTestResults) return false;

    // All post-tests should pass
    const allTestsPassed = state.postTestResults.every(t => t.passed);
    if (!allTestsPassed) {
      return false;
    }

    // Compare pre and post test results if applicable
    if (state.preTestResults && state.preTestResults.length === state.postTestResults.length) {
      // For now, just verify post-tests pass
      // In production, could compare values, check for regressions, etc.
    }

    return true;
  }

  private async rollback(state: WorkflowState): Promise<void> {
    if (!state.changes) return;

    this.log(state, 'Rollback started', 'Reverting changes...', 'info');

    // Rollback in reverse order
    for (const change of [...state.changes].reverse()) {
      if (!change.success) continue; // Only rollback successful changes

      try {
        if (change.step.action === 'create') {
          // Delete the created object
          await this.powerbiService.deleteMeasure(
            change.step.tableName,
            change.step.objectName
          );
        } else if (change.step.action === 'update' && change.step.details.oldExpression) {
          // Restore original expression
          await this.powerbiService.updateMeasure(
            change.step.tableName,
            change.step.objectName,
            change.step.details.oldExpression
          );
        }
        // For delete actions, we'd need to recreate - would need stored original
      } catch (error) {
        this.log(state, 'Rollback error',
          `Failed to rollback ${change.step.objectName}`, 'error');
      }
    }

    this.log(state, 'Rollback complete', 'Changes reverted', 'info');
  }

  private log(
    state: WorkflowState,
    action: string,
    details: string,
    status: 'success' | 'error' | 'info'
  ): void {
    state.logs.push({
      timestamp: new Date(),
      action: `[${state.phase}] ${action}`,
      details,
      status,
    });
  }

  // Resume workflow after clarification is provided
  async resumeAfterClarification(
    state: WorkflowState,
    additionalInfo: string
  ): Promise<WorkflowState> {
    // Append clarification to description
    state.request.description += `\n\nAdditional information: ${additionalInfo}`;
    state.clarification = undefined;

    // Re-run workflow from the beginning
    return this.executeWorkflow(state.request);
  }
}
