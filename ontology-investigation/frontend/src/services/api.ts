import axios from 'axios';
import type {
  Perspective,
  System,
  Entity,
  Attribute,
  Measure,
  Metric,
  Process,
  MetricTrace,
  PerspectiveView,
  ProcessFlow,
  SemanticModel,
  SemanticTable,
  MappingStatus,
  ScenarioStatus,
  LoadScenarioResponse,
  AvailableModel,
  TmdlPreview,
  TmdlLoadResponse,
  WorkshopSession,
  TopDownData,
  GapAnalysisData,
  GapItem,
  MaterializeRequest,
  CsvImportResponse,
  ExcelImportResponse,
  CreateProcessInput,
  TmdlMergePreview,
  TmdlMergeResponse,
  ConflictStrategy,
  EntityRelationship,
  MeasureConnections,
  TemplateInfo,
  TemplateDetail,
  TemplateImportResult,
} from '../types/ontology';

const api = axios.create({
  baseURL: '/api',
});

// Perspectives
export const getPerspectives = () =>
  api.get<Perspective[]>('/perspectives').then((res) => res.data);

export const getPerspective = (id: string) =>
  api.get<Perspective>(`/perspectives/${id}`).then((res) => res.data);

export const createPerspective = (data: Perspective) =>
  api.post<Perspective>('/perspectives', data).then((res) => res.data);

export const updatePerspective = (id: string, data: Perspective) =>
  api.put<Perspective>(`/perspectives/${id}`, data).then((res) => res.data);

export const deletePerspective = (id: string) =>
  api.delete(`/perspectives/${id}`).then((res) => res.data);

// Systems
export const getSystems = () =>
  api.get<System[]>('/systems').then((res) => res.data);

export const getSystem = (id: string) =>
  api.get<System>(`/systems/${id}`).then((res) => res.data);

export const createSystem = (data: System) =>
  api.post<System>('/systems', data).then((res) => res.data);

export const updateSystem = (id: string, data: System) =>
  api.put<System>(`/systems/${id}`, data).then((res) => res.data);

export const deleteSystem = (id: string) =>
  api.delete(`/systems/${id}`).then((res) => res.data);

// Entities
export const getEntities = () =>
  api.get<Entity[]>('/entities').then((res) => res.data);

export const getEntity = (id: string) =>
  api.get<Entity>(`/entities/${id}`).then((res) => res.data);

export const createEntity = (data: any) =>
  api.post<Entity>('/entities', data).then((res) => res.data);

export const updateEntity = (id: string, data: any) =>
  api.put<Entity>(`/entities/${id}`, data).then((res) => res.data);

export const deleteEntity = (id: string) =>
  api.delete(`/entities/${id}`).then((res) => res.data);

// Attributes
export const getAttributes = (params?: { entity_id?: string; system_id?: string }) =>
  api.get<Attribute[]>('/attributes', { params }).then((res) => res.data);

export const createAttribute = (data: any) =>
  api.post<Attribute>('/attributes', data).then((res) => res.data);

export const updateAttribute = (id: string, data: any) =>
  api.put<Attribute>(`/attributes/${id}`, data).then((res) => res.data);

export const deleteAttribute = (id: string) =>
  api.delete(`/attributes/${id}`).then((res) => res.data);

// Measures
export const getMeasures = (params?: { perspective_id?: string }) =>
  api.get<Measure[]>('/measures', { params }).then((res) => res.data);

export const createMeasure = (data: any) =>
  api.post<Measure>('/measures', data).then((res) => res.data);

export const updateMeasure = (id: string, data: any) =>
  api.put<Measure>(`/measures/${id}`, data).then((res) => res.data);

export const deleteMeasure = (id: string) =>
  api.delete(`/measures/${id}`).then((res) => res.data);

// Metrics
export const getMetrics = (params?: { perspective_id?: string }) =>
  api.get<Metric[]>('/metrics', { params }).then((res) => res.data);

export const getMetric = (id: string) =>
  api.get<Metric>(`/metrics/${id}`).then((res) => res.data);

export const createMetric = (data: any) =>
  api.post<Metric>('/metrics', data).then((res) => res.data);

export const updateMetric = (id: string, data: any) =>
  api.put<Metric>(`/metrics/${id}`, data).then((res) => res.data);

export const deleteMetric = (id: string) =>
  api.delete(`/metrics/${id}`).then((res) => res.data);

