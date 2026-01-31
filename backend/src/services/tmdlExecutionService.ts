/**
 * TMDL Execution Service
 *
 * Executes change requests by modifying TMDL files directly.
 * This enables proper git-based version control and PR creation.
 */

import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { PowerBIMcpService } from './powerbiMcpService';
import { PowerBIModel, PowerBIMeasure } from '../types/powerbi';
import { ChangeRequest } from '../types/request';

export interface TmdlExecutionResult {
  success: boolean;
  changes: TmdlChange[];
  error?: string;
}

export interface TmdlChange {
  type: 'create' | 'update' | 'delete';
  tableName: string;
  measureName: string;
  expression?: string;
  formatString?: string;
  description?: string;
  previousExpression?: string;
}

export class TmdlExecutionService {
  private mcpService: PowerBIMcpService;
  private anthropic: Anthropic | null = null;
  private modelsPath: string;

  constructor(modelsPath: string, mcpServerPath: string) {
    this.mcpService = new PowerBIMcpService(mcpServerPath);
    this.modelsPath = modelsPath;

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }
  }

  /**
   * Execute a change request using PowerBI MCPs
   */
  async executeRequest(
    request: ChangeRequest,
    pbipPath: string
  ): Promise<TmdlExecutionResult> {
    try {
      // Connect to MCP service
      const connected = await this.mcpService.connect();
      if (!connected) {
        throw new Error('Failed to connect to PowerBI MCP service');
      }

      // Get model info using MCP
      const model = await this.mcpService.getModelInfo();
      console.log(`[MCP] Connected to model: ${model.name}`);
      console.log(`[MCP] Tables: ${model.tables.map(t => t.name).join(', ')}`);

      // Get existing measures for context
      const existingMeasures = await this.mcpService.getMeasures();
      console.log(`[MCP] Found ${existingMeasures.length} existing measures`);

      // Generate changes using Claude
      const changes = await this.generateChanges(request, model, existingMeasures);

      if (!changes || changes.length === 0) {
        return {
          success: false,
          changes: [],
          error: 'No changes generated',
        };
      }

      // Apply changes using MCP
      for (const change of changes) {
        await this.applyChangeMcp(change);
      }

      return {
        success: true,
        changes,
      };
    } catch (error) {
      console.error('[MCP] Execution error:', error);
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Disconnect from MCP
      this.mcpService.disconnect();
    }
  }

  /**
   * Load model context documentation if it exists
   */
  private async loadModelContext(projectPath: string): Promise<string> {
    const modelDir = path.dirname(projectPath);
    const contextPath = path.join(modelDir, 'MODEL_CONTEXT.md');

    try {
      const fs = await import('fs');
      if (fs.existsSync(contextPath)) {
        return await fs.promises.readFile(contextPath, 'utf-8');
      }
    } catch (error) {
      console.log('[TMDL] No model context file found');
    }
    return '';
  }

  /**
   * Generate changes using Claude
   */
  private async generateChanges(
    request: ChangeRequest,
    model: PowerBIModel,
    existingMeasures: PowerBIMeasure[]
  ): Promise<TmdlChange[]> {
    if (!this.anthropic) {
      // Fallback to rule-based generation
      return this.generateRuleBasedChanges(request, model, existingMeasures);
    }

    // Build context about existing measures
    const measuresContext = existingMeasures
      .slice(0, 50) // Limit to avoid token overflow
      .map(m => `- ${m.name}: ${m.expression}`)
      .join('\n');

    // Get tables that contain measures
    const measureTables = model.tables.filter(t => t.measures.length > 0).map(t => t.name);

    const prompt = `You are a PowerBI DAX expert. Analyze this change request and generate the required measure changes.

## Request
Title: ${request.title}
Description: ${request.description}
Change Type: ${request.changeType}

## Existing Model Context
Tables with measures: ${measureTables.join(', ')}

Existing measures (sample):
${measuresContext}

## Instructions
Generate a JSON response with the changes needed. Each change should be one of:
- create: Add a new measure
- update: Modify an existing measure
- delete: Remove a measure

For new measures, use the most appropriate existing table (typically "${measureTables[0] || 'Measures'}").

Response format (JSON only, no markdown):
{
  "changes": [
    {
      "type": "create",
      "tableName": "Table Name",
      "measureName": "Measure Name",
      "expression": "DAX Expression",
      "formatString": "#,##0.00",
      "description": "What this measure does"
    }
  ],
  "reasoning": "Brief explanation of the changes"
}

Important:
- Use existing measures in expressions where appropriate (e.g., [Net Sales], [Units Sold])
- Follow DAX best practices
- Include proper format strings
- Keep expressions clean and readable`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON response (handle markdown code blocks)
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const result = JSON.parse(jsonText);
      console.log(`[TMDL] Claude reasoning: ${result.reasoning}`);

      return result.changes || [];
    } catch (error) {
      console.error('[TMDL] Claude generation failed:', error);
      return this.generateRuleBasedChanges(request, model, existingMeasures);
    }
  }

  /**
   * Rule-based fallback for change generation
   */
  private generateRuleBasedChanges(
    request: ChangeRequest,
    model: PowerBIModel,
    existingMeasures: PowerBIMeasure[]
  ): TmdlChange[] {
    // Find tables that have measures
    const measureTables = model.tables.filter(t => t.measures.length > 0).map(t => t.name);
    const targetTable = measureTables[0] || model.tables[0]?.name || 'Measures';

    // Simple pattern matching for common requests
    const description = request.description.toLowerCase();

    if (request.changeType === 'new_measure') {
      // Generate a basic measure based on the request
      let measureName = request.title.replace(/^add\s+/i, '').replace(/\s+measure$/i, '');
      let expression = '0'; // Placeholder
      let formatString = '#,##0.00';

      // Pattern matching for common measure types
      if (description.includes('year-over-year') || description.includes('yoy')) {
        measureName = 'YoY Growth %';
        expression = 'DIVIDE([Net Sales] - CALCULATE([Net Sales], SAMEPERIODLASTYEAR(\'Calendar\'[Date])), CALCULATE([Net Sales], SAMEPERIODLASTYEAR(\'Calendar\'[Date])), 0)';
        formatString = '0.00%';
      } else if (description.includes('average') && description.includes('price')) {
        measureName = 'Average Price';
        expression = 'DIVIDE([Net Sales], [Units Sold], 0)';
        formatString = '$#,##0.00';
      } else if (description.includes('profit margin')) {
        measureName = 'Profit Margin %';
        expression = 'DIVIDE([Net Sales] - [Returns], [Net Sales], 0)';
        formatString = '0.00%';
      }

      return [{
        type: 'create',
        tableName: targetTable,
        measureName,
        expression,
        formatString,
        description: request.description,
      }];
    }

    return [];
  }

  /**
   * Apply a single change using PowerBI MCPs
   */
  private async applyChangeMcp(change: TmdlChange): Promise<void> {
    console.log(`[MCP] Applying ${change.type}: ${change.measureName} in ${change.tableName}`);

    switch (change.type) {
      case 'create':
        const createResult = await this.mcpService.createMeasure({
          name: change.measureName,
          tableName: change.tableName,
          expression: change.expression || '',
          formatString: change.formatString,
          description: change.description,
          isHidden: false,
        });
        if (!createResult.success) {
          throw new Error(`Failed to create measure: ${createResult.message}`);
        }
        break;

      case 'update':
        // Get previous expression for tracking
        const existingMeasures = await this.mcpService.getMeasures(change.tableName);
        const existing = existingMeasures.find(m => m.name === change.measureName);
        if (existing) {
          change.previousExpression = existing.expression;
        }

        const updateResult = await this.mcpService.updateMeasure(
          change.tableName,
          change.measureName,
          change.expression || ''
        );
        if (!updateResult.success) {
          throw new Error(`Failed to update measure: ${updateResult.message}`);
        }
        break;

      case 'delete':
        const deleteResult = await this.mcpService.deleteMeasure(
          change.tableName,
          change.measureName
        );
        if (!deleteResult.success) {
          throw new Error(`Failed to delete measure: ${deleteResult.message}`);
        }
        break;
    }
  }

  /**
   * Get the files changed for git staging (deprecated - MCPs handle file changes automatically)
   */
  getChangedFiles(modelPath: string, changes: TmdlChange[]): string[] {
    // Deprecated: MCPs handle file changes automatically
    // Git will detect the changes made by the MCP
    return [];
  }
}
