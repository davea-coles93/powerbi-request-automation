export type ChangeType =
  | 'dax_formula_tweak'      // Minor changes to existing DAX formulas
  | 'new_measure'            // Creating new measures
  | 'modify_measure'         // Modifying existing measures
  | 'new_calculated_column'  // Creating calculated columns
  | 'schema_change'          // Table/relationship changes
  | 'new_report'             // New report/visual requirements
  | 'formatting'             // Visual formatting changes
  | 'data_refresh'           // Data source/refresh issues
  | 'unknown';               // Needs human triage

export type TriageResult =
  | 'auto_fix'               // Can be automatically fixed by Claude
  | 'assisted_fix'           // Claude can help but needs human review
  | 'human_design'           // Requires human design/architecture
  | 'clarification_needed';  // Need more info from client

export type RequestStatus =
  | 'pending'
  | 'triaging'
  | 'in_progress'
  | 'testing'
  | 'pr_created'
  | 'completed'
  | 'failed'
  | 'needs_human';

export interface ChangeRequest {
  id: string;
  clientId: string;
  modelName: string;
  title: string;
  description: string;
  changeType: ChangeType;
  triageResult?: TriageResult;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  prUrl?: string;
  executionLog: ExecutionLogEntry[];
  testResults?: TestResult[];
}

export interface ExecutionLogEntry {
  timestamp: Date;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
}

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  executedAt: Date;
}

export interface TriageAnalysis {
  changeType: ChangeType;
  triageResult: TriageResult;
  confidence: number;
  reasoning: string;
  suggestedApproach?: string;
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  affectedObjects?: string[];
}

export interface CreateRequestDTO {
  clientId: string;
  modelName: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}
