import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

export const usePerspectives = () =>
  useQuery({
    queryKey: ['perspectives'],
    queryFn: api.getPerspectives,
  });

export const usePerspective = (id: string) =>
  useQuery({
    queryKey: ['perspective', id],
    queryFn: () => api.getPerspective(id),
    enabled: !!id,
  });

export const useSystems = () =>
  useQuery({
    queryKey: ['systems'],
    queryFn: api.getSystems,
  });

export const useEntities = () =>
  useQuery({
    queryKey: ['entities'],
    queryFn: api.getEntities,
  });

export const useEntity = (id: string) =>
  useQuery({
    queryKey: ['entity', id],
    queryFn: () => api.getEntity(id),
    enabled: !!id,
  });

export const useObservations = (params?: { entity_id?: string; system_id?: string }) =>
  useQuery({
    queryKey: ['observations', params],
    queryFn: () => api.getObservations(params),
  });

export const useMeasures = (params?: { perspective_id?: string }) =>
  useQuery({
    queryKey: ['measures', params],
    queryFn: () => api.getMeasures(params),
  });

export const useMetrics = (params?: { perspective_id?: string }) =>
  useQuery({
    queryKey: ['metrics', params],
    queryFn: () => api.getMetrics(params),
  });

export const useMetric = (id: string) =>
  useQuery({
    queryKey: ['metric', id],
    queryFn: () => api.getMetric(id),
    enabled: !!id,
  });

export const useProcesses = () =>
  useQuery({
    queryKey: ['processes'],
    queryFn: api.getProcesses,
  });

export const useProcess = (id: string) =>
  useQuery({
    queryKey: ['process', id],
    queryFn: () => api.getProcess(id),
    enabled: !!id,
  });

// Graph queries
export const useMetricTrace = (metricId: string) =>
  useQuery({
    queryKey: ['metricTrace', metricId],
    queryFn: () => api.traceMetric(metricId),
    enabled: !!metricId,
  });

export const usePerspectiveView = (perspectiveId: string) =>
  useQuery({
    queryKey: ['perspectiveView', perspectiveId],
    queryFn: () => api.getPerspectiveView(perspectiveId),
    enabled: !!perspectiveId,
  });

export const useProcessFlow = (
  processId: string,
  perspectiveLevel?: string,
  parentStepId?: string
) =>
  useQuery({
    queryKey: ['processFlow', processId, perspectiveLevel, parentStepId],
    queryFn: () => api.getProcessFlow(processId, perspectiveLevel, parentStepId),
    enabled: !!processId,
  });

export const useEntityFull = (entityId: string) =>
  useQuery({
    queryKey: ['entityFull', entityId],
    queryFn: () => api.getEntityFull(entityId),
    enabled: !!entityId,
  });

// Semantic Model queries
export const useSemanticModel = () =>
  useQuery({
    queryKey: ['semanticModel'],
    queryFn: api.getSemanticModel,
  });

export const useSemanticTables = () =>
  useQuery({
    queryKey: ['semanticTables'],
    queryFn: api.getSemanticTables,
  });

export const useSemanticTable = (tableId: string) =>
  useQuery({
    queryKey: ['semanticTable', tableId],
    queryFn: () => api.getSemanticTable(tableId),
    enabled: !!tableId,
  });

export const useMappingStatus = () =>
  useQuery({
    queryKey: ['mappingStatus'],
    queryFn: api.getMappingStatus,
  });
