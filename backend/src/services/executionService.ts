import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, ExecutionLogEntry, TestResult } from '../types/request';
import { IPowerBIService, PowerBIMeasure } from '../types/powerbi';

const EXECUTION_SYSTEM_PROMPT = `You are a PowerBI DAX expert implementing changes to semantic models.

You have access to a PowerBI model and need to implement the requested changes.
When implementing changes:
1. Analyze the current model structure provided
2. Write valid DAX expressions
3. Follow PowerBI best practices
4. Consider performance implications
5. Ensure compatibility with existing measures

When creating/modifying measures:
- Use proper DAX functions
- Handle edge cases (division by zero, empty tables, etc.)
- Use appropriate format strings
- Add meaningful names

Respond with JSON containing the actions to take:
{
  "actions": [
    {
      "type": "create_measure" | "update_measure" | "delete_measure" | "execute_dax",
      "tableName": "string",
      "measureName": "string",
      "expression": "DAX expression",
      "formatString": "$#,##0.00 or 0.00% etc",
      "description": "What this measure does"
    }
  ],
  "explanation": "Brief explanation of the implementation",
  "testQueries": ["DAX queries to validate the changes"]
}`;

export interface ExecutionResult {
  success: boolean;
  actions: ExecutionAction[];
  testResults: TestResult[];
  logs: ExecutionLogEntry[];
}

export interface ExecutionAction {
  type: 'create_measure' | 'update_measure' | 'delete_measure' | 'execute_dax';
  tableName?: string;
  measureName?: string;
  expression?: string;
  formatString?: string;
  description?: string;
  result?: { success: boolean; message: string };
}

export class ExecutionService {
  private anthropic: Anthropic;
  private powerbiService: IPowerBIService;

  constructor(powerbiService: IPowerBIService) {
    this.anthropic = new Anthropic();
    this.powerbiService = powerbiService;
  }

  async executeRequest(request: ChangeRequest): Promise<ExecutionResult> {
    const logs: ExecutionLogEntry[] = [];
    const testResults: TestResult[] = [];

    this.log(logs, 'Starting execution', `Processing request: ${request.title}`, 'info');

    try {
      // Get current model state
      const model = await this.powerbiService.getModelInfo();
      this.log(logs, 'Model loaded', `Model: ${model.name}, Tables: ${model.tables.length}`, 'info');

      // Generate implementation plan using Claude
      const plan = await this.generateImplementationPlan(request, model);
      this.log(logs, 'Plan generated', plan.explanation, 'info');

      // Execute actions
      const executedActions: ExecutionAction[] = [];
      for (const action of plan.actions) {
        const result = await this.executeAction(action);
        executedActions.push({ ...action, result });
        this.log(
          logs,
          `${action.type}: ${action.measureName || 'N/A'}`,
          result.message,
          result.success ? 'success' : 'error'
        );

        if (!result.success) {
          return {
            success: false,
            actions: executedActions,
            testResults,
            logs,
          };
        }
      }

      // Run validation tests
      this.log(logs, 'Running tests', 'Validating changes...', 'info');
      for (const testQuery of plan.testQueries) {
        const testResult = await this.runTest(testQuery);
        testResults.push(testResult);
        this.log(
          logs,
          `Test: ${testResult.testName}`,
          testResult.message,
          testResult.passed ? 'success' : 'error'
        );
      }

      const allTestsPassed = testResults.every(t => t.passed);
      return {
        success: allTestsPassed,
        actions: executedActions,
        testResults,
        logs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(logs, 'Execution failed', errorMessage, 'error');
      return {
        success: false,
        actions: [],
        testResults,
        logs,
      };
    }
  }

  private async generateImplementationPlan(
    request: ChangeRequest,
    model: { name: string; tables: Array<{ name: string; measures: PowerBIMeasure[] }> }
  ): Promise<{ actions: ExecutionAction[]; explanation: string; testQueries: string[] }> {
    const modelSummary = model.tables.map(t => ({
      name: t.name,
      measures: t.measures.map(m => ({ name: m.name, expression: m.expression })),
    }));

    const prompt = `Implement this PowerBI change:

Request: ${request.title}
Description: ${request.description}
Change Type: ${request.changeType}

Current Model Structure:
${JSON.stringify(modelSummary, null, 2)}

Provide the implementation as JSON with actions and test queries.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: EXECUTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  }

  private async executeAction(
    action: ExecutionAction
  ): Promise<{ success: boolean; message: string }> {
    switch (action.type) {
      case 'create_measure':
        if (!action.tableName || !action.measureName || !action.expression) {
          return { success: false, message: 'Missing required fields for create_measure' };
        }
        return await this.powerbiService.createMeasure({
          name: action.measureName,
          tableName: action.tableName,
          expression: action.expression,
          formatString: action.formatString,
          description: action.description,
        });

      case 'update_measure':
        if (!action.tableName || !action.measureName || !action.expression) {
          return { success: false, message: 'Missing required fields for update_measure' };
        }
        return await this.powerbiService.updateMeasure(
          action.tableName,
          action.measureName,
          action.expression
        );

      case 'delete_measure':
        if (!action.tableName || !action.measureName) {
          return { success: false, message: 'Missing required fields for delete_measure' };
        }
        return await this.powerbiService.deleteMeasure(action.tableName, action.measureName);

      case 'execute_dax':
        if (!action.expression) {
          return { success: false, message: 'Missing DAX expression' };
        }
        try {
          await this.powerbiService.executeDAX(action.expression);
          return { success: true, message: 'DAX executed successfully' };
        } catch {
          return { success: false, message: 'DAX execution failed' };
        }

      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  }

  private async runTest(testQuery: string): Promise<TestResult> {
    try {
      const result = await this.powerbiService.executeDAX(testQuery);
      return {
        testName: testQuery.substring(0, 50) + '...',
        passed: result.rows.length > 0,
        message: `Returned ${result.rows.length} rows in ${result.executionTime}ms`,
        executedAt: new Date(),
      };
    } catch (error) {
      return {
        testName: testQuery.substring(0, 50) + '...',
        passed: false,
        message: error instanceof Error ? error.message : 'Test failed',
        executedAt: new Date(),
      };
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
  }
}
