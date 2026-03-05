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
  source_table?: string;
  source_column?: string;
  source_connection?: string;
  constraints?: Array<{
    type: 'range' | 'required' | 'format';
    min?: number;
    max?: number;
    pattern?: string;
    unit?: string;
    description: string;
  }>;
  perspective_ids?: string[];
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

// Fact types (workshop capture on process steps)
export type FactCategory = 'pain_point' | 'decision' | 'insight' | 'question' | 'action_item';

export interface Fact {
  text: string;
  author?: string;
  timestamp?: string;
  category?: FactCategory;
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

  // Workshop facts
  facts?: Fact[];
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
  orphaned_attributes?: string[];  // API response key
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

// TMDL Import types
export interface AvailableModel {
  path: string;
  name: string;
  definition_path: string;
}

export interface TmdlPreview {
  entities: number;
  attributes: number;
  measures: number;
  metrics: number;
  relationships: number;
  tables: string[];
  sample_measures: string[];
}

export interface TmdlLoadResponse {
  success: boolean;
  message: string;
  entities: number;
  attributes: number;
  measures: number;
  metrics: number;
}

// TMDL Merge Import types
export interface MergeConflict {
  id: string;
  name: string;
  entity_type: string;
  existing_name: string;
}

export interface TmdlMergePreview {
  new_entities: number;
  new_attributes: number;
  new_measures: number;
  new_metrics: number;
  new_systems: number;
  new_perspectives: number;
  conflicting_entities: number;
  conflicting_attributes: number;
  conflicting_measures: number;
  conflicting_metrics: number;
  conflicts: MergeConflict[];
  tables: string[];
  sample_measures: string[];
  relationships: number;
  total_entities: number;
  total_attributes: number;
  total_measures: number;
  total_metrics: number;
}

export type ConflictStrategy = 'skip' | 'update';

export interface TmdlMergeResponse {
  success: boolean;
  message: string;
  created: Record<string, number>;
  skipped: Record<string, number>;
  updated: Record<string, number>;
}

// Discovery / Workshop types
export type WorkshopSessionType = 'top_down' | 'bottom_up' | 'gap_analysis';
export type FindingCategory = 'missing_supply' | 'unused_supply' | 'shadow_system' | 'high_manual_effort' | 'data_quality' | 'other';

export interface WorkshopFinding {
  id: string;
  category: FindingCategory;
  description: string;
  related_entity_ids: string[];
  related_attribute_ids: string[];
  priority: 'high' | 'medium' | 'low';
}

// Top-down structured data
export interface TopDownAttributeRequirement {
  id: string;
  name: string;
  existing_attribute_id?: string;
  entity_hint?: string;
}

export interface TopDownMeasureRequirement {
  id: string;
  name: string;
  logic?: string;
  existing_measure_id?: string;
  required_attributes: TopDownAttributeRequirement[];
}

export interface TopDownMetricCapture {
  id: string;
  business_question: string;
  metric_name: string;
  perspective_ids: string[];
  existing_metric_id?: string;
  required_measures: TopDownMeasureRequirement[];
}

export interface TopDownData {
  metrics: TopDownMetricCapture[];
}

// Gap analysis structured data
export type GapType = 'missing_supply' | 'unused_supply' | 'shadow_system' | 'high_manual_effort';

export interface GapItem {
  id: string;
  gap_type: GapType;
  description: string;
  priority: 'high' | 'medium' | 'low';
  related_entity_ids: string[];
  related_attribute_ids: string[];
  related_measure_ids: string[];
  related_process_ids: string[];
  suggested_action?: string;
  resolved: boolean;
  resolution_notes?: string;
}

export interface GapAnalysisData {
  top_down_session_ids: string[];
  bottom_up_session_ids: string[];
  gaps: GapItem[];
}

export interface WorkshopSession {
  id: string;
  name: string;
  date: string;
  participants: string[];
  session_type: WorkshopSessionType;
  notes?: string;
  findings: WorkshopFinding[];
  top_down_data?: TopDownData;
  gap_analysis_data?: GapAnalysisData;
  process_id?: string;
}

// Materialize request
export interface MaterializeRequest {
  element_type: 'metric' | 'measure' | 'attribute';
  source_session_id: string;
  source_element_id: string;
  overrides?: Record<string, any>;
}

// Import response types
export interface CsvImportResponse {
  success: boolean;
  created: number;
  errors: string[];
}

export interface ExcelImportResponse {
  success: boolean;
  summary: Record<string, number>;
  errors: string[];
}

// Entity Relationship types
export interface EntityRelationship {
  id: string;
  name: string;
  from_entity_id: string;
  to_entity_id: string;
  from_attribute_id?: string;
  to_attribute_id?: string;
  relationship_type: string;
  is_active: boolean;
  source: string;
}

// Measure connections (Power BI source + process links)
export interface PowerBISource {
  attribute_id: string;
  attribute_name: string;
  source_table?: string;
  source_column?: string;
  entity_id: string;
}

export interface ConnectedProcessStep {
  process_id: string;
  process_name: string;
  step_id: string;
  step_name: string;
  shared_attributes: { id: string; name: string }[];
  manual_effort_percentage?: number;
  waste_category?: string;
}

export interface MeasureConnections {
  measure: Measure;
  power_bi_sources: PowerBISource[];
  connected_processes: ConnectedProcessStep[];
}

// Template types
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  process_count: number;
  step_count: number;
  system_count: number;
  entity_count: number;
  attribute_count: number;
  measure_count: number;
  metric_count: number;
}

export interface TemplateDetail {
  template_meta: { id: string; name: string; description: string; icon: string; category: string };
  systems: System[];
  entities: Entity[];
  attributes: Attribute[];
  measures: Measure[];
  metrics: Metric[];
  processes: Process[];
}

export interface TemplateImportResult {
  success: boolean;
  message: string;
  created: Record<string, number>;
  skipped: Record<string, number>;
}

// Process creation type
export interface CreateProcessInput {
  id?: string;
  name: string;
  description?: string;
  steps?: ProcessStep[];
}
