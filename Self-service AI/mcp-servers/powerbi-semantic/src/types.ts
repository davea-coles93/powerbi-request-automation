/**
 * Enhanced TMDL Type Definitions
 * Comprehensive metadata structures
 */

export interface TmdlAnnotation {
  name: string;
  value: string;
}

export interface TmdlHierarchyLevel {
  name: string;
  column: string;
  lineageTag: string;
  ordinal?: number;
}

export interface TmdlHierarchy {
  name: string;
  lineageTag: string;
  levels: TmdlHierarchyLevel[];
  isHidden?: boolean;
  displayFolder?: string;
}

export interface TmdlMeasure {
  name: string;
  expression: string;
  formatString?: string;
  description?: string;
  displayFolder?: string;
  lineageTag: string;
  annotations?: TmdlAnnotation[];
  isHidden?: boolean;
  dataCategory?: string;
}

export interface TmdlColumnVariation {
  isDefault?: boolean;
  relationship?: string;
  defaultHierarchy?: string;
}

export interface TmdlColumn {
  name: string;
  dataType: string;
  sourceColumn?: string;
  isHidden?: boolean;
  formatString?: string;
  dataCategory?: string;
  summarizeBy?: string;
  sortByColumn?: string;
  displayFolder?: string;
  lineageTag: string;
  annotations?: TmdlAnnotation[];
  variation?: TmdlColumnVariation;
}

export interface TmdlTable {
  name: string;
  lineageTag: string;
  measures: TmdlMeasure[];
  columns: TmdlColumn[];
  hierarchies: TmdlHierarchy[];
  isHidden?: boolean;
  description?: string;
  annotations?: TmdlAnnotation[];
}

export interface TmdlRelationship {
  name?: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  fromCardinality?: 'one' | 'many';
  toCardinality?: 'one' | 'many';
  isActive: boolean;
  crossFilterDirection?: 'oneDirection' | 'bothDirections';
  securityFilteringBehavior?: string;
  lineageTag?: string;
}

export interface TmdlCalculationItem {
  name: string;
  expression: string;
  ordinal?: number;
  formatStringExpression?: string;
  description?: string;
}

export interface TmdlCalculationGroup {
  tableName: string;
  columnName: string;
  items: TmdlCalculationItem[];
  precedence?: number;
}

export interface TmdlPerspective {
  name: string;
  description?: string;
  tables: string[];
  measures: string[];
  columns: string[];
  hierarchies: string[];
}

export interface TmdlRole {
  name: string;
  description?: string;
  modelPermission?: 'read' | 'readRefresh' | 'refresh' | 'administrator';
  tablePermissions: Array<{
    table: string;
    filterExpression?: string;
  }>;
}

export interface TmdlCulture {
  name: string;
  linguisticMetadata?: any;
  translations?: Map<string, string>;
}

export interface TmdlModel {
  name: string;
  culture?: string;
  compatibilityLevel?: number;
  defaultPowerBIDataSourceVersion?: string;
  tables: TmdlTable[];
  relationships: TmdlRelationship[];
  calculationGroups: TmdlCalculationGroup[];
  perspectives: TmdlPerspective[];
  roles: TmdlRole[];
  cultures: TmdlCulture[];
  annotations?: TmdlAnnotation[];
}

export interface TmdlProject {
  projectPath: string;
  semanticModelPath: string;
  model: TmdlModel;
}

// DAX Analysis types

export interface MeasureDependency {
  measureName: string;
  table: string;
  dependencies: {
    measures: string[];
    columns: Array<{ table: string; column: string }>;
    tables: string[];
  };
  dependents: string[]; // Measures that depend on this one
}

export interface DaxComplexity {
  measureName: string;
  score: number; // 0-100
  factors: {
    nestingDepth: number;
    functionCount: number;
    tableReferences: number;
    measureReferences: number;
    hasIterators: boolean;
    hasContextTransition: boolean;
  };
  recommendation: string;
}

export interface DaxPattern {
  type: 'time_intelligence' | 'aggregation' | 'ratio' | 'conditional' | 'text' | 'unknown';
  subtype?: string;
  confidence: number;
  description: string;
}

export interface DaxIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ModelQuality {
  overallScore: number; // 0-100
  metrics: {
    measuresWithoutDescriptions: number;
    measuresWithoutDisplayFolders: number;
    unusedMeasures: number;
    namingConsistencyScore: number;
    relationshipQualityScore: number;
    hierarchyCount: number;
    calculationGroupCount: number;
  };
  recommendations: string[];
}
