import {
  IPowerBIService,
  PowerBIModel,
  PowerBITable,
  PowerBIMeasure,
  PowerBIRelationship,
  DAXQueryResult,
  PowerBIOperationResult,
} from '../types/powerbi';

/**
 * Azure Analysis Services integration for cloud-based DAX validation.
 *
 * This service connects to an Azure Analysis Services instance to:
 * - Validate DAX syntax against real models
 * - Execute test queries
 * - Deploy model changes
 *
 * Prerequisites:
 * - Azure Analysis Services instance deployed
 * - Service principal with admin rights on the AAS
 * - Sample model deployed for testing
 *
 * Environment variables:
 * - AZURE_AAS_SERVER: server name (e.g., asazure://westus.asazure.windows.net/myserver)
 * - AZURE_AAS_DATABASE: database/model name
 * - AZURE_CLIENT_ID: Service principal app ID
 * - AZURE_CLIENT_SECRET: Service principal secret
 * - AZURE_TENANT_ID: Azure AD tenant ID
 */

interface AzureToken {
  accessToken: string;
  expiresAt: number;
}

export class AzureAnalysisService implements IPowerBIService {
  private serverUrl: string;
  private databaseName: string;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private token: AzureToken | null = null;
  private modelCache: PowerBIModel | null = null;

