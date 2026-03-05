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
  | 'analyzed'
  | 'awaiting_clarification'
  | 'in_progress'
  | 'validating'
  | 'testing'
  | 'pr_created'
  | 'completed'
  | 'failed'
  | 'needs_human';

export interface ClarificationQuestion {
  question: string;
  context: string;
  suggestedAnswers?: string[];
  required: boolean;
}

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

export interface TmdlChangeProposal {
  type: 'create' | 'update' | 'delete';
  tableName: string;
  measureName: string;
  expression?: string;
  formatString?: string;
  description?: string;
}

export interface KnockOnEffect {
  area: string;
  description: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'action_required';
}

export interface AnalysisReport {
  summary: string;
  reasoning: string;
  proposedChanges: TmdlChangeProposal[];
  estimatedComplexity: string;
  affectedObjects: string[];
  warnings: string[];
  knockOnEffects: KnockOnEffect[];
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
  clarificationQuestions?: ClarificationQuestion[];
  clarificationResponse?: string;
  clarificationAttempts?: number;
  analysisReport?: AnalysisReport;
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
