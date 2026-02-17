/**
 * Real PowerBI service using the PowerBI Desktop MCP
 * This replaces the mock service for actual model manipulation
 */

import {
  IPowerBIService,
  PowerBIModel,
  PowerBITable,
  PowerBIMeasure,
  PowerBIRelationship,
  DAXQueryResult,
  PowerBIOperationResult,
} from '../types/powerbi';
import { MCPClient } from './mcpClient';

export class PowerBIMcpService implements IPowerBIService {
  private mcpClient: MCPClient;
  private connected: boolean = false;
  private modelCache: PowerBIModel | null = null;

  constructor(mcpServerPath: string) {
    this.mcpClient = new MCPClient(mcpServerPath);
  }

  async connect(): Promise<boolean> {
    try {
      await this.mcpClient.connect();

      // List available models
      const result = await this.mcpClient.call('manage_model_connection', {
        operation: 'list'
      }) as { models?: Array<{ id: string; name: string; is_connectable: boolean }> };

      if (result.models && result.models.length > 0) {
        // Connect to first available model
        const model = result.models.find(m => m.is_connectable);
        if (model) {
          await this.mcpClient.call('manage_model_connection', {
            operation: 'select',
            model_id: model.id
          });
          this.connected = true;
          console.log(`[PowerBI MCP] Connected to: ${model.name}`);
          return true;
        }
      }

      // Check if already connected
      const currentResult = await this.mcpClient.call('manage_model_connection', {
        operation: 'get_current'
      }) as { connected?: boolean; message?: string };

      if (currentResult.connected) {
        this.connected = true;
        console.log(`[PowerBI MCP] ${currentResult.message}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PowerBI MCP] Connection failed:', error);
      return false;
    }
  }

  async getModelInfo(): Promise<PowerBIModel> {
    if (this.modelCache) {
      return this.modelCache;
    }

    const tables = await this.getTables();
    const relationships = await this.getRelationships();

    // Get current model info
    const connectionResult = await this.mcpClient.call('manage_model_connection', {
      operation: 'get_current'
    }) as { connected?: boolean; port?: string; table_count?: number; message?: string };

    this.modelCache = {
      name: connectionResult.message || 'PowerBI Model',
      tables,
      relationships,
    };

    return this.modelCache;
  }

  async getTables(): Promise<PowerBITable[]> {
    const result = await this.mcpClient.call('list_objects', {
      type: 'tables'
    }) as { tables: Array<{ name: string; isHidden: boolean; columnCount: number; measureCount: number }> };

    const tables: PowerBITable[] = [];

    for (const table of result.tables || []) {
      if (table.isHidden) continue;

      // Get columns for this table
      const columnsResult = await this.mcpClient.call('list_objects', {
        type: 'columns',
        table: table.name
      }) as { columns: Array<{ name: string; dataType: string; isHidden: boolean; formatString?: string }> };

      // Get measures for this table
      const measuresResult = await this.mcpClient.call('list_objects', {
        type: 'measures',
        table: table.name
      }) as { measures: Array<{ name: string; expression: string; formatString?: string; description?: string; isHidden: boolean }> };

      tables.push({
        name: table.name,
        columns: (columnsResult.columns || []).map(c => ({
          name: c.name,
          dataType: c.dataType,
          isHidden: c.isHidden,
          formatString: c.formatString,
        })),
        measures: (measuresResult.measures || []).map(m => ({
          name: m.name,
          tableName: table.name,
          expression: m.expression,
          formatString: m.formatString,
          description: m.description,
          isHidden: m.isHidden,
        })),
      });
    }

    return tables;
  }

  async getMeasures(tableName?: string): Promise<PowerBIMeasure[]> {
    const params: Record<string, unknown> = { type: 'measures' };
    if (tableName) {
      params.table = tableName;
    }

    const result = await this.mcpClient.call('list_objects', params) as {
      measures: Array<{
        tableName: string;
        name: string;
        expression: string;
        formatString?: string;
        description?: string;
        isHidden: boolean;
      }>
    };

    return (result.measures || []).map(m => ({
      name: m.name,
      tableName: m.tableName,
      expression: m.expression,
      formatString: m.formatString,
      description: m.description,
      isHidden: m.isHidden,
    }));
  }

  async getRelationships(): Promise<PowerBIRelationship[]> {
    const result = await this.mcpClient.call('list_objects', {
      type: 'relationships'
    }) as {
      relationships: Array<{
        fromTable: string;
        fromColumn: string;
        toTable: string;
        toColumn: string;
        crossFilterDirection: string;
        isActive: boolean;
      }>
    };

    return (result.relationships || []).map(r => ({
      fromTable: r.fromTable,
      fromColumn: r.fromColumn,
      toTable: r.toTable,
      toColumn: r.toColumn,
      crossFilteringBehavior: r.crossFilterDirection === 'Both' ? 'bothDirections' : 'oneDirection',
      isActive: r.isActive,
    }));
  }

  async executeDAX(query: string): Promise<DAXQueryResult> {
    const startTime = Date.now();

    try {
      const result = await this.mcpClient.call('run_dax', {
        query
      }) as {
        columns: string[];
        data: Record<string, unknown>[];
        rowCount: number;
      };

      return {
        columns: result.columns || [],
        rows: result.data || [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[PowerBI MCP] DAX execution failed:', error);
      throw error;
    }
  }

  async validateDAX(expression: string): Promise<{ valid: boolean; error?: string }> {
    // Try to execute as a query to validate
    const testQuery = `EVALUATE ROW("Test", ${expression})`;

    try {
      await this.executeDAX(testQuery);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid DAX expression',
      };
    }
  }

  async createMeasure(measure: PowerBIMeasure): Promise<PowerBIOperationResult> {
    try {
      // First validate the DAX
      const validation = await this.validateDAX(measure.expression);
      if (!validation.valid) {
        return { success: false, message: `Invalid DAX: ${validation.error}` };
      }

      // Use manage_measure tool to create
      const result = await this.mcpClient.call('manage_measure', {
        operation: 'create',
        table: measure.tableName,
        name: measure.name,
        expression: measure.expression,
        formatString: measure.formatString,
        description: measure.description,
      }) as { success: boolean; message: string };

      // Invalidate cache
      this.modelCache = null;

      return {
        success: result.success,
        message: result.message || `Measure ${measure.name} created successfully in ${measure.tableName}`,
        details: measure,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create measure',
      };
    }
  }

  async updateMeasure(
    tableName: string,
    measureName: string,
    newExpression: string
  ): Promise<PowerBIOperationResult> {
    try {
      // Validate first
      const validation = await this.validateDAX(newExpression);
      if (!validation.valid) {
        return { success: false, message: `Invalid DAX: ${validation.error}` };
      }

      // Get current expression for rollback info
      const measures = await this.getMeasures(tableName);
      const currentMeasure = measures.find(m => m.name === measureName);
      const oldExpression = currentMeasure?.expression;

      // Update the measure
      const result = await this.mcpClient.call('manage_measure', {
        operation: 'update',
        table: tableName,
        name: measureName,
        expression: newExpression,
      }) as { success: boolean; message: string };

      // Invalidate cache
      this.modelCache = null;

      return {
        success: result.success,
        message: result.message || `Measure ${measureName} updated successfully`,
        details: { oldExpression, newExpression },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update measure',
      };
    }
  }

  async deleteMeasure(tableName: string, measureName: string): Promise<PowerBIOperationResult> {
    try {
      const result = await this.mcpClient.call('manage_measure', {
        operation: 'delete',
        table: tableName,
        name: measureName,
      }) as { success: boolean; message: string };

      // Invalidate cache
      this.modelCache = null;

      return {
        success: result.success,
        message: result.message || `Measure ${measureName} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete measure',
      };
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected || !this.mcpClient.isConnected()) {
      return false;
    }

    try {
      const result = await this.mcpClient.call('manage_model_connection', {
        operation: 'get_current'
      }) as { connected?: boolean };

      return !!result.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async getActiveModelPath(): Promise<string | null> {
    try {
      const result = await this.mcpClient.call('manage_model_connection', {
        operation: 'get_current'
      }) as { message?: string; port?: string };

      return result.message || null;
    } catch {
      return null;
    }
  }

  // Clear the model cache
  clearCache(): void {
    this.modelCache = null;
  }

  // Disconnect from MCP server
  disconnect(): void {
    this.mcpClient.disconnect();
    this.connected = false;
    this.modelCache = null;
  }
}
