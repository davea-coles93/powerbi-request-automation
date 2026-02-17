/**
 * TMDL Execution Service
 *
 * Executes change requests by modifying TMDL files directly.
 * This enables proper git-based version control and PR creation.
 */

import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest } from '../types/request';
import { MCPClient } from './mcpClient';

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
  private mcpClient: MCPClient | null = null;

  constructor(modelsPath: string, tmslExecutorPath: string) {
    this.modelsPath = modelsPath;
    this.tmslExecutorPath = tmslExecutorPath;

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }

    // Initialize MCP client - backend will spawn the server as a child process
    const mcpServerPath = '/app/mcp-servers/powerbi-semantic/build/index.js';
    this.mcpClient = new MCPClient(mcpServerPath);
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
   * Apply a single change using PowerBI MCP manage_measure tool
   */
  private async applyChangeTom(modelPath: string, change: TmdlChange): Promise<void> {
    console.log(`[TMDL] Applying ${change.type}: ${change.measureName} in ${change.tableName}`);

    if (change.type !== 'create') {
      throw new Error(`Operation '${change.type}' not yet implemented`);
    }

    // Find the semantic model path
    const semanticModelPath = modelPath.includes('.pbip')
      ? path.join(path.dirname(modelPath), path.basename(modelPath, '.pbip') + '.SemanticModel')
      : modelPath;

    try {
      // Connect MCP client if not already connected
      if (!this.mcpClient) {
        throw new Error('MCP client not initialized');
      }

      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.connect();
      }

      // Use PowerBI MCP to create the measure
      const result = await this.mcpClient.call('manage_measure', {
        model_path: semanticModelPath,
        table_name: change.tableName,
        measure_name: change.measureName,
        operation: 'create',
        expression: change.expression,
        format_string: change.formatString || undefined,
        description: change.description || undefined,
      });

      console.log(`[TMDL] MCP result:`, JSON.stringify(result));
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
