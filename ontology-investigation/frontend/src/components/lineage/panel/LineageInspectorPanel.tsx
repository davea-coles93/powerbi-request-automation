import { X, Edit2, Trash2, Eye, Clock, AlertTriangle } from 'lucide-react';
import { StepDetailEdgeInspector } from './StepDetailEdgeInspector';
import { formatDuration, getEffortTextColor } from '../../../utils/formatters';
import { useNavigationStore } from '../../../hooks/useNavigationStore';
import { useAppModals } from '../../../hooks/useAppModals';
import { useBusinessQuestionCost } from '../../../hooks/useOntology';
import type { SelectedNodeState, SelectedEdgeState } from '../hooks/useLineageCanvas';
import type { CrystallisationCostSummary } from '../../../types/ontology';

interface LineageInspectorPanelProps {
  selectedNode: SelectedNodeState | null;
  selectedEdge: SelectedEdgeState | null;
  crystallisationCosts: Record<string, CrystallisationCostSummary>;
  onClose: () => void;
}

// ── Node inspectors by entity type ─────────────────────────────

function MetricInspector({ data }: { data: any }) {
  const measureIds: string[] = data.calculated_by_measure_ids || [];
  const perspectiveIds: string[] = data.perspective_ids || [];
  const { data: costData } = useBusinessQuestionCost(data.id);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">Name</div>
        <div className="text-sm font-medium text-gray-900">{data.name}</div>
      </div>
      {data.business_question && (
        <div>
          <div className="text-xs text-gray-500">Business Question</div>
          <div className="text-sm text-gray-700 italic">"{data.business_question}"</div>
        </div>
      )}
      {/* Cost to Answer */}
      {costData && costData.totals && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Cost to Answer
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Total Duration</div>
              <div className="font-medium text-gray-900">{formatDuration(costData.totals.total_duration_minutes)}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Manual Effort</div>
              <div className={`font-medium ${getEffortTextColor(costData.totals.weighted_manual_effort_pct)}`}>
                {Math.round(costData.totals.weighted_manual_effort_pct)}%
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">System Switches</div>
              <div className="font-medium text-gray-900">{costData.totals.total_system_switches}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Attributes</div>
              <div className="font-medium text-gray-900">{costData.totals.attribute_count}</div>
            </div>
          </div>
          {costData.totals.waste_categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {costData.totals.waste_categories.map((cat: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {perspectiveIds.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Perspectives</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {perspectiveIds.map((pid: string) => (
              <span key={pid} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full border border-green-200">
                {pid}
              </span>
            ))}
          </div>
        </div>
      )}
      {measureIds.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Calculated By</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {measureIds.map((mid: string) => (
              <span key={mid} className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                {mid}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasureInspector({ data }: { data: any }) {
  const inputAttrIds: string[] = data.input_attribute_ids || [];
  const inputMeasureIds: string[] = data.input_measure_ids || [];

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">Name</div>
        <div className="text-sm font-medium text-gray-900">{data.name}</div>
      </div>
      {data.logic && (
        <div>
          <div className="text-xs text-gray-500">Logic</div>
          <div className="text-sm text-gray-700">{data.logic}</div>
        </div>
      )}
      {data.formula && (
        <div>
          <div className="text-xs text-gray-500">Formula</div>
          <code className="block text-xs bg-gray-50 rounded p-2 text-gray-700 font-mono">
            {data.formula}
          </code>
        </div>
      )}
      {inputAttrIds.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Input Attributes</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {inputAttrIds.map((aid: string) => (
              <span key={aid} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                {aid}
              </span>
            ))}
          </div>
        </div>
      )}
      {inputMeasureIds.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Input Measures</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {inputMeasureIds.map((mid: string) => (
              <span key={mid} className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                {mid}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AttributeInspector({
  data,
  costs,
}: {
  data: any;
  costs: CrystallisationCostSummary | undefined;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">Name</div>
        <div className="text-sm font-medium text-gray-900">{data.name}</div>
      </div>
      {data.entity_id && (
        <div>
          <div className="text-xs text-gray-500">Entity</div>
          <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {data.entity_id}
          </span>
        </div>
      )}
      {(data.source_system_id || data.system_id) && (
        <div>
          <div className="text-xs text-gray-500">System</div>
          <span className="px-2 py-0.5 text-xs bg-pink-50 text-pink-700 rounded-full border border-pink-200">
            {data.source_system_id || data.system_id}
          </span>
        </div>
      )}
      {data.reliability && (
        <div>
          <div className="text-xs text-gray-500">Reliability</div>
          <div className="text-sm text-gray-700">{data.reliability}</div>
        </div>
      )}
      {data.volatility && (
        <div>
          <div className="text-xs text-gray-500">Volatility</div>
          <div className="text-sm text-gray-700">{data.volatility}</div>
        </div>
      )}
      {costs && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">Data Journey Summary</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Duration</div>
              <div className="font-medium text-gray-900">{formatDuration(costs.total_duration_minutes)}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Manual</div>
              <div className="font-medium text-gray-900">{Math.round(costs.weighted_manual_effort_pct)}%</div>
            </div>
          </div>
          {costs.process_ids?.length > 0 && (
            <button
              onClick={() => {
                useNavigationStore.getState().openProcessDetail({
                  attributeId: data.id,
                  attributeName: data.name,
                  processId: costs.process_ids[0],
                  processName: costs.process_names[0] || costs.process_ids[0],
                });
              }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              View in Process Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EntityInspector({
  data,
  allCosts,
}: {
  data: any;
  allCosts: Record<string, CrystallisationCostSummary>;
}) {
  const rawAttrs: any[] = data.core_attributes || [];
  const lenses: any[] = data.lenses || [];
  const isExpanded = data.isExpanded ?? false;
  const attributeRefs: { id: string; name: string }[] = data.attributeRefs || [];
  const attrCount = data.attrCount ?? attributeRefs.length;

  // Collect data journey costs for this entity's attributes (using real attribute IDs)
  const attrCosts: { name: string; id: string; cost: CrystallisationCostSummary }[] = [];
  for (const ref of attributeRefs) {
    const cost = allCosts[ref.id];
    if (cost) {
      attrCosts.push({ name: ref.name, id: ref.id, cost });
    }
  }

  // Aggregate totals
  const totalDuration = attrCosts.reduce((sum, ac) => sum + ac.cost.total_duration_minutes, 0);
  const avgManual = attrCosts.length > 0
    ? Math.round(attrCosts.reduce((sum, ac) => sum + ac.cost.weighted_manual_effort_pct * ac.cost.total_duration_minutes, 0) / Math.max(1, totalDuration))
    : 0;
  const allProcesses = [...new Set(attrCosts.flatMap(ac => ac.cost.process_names))];

  // Sort by cost descending
  const sortedCosts = [...attrCosts].sort((a, b) => b.cost.total_duration_minutes - a.cost.total_duration_minutes);

  const perspectiveColors: Record<string, string> = {
    operational: 'bg-green-50 text-green-700 border-green-200',
    management: 'bg-amber-50 text-amber-700 border-amber-200',
    financial: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">Name</div>
        <div className="text-sm font-medium text-gray-900">{data.name}</div>
      </div>
      {data.description && (
        <div>
          <div className="text-xs text-gray-500">Description</div>
          <div className="text-sm text-gray-700">{data.description}</div>
        </div>
      )}
      {/* Expand/collapse hint */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <span>{isExpanded ? '🔽' : '▶️'}</span>
        <span>
          {isExpanded
            ? `Expanded — showing ${attrCount} attributes. Click entity to collapse.`
            : `${attrCount} attributes hidden. Click entity node to expand.`}
        </span>
      </div>

      {/* Data Journey Summary */}
      {attrCosts.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">
            Data Journeys ({attrCosts.length} of {rawAttrs.length} attributes)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Total Duration</div>
              <div className="font-medium text-gray-900">{formatDuration(totalDuration)}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Avg Manual</div>
              <div className="font-medium text-gray-900">{avgManual}%</div>
            </div>
          </div>
          {allProcesses.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {allProcesses.map((pName) => (
                <span key={pName} className="px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-700 rounded border border-orange-200">
                  {pName}
                </span>
              ))}
            </div>
          )}
          <div className="space-y-1">
            {sortedCosts.map((ac) => {
              const manualPct = Math.round(ac.cost.weighted_manual_effort_pct);
              const severityColor = manualPct > 70
                ? 'text-red-700 bg-red-50 border-red-200'
                : manualPct >= 30
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-green-700 bg-green-50 border-green-200';
              return (
                <button
                  key={ac.id}
                  onClick={() => {
                    if (ac.cost.process_ids?.length > 0) {
                      useNavigationStore.getState().openProcessDetail({
                        attributeId: ac.id,
                        attributeName: ac.name,
                        processId: ac.cost.process_ids[0],
                        processName: ac.cost.process_names[0] || ac.cost.process_ids[0],
                      });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded border ${severityColor} hover:opacity-80 transition-opacity text-left`}
                >
                  <span className="truncate mr-2">{ac.name}</span>
                  <span className="flex-shrink-0 font-medium">
                    {formatDuration(ac.cost.total_duration_minutes)} · {manualPct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {attributeRefs.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Attributes ({attributeRefs.length})</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {attributeRefs.map((ref) => {
              const hasCost = !!allCosts[ref.id];
              return (
                <span
                  key={ref.id}
                  className={`px-2 py-0.5 text-xs rounded-full border ${
                    hasCost
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  {ref.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {lenses.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Perspective Lenses</div>
          <div className="space-y-2">
            {lenses.map((lens: any, i: number) => {
              const pid = lens.perspective_id || lens.name || '';
              const colorClass = perspectiveColors[pid] || 'bg-gray-50 text-gray-700 border-gray-200';
              const derivedAttrs: any[] = lens.derived_attributes || [];
              return (
                <div key={i} className={`rounded border p-2 ${colorClass}`}>
                  <div className="font-medium text-xs capitalize">{pid}</div>
                  {lens.interpretation && (
                    <div className="text-xs mt-0.5 opacity-80 italic">"{lens.interpretation}"</div>
                  )}
                  {derivedAttrs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {derivedAttrs.map((da: any, j: number) => (
                        <span key={j} className="px-1.5 py-0.5 text-[10px] bg-white/60 rounded border border-current/20">
                          {da.name}{da.derivation ? ` = ${da.derivation}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SystemInspector({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">Name</div>
        <div className="text-sm font-medium text-gray-900">{data.name}</div>
      </div>
      {data.type && (
        <div>
          <div className="text-xs text-gray-500">Type</div>
          <div className="text-sm text-gray-700">{data.type}</div>
        </div>
      )}
      {data.vendor && (
        <div>
          <div className="text-xs text-gray-500">Vendor</div>
          <div className="text-sm text-gray-700">{data.vendor}</div>
        </div>
      )}
      {data.reliability_default != null && (
        <div>
          <div className="text-xs text-gray-500">Default Reliability</div>
          <div className="text-sm text-gray-700">{data.reliability_default}</div>
        </div>
      )}
    </div>
  );
}

// ── Entity type labels ─────────────────────────────────────────

const entityTypeLabels: Record<string, string> = {
  metric: 'Metric',
  measure: 'Measure',
  attribute: 'Attribute',
  entity: 'Entity',
  system: 'System',
};

const entityTypeColors: Record<string, string> = {
  metric: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  measure: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  attribute: 'bg-purple-50 text-purple-700 border-purple-200',
  entity: 'bg-blue-50 text-blue-700 border-blue-200',
  system: 'bg-pink-50 text-pink-700 border-pink-200',
};

/**
 * Right-slide inspector panel for the enhanced Lineage view.
 *
 * Shows details of the selected node or edge, with type-specific content
 * and action buttons.
 */
export function LineageInspectorPanel({
  selectedNode,
  selectedEdge,
  crystallisationCosts,
  onClose,
}: LineageInspectorPanelProps) {
  const modals = useAppModals();
  const isOpen = selectedNode !== null || selectedEdge !== null;

  if (!isOpen) return null;

  const handleEdit = () => {
    if (!selectedNode) return;
    const d = selectedNode.data;
    switch (selectedNode.type) {
      case 'metric': modals.openMetricEditor(d); break;
      case 'measure': modals.openMeasureEditor(d); break;
      case 'attribute': modals.openAttributeEditor(d); break;
      case 'entity': modals.openEntityEditor(d); break;
      case 'system': modals.openSystemEditor(d); break;
    }
  };

  const handleDelete = () => {
    if (!selectedNode) return;
    const d = selectedNode.data;
    switch (selectedNode.type) {
      case 'metric': modals.handleDeleteMetric(d); break;
      case 'measure': modals.handleDeleteMeasure(d); break;
      case 'attribute': modals.handleDeleteAttribute(d); break;
      case 'entity': modals.handleDeleteEntity(d); break;
      case 'system': modals.handleDeleteSystem(d); break;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {selectedNode && (
            <>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${entityTypeColors[selectedNode.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {entityTypeLabels[selectedNode.type] || selectedNode.type}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                {selectedNode.data.name}
              </span>
            </>
          )}
          {selectedEdge && (
            <span className="text-sm font-medium text-gray-900">Edge Details</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {selectedNode && selectedNode.type === 'metric' && (
          <MetricInspector data={selectedNode.data} />
        )}
        {selectedNode && selectedNode.type === 'measure' && (
          <MeasureInspector data={selectedNode.data} />
        )}
        {selectedNode && selectedNode.type === 'attribute' && (
          <AttributeInspector
            data={selectedNode.data}
            costs={crystallisationCosts[selectedNode.id]}
          />
        )}
        {selectedNode && selectedNode.type === 'entity' && (
          <EntityInspector data={selectedNode.data} allCosts={crystallisationCosts} />
        )}
        {selectedNode && selectedNode.type === 'system' && (
          <SystemInspector data={selectedNode.data} />
        )}
        {selectedEdge && selectedEdge.data.total_duration_minutes != null && (
          <StepDetailEdgeInspector
            edgeData={selectedEdge.data}
          />
        )}
        {selectedEdge && selectedEdge.data.total_duration_minutes == null && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Edge Type</div>
              <div className="text-sm text-gray-700">{selectedEdge.data.edgeType}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Label</div>
              <div className="text-sm text-gray-700">{selectedEdge.data.label}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Source</div>
              <div className="text-sm text-gray-700">{selectedEdge.data.source}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Target</div>
              <div className="text-sm text-gray-700">{selectedEdge.data.target}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions (for nodes) */}
      {selectedNode && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