  constructor() {
    this.serverUrl = process.env.AZURE_AAS_SERVER || '';
    this.databaseName = process.env.AZURE_AAS_DATABASE || '';
    this.clientId = process.env.AZURE_CLIENT_ID || '';
    this.clientSecret = process.env.AZURE_CLIENT_SECRET || '';
    this.tenantId = process.env.AZURE_TENANT_ID || '';
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const scope = 'https://analysis.windows.net/.default';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: scope,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Azure token: ${response.status}`);
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return this.token.accessToken;
  }

  private async executeXmla(query: string): Promise<unknown> {
    const token = await this.getAccessToken();
    const endpoint = `${this.serverUrl}/databases/${this.databaseName}/query`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`XMLA query failed: ${error}`);
    }

    return response.json();
  }

  async getModelInfo(): Promise<PowerBIModel> {
    if (this.modelCache) {
      return this.modelCache;
    }

    if (!this.isConfigured()) {
      throw new Error('Azure Analysis Services not configured');
    }

    // Query model metadata using DMV
    const tablesQuery = `
      SELECT [Name], [Description]
      FROM $SYSTEM.TMSCHEMA_TABLES
      WHERE [IsHidden] = FALSE
    `;

    const measuresQuery = `
      SELECT
        [Name],
        [TableID],
        [Expression],
        [FormatString],
        [Description]
      FROM $SYSTEM.TMSCHEMA_MEASURES
    `;

    const relationshipsQuery = `
      SELECT
        [FromTableID],
        [FromColumnID],
        [ToTableID],
        [ToColumnID],
        [CrossFilteringBehavior],
        [IsActive]
      FROM $SYSTEM.TMSCHEMA_RELATIONSHIPS
    `;

    try {
      const [tablesResult, measuresResult, relationshipsResult] = await Promise.all([
        this.executeXmla(tablesQuery),
        this.executeXmla(measuresQuery),
        this.executeXmla(relationshipsQuery),
      ]);

      // Transform results to our model format
      // (Implementation depends on actual XMLA response structure)
      this.modelCache = this.transformToModel(tablesResult, measuresResult, relationshipsResult);
      return this.modelCache;
    } catch (error) {
      console.error('Failed to get model info from AAS:', error);
      throw error;
    }
  }

  private transformToModel(
    tablesResult: unknown,
    measuresResult: unknown,
    relationshipsResult: unknown
  ): PowerBIModel {
    // Placeholder - actual implementation depends on AAS response format
    return {
      name: this.databaseName,
      tables: [],
      relationships: [],
    };
  }

  async getTables(): Promise<PowerBITable[]> {
    const model = await this.getModelInfo();
    return model.tables;
  }

  async getMeasures(tableName?: string): Promise<PowerBIMeasure[]> {
    const model = await this.getModelInfo();
    if (tableName) {
      const table = model.tables.find(t => t.name === tableName);
      return table?.measures || [];
    }
    return model.tables.flatMap(t => t.measures);
  }

  async getRelationships(): Promise<PowerBIRelationship[]> {
    const model = await this.getModelInfo();
    return model.relationships;
  }

  async executeDAX(query: string): Promise<DAXQueryResult> {
    if (!this.isConfigured()) {
      throw new Error('Azure Analysis Services not configured');
    }

    const startTime = Date.now();

    try {
      const result = await this.executeXmla(query) as { rows: Record<string, unknown>[] };

      return {
        columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
        rows: result.rows,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('DAX execution failed:', error);
      throw error;
    }
  }

  async validateDAX(expression: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.isConfigured()) {
      // Fall back to syntax-only validation
      return this.syntaxOnlyValidation(expression);
    }

    // Wrap in EVALUATE to test the expression
    const testQuery = `EVALUATE ROW("Test", ${expression})`;

    try {
      await this.executeDAX(testQuery);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  private syntaxOnlyValidation(expression: string): { valid: boolean; error?: string } {
    // Basic syntax checks without execution
    const errors: string[] = [];

    // Check balanced parentheses
    let depth = 0;
    for (const char of expression) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) {
        errors.push('Unmatched closing parenthesis');
        break;
      }
    }
    if (depth > 0) {
      errors.push('Unmatched opening parenthesis');
    }

    // Check balanced brackets
    let bracketDepth = 0;
    for (const char of expression) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
      if (bracketDepth < 0) {
        errors.push('Unmatched closing bracket');
        break;
      }
    }
    if (bracketDepth > 0) {
      errors.push('Unmatched opening bracket');
    }

    // Check for common DAX function names
    const validFunctions = [
      'SUM', 'AVERAGE', 'COUNT', 'COUNTROWS', 'MIN', 'MAX',
      'CALCULATE', 'FILTER', 'ALL', 'ALLEXCEPT', 'VALUES',
      'SUMX', 'AVERAGEX', 'COUNTAX', 'MINX', 'MAXX',
      'IF', 'SWITCH', 'DIVIDE', 'BLANK', 'ISBLANK',
      'RELATED', 'RELATEDTABLE', 'USERELATIONSHIP',
      'DATEADD', 'SAMEPERIODLASTYEAR', 'TOTALYTD', 'TOTALMTD',
      'FORMAT', 'CONCATENATE', 'VAR', 'RETURN', 'ROW',
    ];

    // Extract function-like patterns
    const functionPattern = /([A-Z]+)\s*\(/gi;
    let match;
    while ((match = functionPattern.exec(expression)) !== null) {
      const funcName = match[1].toUpperCase();
      if (!validFunctions.includes(funcName) && !funcName.startsWith('_')) {
        // Could be a warning, but don't treat as error (might be a custom function)
        console.log(`Unrecognized function: ${funcName}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join('; ') };
    }

    return { valid: true };
  }

  async createMeasure(measure: PowerBIMeasure): Promise<PowerBIOperationResult> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Azure Analysis Services not configured' };
    }

    // Validate the DAX first
    const validation = await this.validateDAX(measure.expression);
    if (!validation.valid) {
      return { success: false, message: `Invalid DAX: ${validation.error}` };
    }

    // Use TMSL to create the measure
    const tmsl = {
      createOrReplace: {
        object: {
          database: this.databaseName,
          table: measure.tableName,
          measure: measure.name,
        },
        measure: {
          name: measure.name,
          expression: measure.expression,
          formatString: measure.formatString,
          description: measure.description,
        },
      },
    };

    try {
      await this.executeXmla(JSON.stringify(tmsl));
      this.modelCache = null; // Invalidate cache
      return { success: true, message: `Measure ${measure.name} created successfully` };
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
    // Validate first
    const validation = await this.validateDAX(newExpression);
    if (!validation.valid) {
      return { success: false, message: `Invalid DAX: ${validation.error}` };
    }

    const tmsl = {
      alter: {
        object: {
          database: this.databaseName,
          table: tableName,
          measure: measureName,
        },
        measure: {
          name: measureName,
          expression: newExpression,
        },
      },
    };

    try {
      await this.executeXmla(JSON.stringify(tmsl));
      this.modelCache = null;
      return { success: true, message: `Measure ${measureName} updated successfully` };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update measure',
      };
    }
  }

  async deleteMeasure(tableName: string, measureName: string): Promise<PowerBIOperationResult> {
    const tmsl = {
      delete: {
        object: {
          database: this.databaseName,
          table: tableName,
          measure: measureName,
        },
      },
    };

    try {
      await this.executeXmla(JSON.stringify(tmsl));
      this.modelCache = null;
      return { success: true, message: `Measure ${measureName} deleted successfully` };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete measure',
      };
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  async getActiveModelPath(): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return `${this.serverUrl}/${this.databaseName}`;
  }

  private isConfigured(): boolean {
    return !!(
      this.serverUrl &&
      this.databaseName &&
      this.clientId &&
      this.clientSecret &&
      this.tenantId
    );
  }

  // Helper method to check configuration status
  getConfigurationStatus(): {
    configured: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    if (!this.serverUrl) missing.push('AZURE_AAS_SERVER');
    if (!this.databaseName) missing.push('AZURE_AAS_DATABASE');
    if (!this.clientId) missing.push('AZURE_CLIENT_ID');
    if (!this.clientSecret) missing.push('AZURE_CLIENT_SECRET');
    if (!this.tenantId) missing.push('AZURE_TENANT_ID');

    return {
      configured: missing.length === 0,
      missing,
    };
  }
}
