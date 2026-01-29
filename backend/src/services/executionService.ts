import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, ExecutionLogEntry, TestResult } from '../types/request';
import { IPowerBIService, PowerBIMeasure } from '../types/powerbi';
import { SelfHealingService } from './selfHealingService';

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
  private selfHealingService: SelfHealingService;

  constructor(powerbiService: IPowerBIService) {
    this.anthropic = new Anthropic();
    this.powerbiService = powerbiService;
    this.selfHealingService = new SelfHealingService(powerbiService);
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

      // If tests failed, try self-healing
      if (!allTestsPassed && executedActions.length > 0) {
        this.log(logs, 'Tests failed', 'Initiating self-healing...', 'info');

        // Find the action that likely caused the failure
        const lastAction = executedActions[executedActions.length - 1];
        if (lastAction.type === 'update_measure' || lastAction.type === 'create_measure') {
          const healingResult = await this.selfHealingService.executeWithSelfHealing(
            request,
            lastAction.expression || '',
            lastAction.tableName || '',
            lastAction.measureName || ''
          );

          // Add healing logs
          logs.push(...healingResult.logs);

          if (healingResult.success) {
            this.log(logs, 'Self-healing successful',
              `Fixed after ${healingResult.attempts.length} attempt(s)`, 'success');

            // Update action with final expression
            lastAction.expression = healingResult.finalExpression;
            lastAction.result = { success: true, message: 'Fixed via self-healing' };

            return {
              success: true,
              actions: executedActions,
              testResults: healingResult.testResults,
              logs,
            };
          } else {
            this.log(logs, 'Self-healing failed',
              `Could not fix after ${healingResult.attempts.length} attempts`, 'error');

            // Log each attempt's analysis
            healingResult.attempts.forEach((attempt, i) => {
              if (attempt.failureAnalysis) {
                this.log(logs, `Attempt ${i + 1} analysis`, attempt.failureAnalysis, 'info');
              }
            });
          }
        }
      }

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
    // Use rule-based plan if no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No API key - using rule-based execution plan');
      return this.generateRuleBasedPlan(request, model);
    }

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

    try {
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

      // Strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Claude API failed, using rule-based plan:', error);
      return this.generateRuleBasedPlan(request, model);
    }
  }

  private generateRuleBasedPlan(
    request: ChangeRequest,
    model: { name: string; tables: Array<{ name: string; measures: PowerBIMeasure[] }> }
  ): { actions: ExecutionAction[]; explanation: string; testQueries: string[] } {
    const desc = request.description.toLowerCase();
    const actions: ExecutionAction[] = [];

    // Find a table with measures (prefer Analysis DAX or tables with many measures)
    const tablesWithMeasures = model.tables.filter(t => t.measures.length > 0);
    const measureTable = tablesWithMeasures.find(t => t.name.includes('Analysis') || t.name.includes('DAX'))
      || tablesWithMeasures.find(t => t.name.includes('Fact') || t.name.includes('Sales'))
      || tablesWithMeasures[0]
      || model.tables[0];

    // Get all available measures for reference
    const allMeasures = model.tables.flatMap(t => t.measures);

    // Try to find relevant measures mentioned in description
    const findMeasure = (keywords: string[]): PowerBIMeasure | undefined => {
      return allMeasures.find(m =>
        keywords.some(k => m.name.toLowerCase().includes(k.toLowerCase()))
      );
    };

    // Look for key measures that might be referenced
    const netSalesMeasure = findMeasure(['net sales', 'total sales', 'sales']);
    const returnsMeasure = findMeasure(['returns', 'return']);
    const profitMeasure = findMeasure(['profit', 'margin']);

    if (request.changeType === 'dax_formula_tweak') {
      // Find the measure being modified
      const measureWords = desc.match(/\b([\w\s]+(?:measure|%|margin|rate|ratio))\b/gi) || [];
      const targetMeasure = allMeasures.find(m =>
        measureWords.some(w => m.name.toLowerCase().includes(w.toLowerCase().trim()))
      );

      if (targetMeasure) {
        let newExpression = targetMeasure.expression;

        // Try to understand what change is needed
        if (desc.includes('divide') && netSalesMeasure) {
          newExpression = `DIVIDE(${targetMeasure.expression}, [${netSalesMeasure.name}], 0)`;
        }

        actions.push({
          type: 'update_measure',
          tableName: targetMeasure.tableName || measureTable.name,
          measureName: targetMeasure.name,
          expression: newExpression,
          description: `Updated based on request`,
        });
      }
    } else if (request.changeType === 'new_measure') {
      // Determine what new measure to create based on description
      let measureName = 'New Measure';
      let expression = '';
      let formatString = '';

      if (desc.includes('margin') || desc.includes('profit')) {
        measureName = 'Profit Margin %';
        if (netSalesMeasure && returnsMeasure) {
          expression = `DIVIDE([${netSalesMeasure.name}] - [${returnsMeasure.name}], [${netSalesMeasure.name}], 0)`;
        } else if (netSalesMeasure) {
          expression = `DIVIDE([${netSalesMeasure.name}], [${netSalesMeasure.name}], 0)`;
        }
        formatString = '0.00%';
      } else if (desc.includes('year') || desc.includes('yoy')) {
        measureName = 'YoY Sales %';
        const salesMeasure = netSalesMeasure || allMeasures[0];
        if (salesMeasure) {
          expression = `
VAR CurrentSales = [${salesMeasure.name}]
VAR PreviousSales = CALCULATE([${salesMeasure.name}], SAMEPERIODLASTYEAR('Calendar'[Date]))
RETURN DIVIDE(CurrentSales - PreviousSales, PreviousSales, 0)`;
        }
        formatString = '0.00%';
      } else if (desc.includes('average') || desc.includes('avg')) {
        measureName = 'Average Value';
        const baseMeasure = netSalesMeasure || allMeasures[0];
        if (baseMeasure) {
          expression = `AVERAGEX(ALL('Calendar'[Date]), [${baseMeasure.name}])`;
        }
        formatString = '#,##0.00';
      }

      // Extract custom measure name if specified
      const nameMatch = desc.match(/called\s+["']?([^"'\n]+)["']?/i)
        || desc.match(/named?\s+["']?([^"'\n]+)["']?/i);
      if (nameMatch) {
        measureName = nameMatch[1].trim();
      }

      if (expression) {
        actions.push({
          type: 'create_measure',
          tableName: measureTable.name,
          measureName,
          expression,
          formatString,
          description: `Created based on: ${request.description.substring(0, 100)}`,
        });
      }
    }

    // If no specific actions identified, try to create something sensible
    if (actions.length === 0 && netSalesMeasure) {
      actions.push({
        type: 'create_measure',
        tableName: measureTable.name,
        measureName: 'Custom Measure',
        expression: `[${netSalesMeasure.name}]`,
        description: 'Placeholder measure - review needed',
      });
    }

    const testMeasure = actions[0]?.measureName || netSalesMeasure?.name || 'Net Sales';
    return {
      actions,
      explanation: `Rule-based implementation for ${request.changeType}. Generated ${actions.length} action(s).`,
      testQueries: [
        `EVALUATE ROW("Result", [${testMeasure}])`,
      ],
    };
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
