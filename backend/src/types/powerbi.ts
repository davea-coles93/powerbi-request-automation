// PowerBI model abstraction types
// This interface allows swapping between mock and real PowerBI MCP

export interface PowerBIMeasure {
  name: string;
  tableName: string;
  expression: string;
  formatString?: string;
  description?: string;
  isHidden?: boolean;
}

export interface PowerBITable {
  name: string;
  columns: PowerBIColumn[];
  measures: PowerBIMeasure[];
}

export interface PowerBIColumn {
  name: string;
  dataType: string;
  isHidden?: boolean;
  formatString?: string;
}

export interface PowerBIRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  crossFilteringBehavior: 'oneDirection' | 'bothDirections';
  isActive: boolean;
}

export interface PowerBIModel {
  name: string;
  tables: PowerBITable[];
  relationships: PowerBIRelationship[];
}

export interface DAXQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  executionTime: number;
}

export interface PowerBIOperationResult {
  success: boolean;
  message: string;
  details?: unknown;
}

// Interface for PowerBI operations - can be implemented by mock or real MCP
export interface IPowerBIService {
  // Model inspection
  getModelInfo(): Promise<PowerBIModel>;
  getTables(): Promise<PowerBITable[]>;
  getMeasures(tableName?: string): Promise<PowerBIMeasure[]>;
  getRelationships(): Promise<PowerBIRelationship[]>;

  // DAX operations
  executeDAX(query: string): Promise<DAXQueryResult>;
  validateDAX(expression: string): Promise<{ valid: boolean; error?: string }>;

  // Modification operations
  createMeasure(measure: PowerBIMeasure): Promise<PowerBIOperationResult>;
  updateMeasure(tableName: string, measureName: string, newExpression: string): Promise<PowerBIOperationResult>;
  deleteMeasure(tableName: string, measureName: string): Promise<PowerBIOperationResult>;

  // Model state
  isConnected(): Promise<boolean>;
  getActiveModelPath(): Promise<string | null>;
}
