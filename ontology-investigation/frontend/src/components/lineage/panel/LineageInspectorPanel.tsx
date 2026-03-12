import { X, Edit2, Trash2, Eye } from 'lucide-react';
import { CrystallisationEdgeInspector } from './CrystallisationEdgeInspector';
import { formatDuration } from '../../../utils/formatters';
import { useNavigationStore } from '../../../hooks/useNavigationStore';
import { useAppModals } from '../../../hooks/useAppModals';
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
          <div className="text-xs font-medium text-gray-500 mb-2">Crystallisation Summary</div>
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
          <button
            onClick={() => {
              if (costs.process_names.length > 0) {
                useNavigationStore.getState().openProcessDetail({
                  attributeId: data.id,
                  attributeName: data.name,
                  processId: costs.process_names[0].toLowerCase().replace(/\s+/g, '-'),
                  processName: costs.process_names[0],
                });
              }
            }}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
          >
            <Eye className="w-3 h-3" />
            View Crystallisation
          </button>
        </div>
      )}
    </div>
  );
}

function EntityInspector({ data }: { data: any }) {
  const coreAttrs: string[] = data.core_attributes || [];
  const lenses: any[] = data.lenses || [];

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
      {coreAttrs.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Core Attributes</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {coreAttrs.map((attr: string, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                {attr}
              </span>
            ))}
          </div>
        </div>
      )}
      {lenses.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">Lenses</div>
          <div className="space-y-1 mt-1">
            {lenses.map((lens: any, i: number) => (
              <div key={i} className="text-xs bg-gray-50 rounded p-2">
                <span className="font-medium text-gray-700">{lens.perspective_id || lens.name}</span>
                {lens.description && (
                  <span className="text-gray-500 ml-1">- {lens.description}</span>
                )}
              </div>
            ))}
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

  const handleEdgeDrillDown = () => {
    if (!selectedEdge) return;
    const d = selectedEdge.data;
    const processNames: string[] = d.process_names || [];
    if (processNames.length > 0) {
      useNavigationStore.getState().openProcessDetail({
        attributeId: d.source,
        attributeName: d.label || d.source,
        processId: processNames[0].toLowerCase().replace(/\s+/g, '-'),
        processName: processNames[0],
      });
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
          <EntityInspector data={selectedNode.data} />
        )}
        {selectedNode && selectedNode.type === 'system' && (
          <SystemInspector data={selectedNode.data} />
        )}
        {selectedEdge && selectedEdge.data.total_duration_minutes != null && (
          <CrystallisationEdgeInspector
            edgeData={selectedEdge.data}
            onDrillDown={handleEdgeDrillDown}
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