// Processes
export const getProcesses = () =>
  api.get<Process[]>('/processes').then((res) => res.data);

export const getProcess = (id: string) =>
  api.get<Process>(`/processes/${id}`).then((res) => res.data);

export const deleteProcess = (id: string) =>
  api.delete(`/processes/${id}`).then((res) => res.data);

// Process Steps
export const updateProcessStep = (processId: string, stepId: string, data: any) =>
  api.put(`/processes/${processId}/steps/${stepId}`, data).then((res) => res.data);

export const createProcessStep = (processId: string, data: any) =>
  api.post(`/processes/${processId}/steps`, data).then((res) => res.data);

export const deleteProcessStep = (processId: string, stepId: string) =>
  api.delete(`/processes/${processId}/steps/${stepId}`).then((res) => res.data);

// Graph queries
export const traceMetric = (metricId: string) =>
  api.get<MetricTrace>(`/graph/trace-metric/${metricId}`).then((res) => res.data);

export const getPerspectiveView = (perspectiveId: string) =>
  api.get<PerspectiveView>(`/graph/perspective/${perspectiveId}`).then((res) => res.data);

export const getProcessFlow = (
  processId: string,
  perspectiveLevel?: string,
  parentStepId?: string
) =>
  api.get<ProcessFlow>(`/graph/process/${processId}/flow`, {
    params: { perspective_level: perspectiveLevel, parent_step_id: parentStepId },
  }).then((res) => res.data);

export const getEntityFull = (entityId: string) =>
  api.get(`/graph/entity/${entityId}/full`).then((res) => res.data);

export const getCrystallizationPoints = (processId: string) =>
  api.get(`/graph/process/${processId}/crystallization`).then((res) => res.data);

export const getStepFullLineage = (stepId: string) =>
  api.get(`/graph/step/${stepId}/full-lineage`).then((res) => res.data);

// AI endpoints
export const explainMetric = (metricId: string) =>
  api.post('/ai/explain-metric', { metric_id: metricId }).then((res) => res.data);

export const findGaps = (focusArea?: string) =>
  api.post('/ai/find-gaps', { focus_area: focusArea }).then((res) => res.data);

export const suggestMeasures = (requirement: string) =>
  api.post('/ai/suggest-measures', { requirement }).then((res) => res.data);

export const analyzeProcesses = () =>
  api.post('/ai/analyze-processes').then((res) => res.data);

// Semantic Model endpoints
export const getSemanticModel = () =>
  api.get<SemanticModel>('/semantic-model').then((res) => res.data);

export const getSemanticTables = () =>
  api.get<SemanticTable[]>('/semantic-model/tables').then((res) => res.data);

export const getSemanticTable = (tableId: string) =>
  api.get<SemanticTable>(`/semantic-model/tables/${tableId}`).then((res) => res.data);

export const getMappingStatus = () =>
  api.get<MappingStatus>('/semantic-model/mapping-status').then((res) => res.data);

export const exportTableDAX = (tableId: string) =>
  api.get(`/semantic-model/tables/${tableId}/export-dax`).then((res) => res.data);

// Scenarios endpoints
export const getScenarioStatus = () =>
  api.get<ScenarioStatus>('/scenarios/status').then((res) => res.data);

export const loadScenario = (scenarioId: string) =>
  api.post<LoadScenarioResponse>(`/scenarios/load/${scenarioId}`).then((res) => res.data);

// Impact analysis
export const analyzeImpact = (attributeId: string) =>
  api.get(`/graph/impact/${attributeId}`).then((res) => res.data);

// Measure usage
export const getMeasureUsage = (measureId: string) =>
  api.get(`/graph/measure/${measureId}/usage`).then((res) => res.data);

// TMDL Ingestion endpoints
export const listAvailableModels = () =>
  api.get<AvailableModel[]>('/ingest/available-models').then((res) => res.data);

export const previewTmdlIngestion = (modelPath: string, modelName: string) =>
  api.post<TmdlPreview>('/ingest/tmdl/preview', { model_path: modelPath, model_name: modelName }).then((res) => res.data);

export const loadTmdlModel = (modelPath: string, modelName: string) =>
  api.post<TmdlLoadResponse>('/ingest/tmdl/load', { model_path: modelPath, model_name: modelName }).then((res) => res.data);

