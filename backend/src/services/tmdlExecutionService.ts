/**
 * TMDL Execution Service
 *
 * Executes change requests by modifying TMDL files directly.
 * This enables proper git-based version control and PR creation.
 */

import * as path from 'path';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
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
  private anthropic: Anthropic | null = null;
  private modelsPath: string;
  private tmslExecutorPath: string;

  constructor(modelsPath: string, tmslExecutorPath: string) {
    this.modelsPath = modelsPath;
    this.tmslExecutorPath = tmslExecutorPath;

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }
  }

  /**
   * Execute a change request using TOM-based TMDL manipulation
   */
  async executeRequest(
    request: ChangeRequest,
    pbipPath: string
  ): Promise<TmdlExecutionResult> {
    try {
      const fullPath = path.join(this.modelsPath, pbipPath);
      console.log(`[TOM] Processing model: ${fullPath}`);

      // For now, use simple rule-based generation
      // In the future, we can use Claude to generate better measures
      const changes = this.generateSimpleChanges(request);

      if (!changes || changes.length === 0) {
        return {
          success: false,
          changes: [],
          error: 'No changes generated',
        };
      }

      // Apply changes using .NET TmslExecutor tool
      for (const change of changes) {
        await this.applyChangeTom(fullPath, change);
      }

      return {
        success: true,
        changes,
      };
    } catch (error) {
      console.error('[TOM] Execution error:', error);
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply a single change using .NET TmslExecutor tool
   */
  private async applyChangeTom(modelPath: string, change: TmdlChange): Promise<void> {
    console.log(`[TOM] Applying ${change.type}: ${change.measureName} in ${change.tableName}`);

    const measureData = JSON.stringify({
      table: change.tableName,
      name: change.measureName,
      expression: change.expression,
      formatString: change.formatString,
      description: change.description,
    });

    const command = `dotnet "${this.tmslExecutorPath}" ${change.type}-measure "${modelPath}" '${measureData.replace(/'/g, "\\'")}'`;

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: path.dirname(this.tmslExecutorPath),
      });
      console.log(`[TOM] ${output}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to ${change.type} measure: ${errorMessage}`);
    }
  }

  /**
   * Simple rule-based change generation (temporary - will be replaced with Claude)
   */
  private generateSimpleChanges(request: ChangeRequest): TmdlChange[] {
    const description = request.description.toLowerCase();

    // Simple pattern: create YTD measure
    if (description.includes('year-to-date') || description.includes('ytd')) {
      return [
        {
          type: 'create',
          tableName: 'Sales',
          measureName: 'Sales Amount YTD',
          expression: 'TOTALYTD(SUM(Sales[SalesAmount]), \'Date\'[Date])',
          formatString: '$#,##0',
          description: 'Year-to-date sales amount',
        },
      ];
    }

    return [];
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
