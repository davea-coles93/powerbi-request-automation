import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import type { CreateProcessInput } from '../types/ontology';

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

export const useCrystallizationPoints = (processId: string) =>
  useQuery({
    queryKey: ['crystallizationPoints', processId],
    queryFn: () => api.getCrystallizationPoints(processId),
    enabled: !!processId,
  });

export const useStepFullLineage = (stepId: string) =>
  useQuery({
    queryKey: ['stepFullLineage', stepId],
    queryFn: () => api.getStepFullLineage(stepId),
    enabled: !!stepId,
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

// Delete mutations
export const useDeletePerspective = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePerspective(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perspectives'] });
    },
  });
};

export const useDeleteSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSystem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] });
    },
  });
};

export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
};

export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
    },
  });
};

export const useDeleteMeasure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMeasure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measures'] });
    },
  });
};

export const useDeleteMetric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
};

export const useDeleteProcess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

export const useDeleteProcessStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, stepId }: { processId: string; stepId: string }) =>
      api.deleteProcessStep(processId, stepId),
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

// Impact analysis
export const useImpactAnalysis = (attributeId: string) =>
  useQuery({
    queryKey: ['impactAnalysis', attributeId],
    queryFn: () => api.analyzeImpact(attributeId),
    enabled: !!attributeId,
  });

// Measure usage
export const useMeasureUsage = (measureId: string) =>
  useQuery({
    queryKey: ['measureUsage', measureId],
    queryFn: () => api.getMeasureUsage(measureId),
    enabled: !!measureId,
  });

// Crystallisation pathway queries
export const useCrystallisationPathways = (attributeId: string) =>
  useQuery({
    queryKey: ['crystallisationPathways', attributeId],
    queryFn: () => api.getCrystallisationPathways(attributeId),
    enabled: !!attributeId,
  });

export const useBusinessQuestionCost = (metricId: string) =>
  useQuery({
    queryKey: ['businessQuestionCost', metricId],
    queryFn: () => api.getBusinessQuestionCost(metricId),
    enabled: !!metricId,
  });

export const useLineageWithCosts = () =>
  useQuery({
    queryKey: ['lineageWithCosts'],
    queryFn: api.getLineageWithCosts,
  });

// AI mutation hooks
export const useExplainMetric = () =>
  useMutation({
    mutationFn: (metricId: string) => api.explainMetric(metricId),
  });

export const useFindGaps = () =>
  useMutation({
    mutationFn: (focusArea?: string) => api.findGaps(focusArea),
  });

export const useSuggestMeasures = () =>
  useMutation({
    mutationFn: (requirement: string) => api.suggestMeasures(requirement),
  });

export const useAnalyzeProcesses = () =>
  useMutation({
    mutationFn: () => api.analyzeProcesses(),
  });

// TMDL Ingestion hooks
export const useAvailableModels = () =>
  useQuery({
    queryKey: ['availableModels'],
    queryFn: api.listAvailableModels,
  });

export const usePreviewTmdl = () =>
  useMutation({
    mutationFn: ({ modelPath, modelName }: { modelPath: string; modelName: string }) =>
      api.previewTmdlIngestion(modelPath, modelName),
  });

export const useLoadTmdlModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelPath, modelName }: { modelPath: string; modelName: string }) =>
      api.loadTmdlModel(modelPath, modelName),
    onSuccess: () => {
      // Invalidate all queries to refetch data with imported model
      queryClient.invalidateQueries();
    },
  });
};

// TMDL Merge hooks
export const usePreviewTmdlMerge = () =>
  useMutation({
    mutationFn: ({ modelPath, modelName }: { modelPath: string; modelName: string }) =>
      api.previewTmdlMerge(modelPath, modelName),
  });

export const useMergeTmdlModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelPath, modelName, conflictStrategy }: {
      modelPath: string;
      modelName: string;
      conflictStrategy: import('../types/ontology').ConflictStrategy;
    }) => api.mergeTmdlModel(modelPath, modelName, conflictStrategy),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

// Process creation
export const useCreateProcess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProcessInput) =>
      api.createProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

// Process duplication
export const useDuplicateProcess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.duplicateProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

// Step reordering
export const useReorderProcessStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, stepId, newSequence }: { processId: string; stepId: string; newSequence: number }) =>
      api.reorderProcessStep(processId, stepId, newSequence),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['processFlow', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

// Bulk step operations
export const useBulkUpdateSteps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, stepIds, updates }: { processId: string; stepIds: string[]; updates: Record<string, any> }) =>
      api.bulkUpdateSteps(processId, stepIds, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['processFlow', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

export const useBulkDeleteSteps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, stepIds }: { processId: string; stepIds: string[] }) =>
      api.bulkDeleteSteps(processId, stepIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['processFlow', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
};

// Discovery / Import hooks
export const useImportCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.importCsv(formData),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

export const useImportExcel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.importExcel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

// Workshop session hooks
export const useWorkshopSessions = () =>
  useQuery({
    queryKey: ['workshopSessions'],
    queryFn: api.getWorkshopSessions,
  });

export const useCreateWorkshopSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createWorkshopSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useUpdateWorkshopSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateWorkshopSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useAddWorkshopFinding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, finding }: { sessionId: string; finding: any }) =>
      api.addWorkshopFinding(sessionId, finding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useDeleteWorkshopSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkshopSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useSaveTopDownData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: any }) =>
      api.saveTopDownData(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useSaveGapAnalysisData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: any }) =>
      api.saveGapAnalysisData(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useAutoDetectGaps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.autoDetectGaps(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshopSessions'] });
    },
  });
};

export const useMaterializeElement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: any }) =>
      api.materializeElement(sessionId, data),
    onSuccess: () => {
      // Materialize creates ontology elements, invalidate everything
      queryClient.invalidateQueries();
    },
  });
};

// Entity Relationships
export const useRelationships = (entityId?: string) =>
  useQuery({
    queryKey: ['relationships', entityId],
    queryFn: () => api.getRelationships(entityId),
  });

// Measure connections (Power BI sources + process links)
export const useMeasureConnections = (measureId: string) =>
  useQuery({
    queryKey: ['measureConnections', measureId],
    queryFn: () => api.getMeasureConnections(measureId),
    enabled: !!measureId,
  });

// Template hooks
export const useTemplates = () =>
  useQuery({
    queryKey: ['templates'],
    queryFn: api.getTemplates,
  });

export const useImportTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.importTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

// Clear workspace
export const useClearWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearWorkspace(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};
