import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const useAttributes = (params?: { entity_id?: string; system_id?: string }) =>
  useQuery({
    queryKey: ['attributes', params],
    queryFn: () => api.getAttributes(params),
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

// Mutations
export const useUpdateProcessStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ processId, stepId, data }: { processId: string; stepId: string; data: any }) =>
      api.updateProcessStep(processId, stepId, data),
    onSuccess: (_, variables) => {
      // Invalidate process flow queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['processFlow', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

export const useCreateProcessStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ processId, data }: { processId: string; data: any }) =>
      api.createProcessStep(processId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['processFlow', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

// Scenarios queries and mutations
export const useScenarioStatus = () =>
  useQuery({
    queryKey: ['scenarioStatus'],
    queryFn: api.getScenarioStatus,
  });

export const useLoadScenario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenarioId: string) => api.loadScenario(scenarioId),
    onSuccess: () => {
      // Invalidate all queries to refetch data with new scenario
      queryClient.invalidateQueries();
    },
  });
};
