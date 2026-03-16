import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, ExternalLink, Copy, Trash2, Pencil, GitBranch, Workflow, BarChart3, Target } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../ConfirmDeleteDialog';
import { PropertyRow } from '../../shared/PropertyRow';
import { useCanvasStore } from '../hooks/useCanvasStore';
import { useProcessData } from '../hooks/useProcessData';
import { useNavigationStore } from '../../../hooks/useNavigationStore';
import { perspectiveLabels, automationColors } from '../nodes/perspectiveConfig';
import { useMeasures, useMetrics } from '../../../hooks/useOntology';
import { StepEditForm } from './StepEditForm';

export function StepInspector() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selectedStep = useCanvasStore((s) => s.selectedStep);
  const activeProcessId = useCanvasStore((s) => s.activeProcessId);
  const crystallizationView = useCanvasStore((s) => s.crystallizationView);
  const inspectorEditMode = useCanvasStore((s) => s.inspectorEditMode);
  const selectStep = useCanvasStore((s) => s.selectStep);
  const setLineageStepId = useCanvasStore((s) => s.setLineageStepId);
  const setInspectorEditMode = useCanvasStore((s) => s.setInspectorEditMode);

  const {
    flow, crystallizationData,
    createStepMutation, deleteStepMutation,
  } = useProcessData();

  const { data: allMeasures } = useMeasures();
  const { data: allMetrics } = useMetrics();

  const navigateToStep = useCallback(
    (stepId: string) => {
      const node = flow?.nodes.find((n) => n.id === stepId);
      if (node) {
        selectStep({
          id: node.id,
          name: node.label,
          actor: node.actor,
          sequence: node.sequence,
          perspective_id: node.perspective_id,
          estimated_duration_minutes: node.estimated_duration_minutes,
          automation_potential: node.automation_potential,
          waste_category: node.waste_category,
          manual_effort_percentage: node.manual_effort_percentage,
        });
      }
    },
    [flow, selectStep],
  );

  if (!selectedStep || !flow) return null;

  // Inline edit mode — render the form instead
  if (inspectorEditMode) {
    return <StepEditForm />;
  }

  const incoming = flow.edges.filter((e) => e.target === selectedStep.id);
  const outgoing = flow.edges.filter((e) => e.source === selectedStep.id);

  const crystPoint = crystallizationView && crystallizationData?.crystallization_points
    ? crystallizationData.crystallization_points.find((p: any) => p.step_id === selectedStep.id)
    : null;

  return (
    <div className="p-4 space-y-4">
      {/* Step name and perspective */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{selectedStep.name}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          {selectedStep.actor && (
            <span className="text-sm text-gray-500">{selectedStep.actor}</span>
          )}
          {selectedStep.perspective_id && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              selectedStep.perspective_id === 'operational' ? 'bg-green-100 text-green-800' :
              selectedStep.perspective_id === 'management' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {perspectiveLabels[selectedStep.perspective_id]?.label || selectedStep.perspective_id}
            </span>
          )}
        </div>
      </div>

      {/* Properties */}
      <div className="space-y-2">
        {selectedStep.estimated_duration_minutes != null && (
          <PropertyRow label="Duration" value={`${selectedStep.estimated_duration_minutes} min`} />
        )}
        {selectedStep.automation_potential && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Automation</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{
                backgroundColor: automationColors[selectedStep.automation_potential] + '20',
                color: automationColors[selectedStep.automation_potential],
              }}
            >
              {selectedStep.automation_potential}
            </span>
          </div>
        )}
        {selectedStep.waste_category && (
          <PropertyRow label="Waste" value={selectedStep.waste_category} />
        )}
        {selectedStep.manual_effort_percentage !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Manual effort</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${selectedStep.manual_effort_percentage}%` }}
                />
              </div>
              <span className="text-gray-700 font-medium">{selectedStep.manual_effort_percentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Connections */}
      <div className="border-t pt-3">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">Connections</h4>
        <div className="space-y-2 text-sm">
          {incoming.length > 0 ? (
            <div>
              <span className="text-xs font-medium text-gray-400">DEPENDS ON</span>
              <div className="mt-1 space-y-1">
                {incoming.map((edge, i) => {
                  const sourceNode = flow.nodes.find((n) => n.id === edge.source);
                  return sourceNode ? (
                    <div
                      key={i}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 text-sm"
                      onClick={() => navigateToStep(edge.source)}
                    >
                      <span className="truncate">{sourceNode.label}</span>
                      {sourceNode.perspective_id !== selectedStep.perspective_id && (
                        <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium shrink-0">
                          handoff
                        </span>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-xs">No dependencies</div>
          )}

          {outgoing.length > 0 ? (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-400">FEEDS INTO</span>
              <div className="mt-1 space-y-1">
                {outgoing.map((edge, i) => {
                  const targetNode = flow.nodes.find((n) => n.id === edge.target);
                  return targetNode ? (
                    <div
                      key={i}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 text-sm"
                      onClick={() => navigateToStep(edge.target)}
                    >
                      <span className="truncate">{targetNode.label}</span>
                      {targetNode.perspective_id !== selectedStep.perspective_id && (
                        <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium shrink-0">
                          handoff
                        </span>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-xs mt-2">No downstream steps</div>
          )}
        </div>
      </div>

      {/* Crystallization */}
      {crystPoint && (
        <div className="border-t pt-3">
          <h4 className="font-semibold text-xs text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Crystallizes
          </h4>
          <div className="flex flex-wrap gap-1">
            {crystPoint.crystallized_attributes.map((attr: any) => (
              <button
                key={attr.id || attr.name}
                onClick={() => attr.id && useNavigationStore.getState().focusNodeInLineage(attr.id)}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="View in Lineage"
              >
                {attr.name}
                <GitBranch className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Produces Measures */}
      {selectedStep.produces_measure_ids && selectedStep.produces_measure_ids.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="font-semibold text-xs text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Produces Measures
          </h4>
          <div className="flex flex-wrap gap-1">
            {selectedStep.produces_measure_ids.map((mid: string) => {
              const measure = allMeasures?.find((m: any) => m.id === mid);
              return (
                <button
                  key={mid}
                  onClick={() => useNavigationStore.getState().focusNodeInLineage(mid)}
                  className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="View in Lineage"
                >
                  {measure?.name || mid}
                  <GitBranch className="w-2.5 h-2.5 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Produces Metrics */}
      {selectedStep.produces_metric_ids && selectedStep.produces_metric_ids.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="font-semibold text-xs text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Target className="w-3 h-3" /> Produces Metrics
          </h4>
          <div className="flex flex-wrap gap-1">
            {selectedStep.produces_metric_ids.map((mid: string) => {
              const metric = allMetrics?.find((m: any) => m.id === mid);
              return (
                <button
                  key={mid}
                  onClick={() => useNavigationStore.getState().focusNodeInLineage(mid)}
                  className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-medium hover:bg-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="View in Lineage"
                >
                  {metric?.name || mid}
                  <GitBranch className="w-2.5 h-2.5 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t pt-3 space-y-2">
        <button
          onClick={() => setInspectorEditMode(true)}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Step
        </button>
        <button
          onClick={() => setLineageStepId(selectedStep.id)}
          className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Full Lineage
        </button>
        <button
          onClick={() => useNavigationStore.getState().setActiveTab('processMap')}
          className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Workflow className="w-3.5 h-3.5" />
          Process Map
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              createStepMutation.mutate(
                {
                  processId: activeProcessId,
                  data: {
                    ...selectedStep,
                    id: `step_${Date.now()}`,
                    name: `${selectedStep.name} (Copy)`,
                    sequence: flow.nodes.length + 1,
                  },
                },
                {
                  onSuccess: () => {
                    toast.success('Step duplicated!');
                    selectStep(null);
                  },
                  onError: () => toast.error('Error duplicating step.'),
                },
              );
            }}
            className="px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        itemName={selectedStep.name}
        itemType="Step"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteStepMutation.mutate(
            { processId: activeProcessId, stepId: selectedStep.id },
            {
              onSuccess: () => { toast.success('Step deleted!'); selectStep(null); },
              onError: () => toast.error('Failed to delete step.'),
            },
          );
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}