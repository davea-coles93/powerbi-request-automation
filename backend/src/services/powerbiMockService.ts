import {
  IPowerBIService,
  PowerBIModel,
  PowerBITable,
  PowerBIMeasure,
  PowerBIRelationship,
  DAXQueryResult,
  PowerBIOperationResult,
} from '../types/powerbi';

// Mock PowerBI service for development/testing
// This simulates the Contoso Finance sample model
export class PowerBIMockService implements IPowerBIService {
  private model: PowerBIModel;
  private connected: boolean = true;

  constructor() {
    // Initialize with Contoso-style finance model structure
    this.model = this.createContosoFinanceModel();
  }

  private createContosoFinanceModel(): PowerBIModel {
    return {
      name: 'Contoso Finance Model',
      tables: [
        {
          name: 'FactSales',
          columns: [
            { name: 'SalesKey', dataType: 'Int64' },
            { name: 'DateKey', dataType: 'Int64' },
            { name: 'ProductKey', dataType: 'Int64' },
            { name: 'CustomerKey', dataType: 'Int64' },
            { name: 'StoreKey', dataType: 'Int64' },
            { name: 'SalesQuantity', dataType: 'Int64' },
            { name: 'SalesAmount', dataType: 'Decimal' },
            { name: 'DiscountAmount', dataType: 'Decimal' },
            { name: 'TotalCost', dataType: 'Decimal' },
          ],
          measures: [
            {
              name: 'Total Sales',
              tableName: 'FactSales',
              expression: 'SUM(FactSales[SalesAmount])',
              formatString: '$#,##0.00',
            },
            {
              name: 'Total Cost',
              tableName: 'FactSales',
              expression: 'SUM(FactSales[TotalCost])',
              formatString: '$#,##0.00',
            },
            {
              name: 'Gross Profit',
              tableName: 'FactSales',
              expression: '[Total Sales] - [Total Cost]',
              formatString: '$#,##0.00',
            },
            {
              name: 'Gross Margin %',
              tableName: 'FactSales',
              expression: 'DIVIDE([Gross Profit], [Total Sales], 0)',
              formatString: '0.00%',
            },
          ],
        },
        {
          name: 'DimDate',
          columns: [
            { name: 'DateKey', dataType: 'Int64' },
            { name: 'Date', dataType: 'DateTime' },
            { name: 'Year', dataType: 'Int64' },
            { name: 'Quarter', dataType: 'String' },
            { name: 'Month', dataType: 'String' },
            { name: 'MonthNumber', dataType: 'Int64' },
            { name: 'DayOfWeek', dataType: 'String' },
          ],
          measures: [],
        },
        {
          name: 'DimProduct',
          columns: [
            { name: 'ProductKey', dataType: 'Int64' },
            { name: 'ProductName', dataType: 'String' },
            { name: 'Category', dataType: 'String' },
            { name: 'Subcategory', dataType: 'String' },
            { name: 'Brand', dataType: 'String' },
            { name: 'UnitPrice', dataType: 'Decimal' },
            { name: 'UnitCost', dataType: 'Decimal' },
          ],
          measures: [],
        },
        {
          name: 'DimCustomer',
          columns: [
            { name: 'CustomerKey', dataType: 'Int64' },
            { name: 'CustomerName', dataType: 'String' },
            { name: 'City', dataType: 'String' },
            { name: 'State', dataType: 'String' },
            { name: 'Country', dataType: 'String' },
            { name: 'CustomerType', dataType: 'String' },
          ],
          measures: [],
        },
        {
          name: 'DimStore',
          columns: [
            { name: 'StoreKey', dataType: 'Int64' },
            { name: 'StoreName', dataType: 'String' },
            { name: 'StoreType', dataType: 'String' },
            { name: 'City', dataType: 'String' },
            { name: 'State', dataType: 'String' },
            { name: 'Country', dataType: 'String' },
          ],
          measures: [],
        },
      ],
      relationships: [
        {
          fromTable: 'FactSales',
          fromColumn: 'DateKey',
          toTable: 'DimDate',
          toColumn: 'DateKey',
          crossFilteringBehavior: 'oneDirection',
          isActive: true,
        },
        {
          fromTable: 'FactSales',
          fromColumn: 'ProductKey',
          toTable: 'DimProduct',
          toColumn: 'ProductKey',
          crossFilteringBehavior: 'oneDirection',
          isActive: true,
        },
        {
          fromTable: 'FactSales',
          fromColumn: 'CustomerKey',
          toTable: 'DimCustomer',
          toColumn: 'CustomerKey',
          crossFilteringBehavior: 'oneDirection',
          isActive: true,
        },
        {
          fromTable: 'FactSales',
          fromColumn: 'StoreKey',
          toTable: 'DimStore',
          toColumn: 'StoreKey',
          crossFilteringBehavior: 'oneDirection',
          isActive: true,
        },
      ],
    };
  }

