import { useMemo } from 'react';
import {
  useProcessFlow,
  useProcesses,
  useUpdateProcessStep,
  useCreateProcessStep,
  useDeleteProcessStep,
  useCrystallizationPoints,
  useCreateProcess,
  useDeleteProcess,
  useDuplicateProcess,
  useReorderProcessStep,
  useBulkUpdateSteps,
  useBulkDeleteSteps,
} from '../../../hooks/useOntology';
import { useCanvasStore } from './useCanvasStore';

export function useProcessData() {
  const {
    activeProcessId,
    crystallizationView,
    parentStepId,
  } = useCanvasStore();

  const { data: flow, isLoading } = useProcessFlow(
    activeProcessId || '',
    undefined,
    parentStepId || undefined
  );
  const { data: crystallizationData } = useCrystallizationPoints(
    crystallizationView ? activeProcessId : ''
  );
  const { data: processes } = useProcesses();

  const updateStepMutation = useUpdateProcessStep();
  const createStepMutation = useCreateProcessStep();
  const deleteStepMutation = useDeleteProcessStep();
  const createProcessMutation = useCreateProcess();
  const deleteProcessMutation = useDeleteProcess();
  const duplicateProcessMutation = useDuplicateProcess();
  const reorderStepMutation = useReorderProcessStep();
  const bulkUpdateStepsMutation = useBulkUpdateSteps();
  const bulkDeleteStepsMutation = useBulkDeleteSteps();

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!flow) return null;

    const totalSteps = flow.nodes.length;
    const totalDuration = flow.nodes.reduce(
      (sum: number, node: any) => sum + (node.estimated_duration_minutes || 0),
      0
    );

    const automationCounts = { High: 0, Medium: 0, Low: 0, None: 0 };
    flow.nodes.forEach((node: any) => {
      if (node.automation_potential && automationCounts.hasOwnProperty(node.automation_potential)) {
        (automationCounts as any)[node.automation_potential]++;
      }
    });

    const manualSteps = flow.nodes.filter(
      (node: any) => node.manual_effort_percentage && node.manual_effort_percentage > 80
    ).length;

    const nodeMap = new Map(flow.nodes.map((n: any) => [n.id, n]));
    const handoffCount = flow.edges.filter((e: any) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      return s && t && s.perspective_id !== t.perspective_id;
    }).length;

    return { totalSteps, totalDuration, automationCounts, manualSteps, handoffCount };
  }, [flow]);

  return {
    flow,
    isLoading,
    crystallizationData,
    processes,
    stats,
    updateStepMutation,
    createStepMutation,
    deleteStepMutation,
    createProcessMutation,
    deleteProcessMutation,
    duplicateProcessMutation,
    reorderStepMutation,
    bulkUpdateStepsMutation,
    bulkDeleteStepsMutation,
  };
}
