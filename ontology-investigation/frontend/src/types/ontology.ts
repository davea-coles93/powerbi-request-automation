// Perspective types
export interface Perspective {
  id: string;
  name: string;
  purpose: string;
  primary_concern: string;
  typical_actors: string[];
  consumes_from: string[];
  feeds: string[];
}

// System types
export type SystemType = 'ERP' | 'MES' | 'WMS' | 'Spreadsheet' | 'Manual' | 'BI' | 'Other';
export type ReliabilityLevel = 'High' | 'Medium' | 'Low';
export type IntegrationStatus = 'Connected' | 'Planned' | 'Manual Extract' | 'None';

export interface System {
  id: string;
  name: string;
  type: SystemType;
  vendor?: string;
  reliability_default?: ReliabilityLevel;
  integration_status?: IntegrationStatus;
  notes?: string;
}

// Entity types
export interface CoreAttribute {
  name: string;
  data_type: 'string' | 'number' | 'date' | 'datetime' | 'boolean';
  description?: string;
}

export interface DerivedAttribute {
  name: string;
  data_type?: string;
  description?: string;
  derivation?: string;
}

export interface EntityLens {
  perspective_id: string;
  interpretation: string;
  derived_attributes: DerivedAttribute[];
}

export interface Entity {
  id: string;
  name: string;
  description?: string;
  core_attributes: CoreAttribute[];
  lenses: EntityLens[];
}

// Attribute types
export type Volatility = 'Point-in-time' | 'Accumulating' | 'Continuous';

export interface Attribute {
  id: string;
  name: string;
  description?: string;
  entity_id: string;
  system_id: string;
  source_actor?: string;
  reliability?: ReliabilityLevel;
  volatility?: Volatility;
  notes?: string;
}

// Measure types
export interface Measure {
  id: string;
  name: string;
  description?: string;
  logic?: string;
  formula?: string;
  input_attribute_ids: string[];
  input_measure_ids: string[];
  perspective_ids: string[];
}

// Metric types
export interface Metric {
  id: string;
  name: string;
  description?: string;
  business_question: string;
  calculated_by_measure_ids: string[];
  perspective_ids: string[];
}

// Process types
export type PerspectiveLevel = 'financial' | 'management' | 'operational';

export interface ProcessStep {
  id: string;
  sequence: number;
  name: string;
  description?: string;
  perspective_id: string;
  actor?: string;
  consumes_attribute_ids: string[];
  produces_attribute_ids: string[];
  uses_metric_ids: string[];
  crystallizes_attribute_ids: string[];
  depends_on_step_ids: string[];

  // Hierarchical drill-down support
  parent_step_id?: string;  // If this step is a sub-step of another
  has_sub_steps?: boolean;   // Whether this step can be drilled into
  perspective_level?: PerspectiveLevel; // Which level this step represents

  // Time and efficiency metadata
  estimated_duration_minutes?: number;  // Expected time to complete
  automation_potential?: 'High' | 'Medium' | 'Low' | 'None';  // Automation opportunity
  systems_used_ids?: string[];  // Systems accessed during this step
  waste_category?: string;  // Type of waste identified
  manual_effort_percentage?: number;  // 0-100: percentage that is manual vs automated
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  steps: ProcessStep[];
}

// Graph response types
export interface MetricTrace {
  metric: Metric;
  measures: Measure[];
  attributes: Attribute[];
  systems: System[];
  entities: Entity[];
}

export interface PerspectiveView {
  perspective: Perspective;
  metrics: Metric[];
  measures: Measure[];
  attributes: Attribute[];
  entities: Entity[];
  process_steps: (ProcessStep & { process_id: string; process_name: string })[];
}

export interface ProcessFlow {
  process: {
    id: string;
    name: string;
    description?: string;
  };
  nodes: {
    id: string;
    label: string;
    sequence: number;
    perspective_id: string;
    actor?: string;
    has_sub_steps?: boolean;
    perspective_level?: PerspectiveLevel;
    // Time and efficiency metadata
    estimated_duration_minutes?: number;
    automation_potential?: 'High' | 'Medium' | 'Low' | 'None';
    systems_used_ids?: string[];
    waste_category?: string;
    manual_effort_percentage?: number;
  }[];
  edges: {
    source: string;
    target: string;
  }[];
}

// Semantic Model types
export type TableType = 'Fact' | 'Dimension' | 'Bridge';
export type DataType = 'Integer' | 'Decimal' | 'String' | 'Date' | 'DateTime' | 'Boolean';

export interface Column {
  id: string;
  name: string;
  data_type: DataType;
  is_key?: boolean;
  is_foreign_key?: boolean;
  source_system_id?: string;
  source_field?: string;
  mapped_attribute_id?: string;
  description?: string;
}

export interface DAXMeasure {
  id: string;
  name: string;
  expression: string;
  format_string?: string;
  description?: string;
  mapped_measure_id?: string;
}

export interface SemanticTable {
  id: string;
  name: string;
  table_type: TableType;
  columns: Column[];
  measures: DAXMeasure[];
  mapped_entity_id?: string;
  source_system_id?: string;
  description?: string;
}

export interface SemanticModel {
  id: string;
  name: string;
  description?: string;
  tables: SemanticTable[];
  relationships: any[];
}

export interface MappingStatus {
  total_tables: number;
  mapped_tables: number;
  unmapped_tables: number;
  total_columns: number;
  mapped_columns: number;
  total_measures: number;
  mapped_measures: number;
  orphaned_attributes?: string[];  // For frontend compatibility
  orphaned_observations?: string[];  // Actual API response
  orphaned_tables: string[];
  missing_columns: string[];
}

// Scenario types
export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ScenarioStatus {
  current_scenario: string | null;
  available_scenarios: ScenarioInfo[];
}

export interface LoadScenarioResponse {
  success: boolean;
  message: string;
  scenario: ScenarioInfo;
}
