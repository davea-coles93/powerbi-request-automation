export type ChangeType =
  | 'dax_formula_tweak'
  | 'new_measure'
  | 'modify_measure'
  | 'new_calculated_column'
  | 'schema_change'
  | 'new_report'
  | 'formatting'
  | 'data_refresh'
  | 'unknown';

export type TriageResult =
  | 'auto_fix'
  | 'assisted_fix'
  | 'human_design'
  | 'clarification_needed';

export type RequestStatus =
  | 'pending'
  | 'triaging'
  | 'in_progress'
  | 'testing'
  | 'pr_created'
  | 'completed'
  | 'failed'
  | 'needs_human';

export interface ExecutionLogEntry {
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
}

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  executedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  prUrl?: string;
  executionLog: ExecutionLogEntry[];
  testResults?: TestResult[];
}

export interface CreateRequestDTO {
  clientId: string;
  modelName: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface Stats {
  total: number;
  byStatus: Record<RequestStatus, number>;
  autoFixRate: number;
}
