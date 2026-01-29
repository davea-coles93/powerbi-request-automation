/**
 * TMDL Execution Service
 *
 * Executes change requests by modifying TMDL files directly.
 * This enables proper git-based version control and PR creation.
 */

import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { TmdlService, TmdlProject, TmdlMeasure } from './tmdlService';
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
  private tmdlService: TmdlService;
  private anthropic: Anthropic | null = null;
  private modelsPath: string;

  constructor(modelsPath: string) {
    this.tmdlService = new TmdlService(modelsPath);
    this.modelsPath = modelsPath;

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }
  }

  /**
   * Execute a change request against TMDL files
   */
  async executeRequest(
    request: ChangeRequest,
    pbipPath: string
  ): Promise<TmdlExecutionResult> {
    try {
      // Load the project
      const fullPath = path.join(this.modelsPath, pbipPath);
      const project = await this.tmdlService.loadProject(fullPath);

      console.log(`[TMDL] Loaded project: ${project.model.name}`);
      console.log(`[TMDL] Tables: ${project.model.tables.map(t => t.name).join(', ')}`);

      // Get existing measures for context
      const existingMeasures = this.tmdlService.getMeasures(project);
      console.log(`[TMDL] Found ${existingMeasures.length} existing measures`);

      // Generate changes using Claude
      const changes = await this.generateChanges(request, project, existingMeasures);

      if (!changes || changes.length === 0) {
        return {
          success: false,
          changes: [],
          error: 'No changes generated',
        };
      }

      // Apply changes
      for (const change of changes) {
        await this.applyChange(project, change);
      }

      return {
        success: true,
        changes,
      };
    } catch (error) {
      console.error('[TMDL] Execution error:', error);
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
    project: TmdlProject,
    existingMeasures: TmdlMeasure[]
  ): Promise<TmdlChange[]> {
    if (!this.anthropic) {
      // Fallback to rule-based generation
      return this.generateRuleBasedChanges(request, project, existingMeasures);
    }

    // Load model context documentation
    const modelContext = await this.loadModelContext(project.projectPath);

    // Build context about existing measures
    const measuresContext = existingMeasures
      .slice(0, 50) // Limit to avoid token overflow
      .map(m => `- ${m.name}: ${m.expression}`)
      .join('\n');

    const measureTables = this.tmdlService.getMeasureTables(project);

    const prompt = `You are a PowerBI DAX expert. Analyze this change request and generate the required measure changes.

## Request
Title: ${request.title}
Description: ${request.description}
Change Type: ${request.changeType}

${modelContext ? `## Model Documentation\n${modelContext}\n` : ''}

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
      return this.generateRuleBasedChanges(request, project, existingMeasures);
    }
  }

  /**
   * Rule-based fallback for change generation
   */
  private generateRuleBasedChanges(
    request: ChangeRequest,
    project: TmdlProject,
    existingMeasures: TmdlMeasure[]
  ): TmdlChange[] {
    const measureTables = this.tmdlService.getMeasureTables(project);
    const targetTable = measureTables[0] || 'Measures';

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
   * Apply a single change to the project
   */
  private async applyChange(project: TmdlProject, change: TmdlChange): Promise<void> {
    console.log(`[TMDL] Applying ${change.type}: ${change.measureName} in ${change.tableName}`);

    switch (change.type) {
      case 'create':
        await this.tmdlService.addMeasure(project, change.tableName, {
          name: change.measureName,
          expression: change.expression || '',
          formatString: change.formatString,
          description: change.description,
        });
        break;

      case 'update':
        // Store previous expression for diff
        const existing = this.tmdlService.findMeasure(project, change.measureName);
        if (existing) {
          change.previousExpression = existing.measure.expression;
        }
        await this.tmdlService.updateMeasure(project, change.measureName, {
          expression: change.expression,
          formatString: change.formatString,
          description: change.description,
        });
        break;

      case 'delete':
        await this.tmdlService.deleteMeasure(project, change.measureName);
        break;
    }
  }

  /**
   * Get the files changed for git staging
   */
  getChangedFiles(project: TmdlProject, changes: TmdlChange[]): string[] {
    const changedTables = new Set(changes.map(c => c.tableName));
    const files: string[] = [];

    for (const tableName of changedTables) {
      const relativePath = path.join(
        path.relative(this.modelsPath, project.semanticModelPath),
        'definition',
        'tables',
        `${tableName}.tmdl`
      );
      files.push(relativePath);
    }

    return files;
  }
}
