/**
 * Type definitions for Power BI Report JSON structures
 * Based on PBIP .Report/ folder format
 */

export interface ReportProject {
  reportPath: string;
  report: ReportDefinition;
  pages: PagesMetadata;
  pageDefinitions: Map<string, PageDefinition>;
}

export interface ReportDefinition {
  $schema: string;
  themeCollection?: Record<string, any>;
  resourcePackages?: ResourcePackage[];
}

export interface ResourcePackage {
  name: string;
  type: string;
  items?: ResourceItem[];
}

export interface ResourceItem {
  name: string;
  path: string;
  type: string;
}

export interface PagesMetadata {
  $schema: string;
  pageOrder: string[];
  activePageName: string;
}

export interface PageDefinition {
  $schema: string;
  name: string;
  displayName: string;
  displayOption?: string;
  filterConfig?: FilterConfig;
  width?: number;
  height?: number;
}

export interface FilterConfig {
  filters: Filter[];
}

export interface Filter {
  name: string;
  field: FieldExpression;
  type: string;
  filter?: any;
  howCreated?: string;
}

export interface FieldExpression {
  Column?: ColumnExpression;
  Measure?: MeasureExpression;
}

export interface ColumnExpression {
  Expression: SourceRefExpression;
  Property: string;
}

export interface MeasureExpression {
  Expression: SourceRefExpression;
  Property: string;
}

export interface SourceRefExpression {
  SourceRef: SourceRef;
}

export interface SourceRef {
  Entity?: string;
  Source?: string;
}

export interface VisualContainer {
  $schema: string;
  name: string;
  position: VisualPosition;
  visual: Visual;
  config?: string;
}

export interface VisualPosition {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  tabOrder?: number;
}

export interface Visual {
  visualType: string;
  query?: VisualQuery;
  objects?: Record<string, any[]>;
  visualContainerObjects?: Record<string, any[]>;
  dataTransforms?: any;
}

export interface VisualQuery {
  queryState?: QueryState;
  Select?: SelectQuery[];
}

export interface QueryState {
  [role: string]: {
    projections: QueryProjection[];
  };
}

export interface QueryProjection {
  field: FieldExpression | AggregationExpression;
  queryRef: string;
  active?: boolean;
}

export interface AggregationExpression {
  Aggregation: {
    Expression: FieldExpression;
    Function: number;
  };
}

export interface SelectQuery {
  Column?: ColumnExpression;
  Measure?: MeasureExpression;
  Name?: string;
}

// Visual type helpers
export type VisualType =
  | 'card'
  | 'textbox'
  | 'slicer'
  | 'table'
  | 'matrix'
  | 'barChart'
  | 'columnChart'
  | 'lineChart'
  | 'pieChart'
  | 'donutChart'
  | 'scatterChart'
  | 'areaChart'
  | 'clusteredBarChart'
  | 'clusteredColumnChart'
  | 'hundredPercentStackedBarChart'
  | 'hundredPercentStackedColumnChart'
  | 'ribbonChart'
  | 'waterfallChart'
  | 'funnelChart'
  | 'gauge'
  | 'kpi';

// Tool input types
export interface CreatePageInput {
  reportPath: string;
  pageName: string;
  displayName: string;
  insertAtIndex?: number;
}

export interface DeletePageInput {
  reportPath: string;
  pageName: string;
}

export interface CreateVisualInput {
  reportPath: string;
  pageName: string;
  visualType: VisualType;
  position: VisualPosition;
  query?: Partial<VisualQuery>;
  title?: string;
  containerName?: string;
}

export interface UpdateVisualInput {
  reportPath: string;
  pageName: string;
  containerName: string;
  position?: VisualPosition;
  query?: Partial<VisualQuery>;
  objects?: Record<string, any[]>;
}

export interface DeleteVisualInput {
  reportPath: string;
  pageName: string;
  containerName: string;
}

export interface AddFilterInput {
  reportPath: string;
  pageName: string;
  field: FieldExpression;
  filterType: 'Categorical' | 'Advanced' | 'TopN' | 'RelativeDate';
  filterConfig?: any;
}

export interface AnalysisResult {
  reportPath: string;
  totalPages: number;
  pages: PageAnalysis[];
  totalVisuals: number;
  visualsByType: Record<string, number>;
  filterCount: number;
  brokenReferences?: string[];
}

export interface PageAnalysis {
  name: string;
  displayName: string;
  visualCount: number;
  filterCount: number;
  visuals: VisualSummary[];
}

export interface VisualSummary {
  containerName: string;
  type: string;
  position: VisualPosition;
  hasQuery: boolean;
  title?: string;
  fields?: string[];
}