// TMDL Merge endpoints
export const previewTmdlMerge = (modelPath: string, modelName: string) =>
  api.post<TmdlMergePreview>('/ingest/tmdl/preview-merge', { model_path: modelPath, model_name: modelName }).then((res) => res.data);

export const mergeTmdlModel = (modelPath: string, modelName: string, conflictStrategy: ConflictStrategy = 'skip') =>
  api.post<TmdlMergeResponse>('/ingest/tmdl/load', { model_path: modelPath, model_name: modelName, conflict_strategy: conflictStrategy }).then((res) => res.data);

// Process creation
export const createProcess = (data: CreateProcessInput) =>
  api.post<Process>('/processes', data).then((res) => res.data);

// Process duplication
export const duplicateProcess = (id: string) =>
  api.post<Process>(`/processes/${id}/duplicate`).then((res) => res.data);

// Step reordering
export const reorderProcessStep = (processId: string, stepId: string, newSequence: number) =>
  api.put(`/processes/${processId}/reorder`, { step_id: stepId, new_sequence: newSequence }).then((res) => res.data);

// Bulk step operations
export const bulkUpdateSteps = (processId: string, stepIds: string[], updates: Record<string, any>) =>
  api.put(`/processes/${processId}/steps/bulk-update`, { step_ids: stepIds, updates }).then((res) => res.data);

export const bulkDeleteSteps = (processId: string, stepIds: string[]) =>
  api.delete(`/processes/${processId}/steps/bulk-delete`, { data: { step_ids: stepIds } }).then((res) => res.data);

// Discovery / Import endpoints
export const importCsv = (formData: FormData) =>
  api.post<CsvImportResponse>('/discovery/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const importExcel = (formData: FormData) =>
  api.post<ExcelImportResponse>('/discovery/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

// Workshop session endpoints
export const getWorkshopSessions = () =>
  api.get<WorkshopSession[]>('/discovery/workshop/sessions').then((res) => res.data);

export const createWorkshopSession = (data: Omit<WorkshopSession, 'findings'>) =>
  api.post<WorkshopSession>('/discovery/workshop/sessions', data).then((res) => res.data);

export const updateWorkshopSession = (id: string, data: Partial<WorkshopSession>) =>
  api.put<WorkshopSession>(`/discovery/workshop/sessions/${id}`, data).then((res) => res.data);

export const addWorkshopFinding = (sessionId: string, finding: any) =>
  api.post<WorkshopSession>(`/discovery/workshop/sessions/${sessionId}/findings`, finding).then((res) => res.data);

export const deleteWorkshopSession = (id: string) =>
  api.delete(`/discovery/workshop/sessions/${id}`).then((res) => res.data);

// Structured workshop data
export const saveTopDownData = (sessionId: string, data: TopDownData) =>
  api.put<WorkshopSession>(`/discovery/workshop/sessions/${sessionId}/top-down-data`, data).then((res) => res.data);

export const saveGapAnalysisData = (sessionId: string, data: GapAnalysisData) =>
  api.put<WorkshopSession>(`/discovery/workshop/sessions/${sessionId}/gap-analysis-data`, data).then((res) => res.data);

export const autoDetectGaps = (sessionId: string) =>
  api.get<{ gaps: GapItem[] }>(`/discovery/workshop/sessions/${sessionId}/gap-analysis/auto-detect`).then((res) => res.data);

export const materializeElement = (sessionId: string, data: MaterializeRequest) =>
  api.post(`/discovery/workshop/sessions/${sessionId}/materialize`, data).then((res) => res.data);

// Entity Relationships
export const getRelationships = (entityId?: string) =>
  api.get<EntityRelationship[]>('/relationships', { params: entityId ? { entity_id: entityId } : {} }).then((res) => res.data);

// Measure connections (Power BI sources + process links)
export const getMeasureConnections = (measureId: string) =>
  api.get<MeasureConnections>(`/graph/measure/${measureId}/connections`).then((res) => res.data);

// Template endpoints
export const getTemplates = () =>
  api.get<TemplateInfo[]>('/templates/').then((res) => res.data);

export const getTemplate = (id: string) =>
  api.get<TemplateDetail>(`/templates/${id}`).then((res) => res.data);

export const importTemplate = (id: string) =>
  api.post<TemplateImportResult>(`/templates/${id}/import`).then((res) => res.data);

// Clear workspace
export const clearWorkspace = () =>
  api.post<{ success: boolean; message: string }>('/scenarios/clear').then((res) => res.data);