  async getModelInfo(): Promise<PowerBIModel> {
    return this.model;
  }

  async getTables(): Promise<PowerBITable[]> {
    return this.model.tables;
  }

  async getMeasures(tableName?: string): Promise<PowerBIMeasure[]> {
    if (tableName) {
      const table = this.model.tables.find(t => t.name === tableName);
      return table?.measures || [];
    }
    return this.model.tables.flatMap(t => t.measures);
  }

  async getRelationships(): Promise<PowerBIRelationship[]> {
    return this.model.relationships;
  }

  async executeDAX(query: string): Promise<DAXQueryResult> {
    // Simulate DAX execution with mock data
    console.log(`[Mock] Executing DAX: ${query}`);

    // Return mock results based on query patterns
    if (query.includes('Total Sales')) {
      return {
        columns: ['Total Sales'],
        rows: [{ 'Total Sales': 1250000.00 }],
        executionTime: 125,
      };
    }

    return {
      columns: ['Result'],
      rows: [{ Result: 'Mock execution successful' }],
      executionTime: 50,
    };
  }

  async validateDAX(expression: string): Promise<{ valid: boolean; error?: string }> {
    // Basic DAX validation
    const invalidPatterns = [
      { pattern: /^\s*$/, error: 'Expression cannot be empty' },
      { pattern: /[^)]\s*$/, error: 'Possible missing closing parenthesis' },
    ];

    for (const { pattern, error } of invalidPatterns) {
      if (pattern.test(expression)) {
        return { valid: false, error };
      }
    }

    // Check for balanced parentheses
    let depth = 0;
    for (const char of expression) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) return { valid: false, error: 'Unmatched closing parenthesis' };
    }
    if (depth !== 0) return { valid: false, error: 'Unmatched opening parenthesis' };

    return { valid: true };
  }

  async createMeasure(measure: PowerBIMeasure): Promise<PowerBIOperationResult> {
    const table = this.model.tables.find(t => t.name === measure.tableName);
    if (!table) {
      return { success: false, message: `Table ${measure.tableName} not found` };
    }

    const existing = table.measures.find(m => m.name === measure.name);
    if (existing) {
      return { success: false, message: `Measure ${measure.name} already exists` };
    }

    const validation = await this.validateDAX(measure.expression);
    if (!validation.valid) {
      return { success: false, message: `Invalid DAX: ${validation.error}` };
    }

    table.measures.push(measure);
    return {
      success: true,
      message: `Measure ${measure.name} created successfully`,
      details: measure,
    };
  }

  async updateMeasure(
    tableName: string,
    measureName: string,
    newExpression: string
  ): Promise<PowerBIOperationResult> {
    const table = this.model.tables.find(t => t.name === tableName);
    if (!table) {
      return { success: false, message: `Table ${tableName} not found` };
    }

    const measure = table.measures.find(m => m.name === measureName);
    if (!measure) {
      return { success: false, message: `Measure ${measureName} not found in ${tableName}` };
    }

    const validation = await this.validateDAX(newExpression);
    if (!validation.valid) {
      return { success: false, message: `Invalid DAX: ${validation.error}` };
    }

    const oldExpression = measure.expression;
    measure.expression = newExpression;
    return {
      success: true,
      message: `Measure ${measureName} updated successfully`,
      details: { oldExpression, newExpression },
    };
  }

  async deleteMeasure(tableName: string, measureName: string): Promise<PowerBIOperationResult> {
    const table = this.model.tables.find(t => t.name === tableName);
    if (!table) {
      return { success: false, message: `Table ${tableName} not found` };
    }

    const measureIndex = table.measures.findIndex(m => m.name === measureName);
    if (measureIndex === -1) {
      return { success: false, message: `Measure ${measureName} not found in ${tableName}` };
    }

    table.measures.splice(measureIndex, 1);
    return { success: true, message: `Measure ${measureName} deleted successfully` };
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getActiveModelPath(): Promise<string | null> {
    return 'C:\\Models\\ContosoFinance.pbix';
  }

  // Test helper methods
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  resetModel(): void {
    this.model = this.createContosoFinanceModel();
  }
}
