import axios from 'axios';
import type {
  Perspective,
  System,
  Entity,
  Observation,
  Measure,
  Metric,
  Process,
  MetricTrace,
  PerspectiveView,
  ProcessFlow,
  SemanticModel,
  SemanticTable,
  MappingStatus,
} from '../types/ontology';

const api = axios.create({
  baseURL: '/api',
});

// Perspectives
export const getPerspectives = () =>
  api.get<Perspective[]>('/perspectives').then((res) => res.data);

export const getPerspective = (id: string) =>
  api.get<Perspective>(`/perspectives/${id}`).then((res) => res.data);

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

// Observations
export const getObservations = (params?: { entity_id?: string; system_id?: string }) =>
  api.get<Observation[]>('/observations', { params }).then((res) => res.data);

// Measures
export const getMeasures = (params?: { perspective_id?: string }) =>
  api.get<Measure[]>('/measures', { params }).then((res) => res.data);

// Metrics
export const getMetrics = (params?: { perspective_id?: string }) =>
  api.get<Metric[]>('/metrics', { params }).then((res) => res.data);

export const getMetric = (id: string) =>
  api.get<Metric>(`/metrics/${id}`).then((res) => res.data);

// Processes
export const getProcesses = () =>
  api.get<Process[]>('/processes').then((res) => res.data);

export const getProcess = (id: string) =>
  api.get<Process>(`/processes/${id}`).then((res) => res.data);

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

// AI endpoints
export const explainMetric = (metricId: string) =>
  api.post('/ai/explain-metric', { metric_id: metricId }).then((res) => res.data);

export const findGaps = (focusArea?: string) =>
  api.post('/ai/find-gaps', { focus_area: focusArea }).then((res) => res.data);

export const suggestMeasures = (requirement: string) =>
  api.post('/ai/suggest-measures', { requirement }).then((res) => res.data);

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
