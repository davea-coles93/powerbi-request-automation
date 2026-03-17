import { X, Clock, AlertTriangle, GitBranch, ExternalLink, Edit3, Trash2, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDuration } from '../../../utils/formatters';
import { CollapsibleSection } from '../../shared/CollapsibleSection';
import { useCrystallisationPathways, useLineageWithCosts, useProcesses } from '../../../hooks/useOntology';
import { useNavigationStore } from '../../../hooks/useNavigationStore';
import { useModalStore } from '../../../hooks/useModalStore';
import * as api from '../../../services/api';
import type { Attribute, Measure, Metric, CrystallisationPathway } from '../../../types/ontology';

interface AttributeDetailPanelProps {
  attributeId: string;
  onClose: () => void;
}

const RELIABILITY_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
};

const VOLATILITY_COLORS: Record<string, string> = {
  'Point-in-time': 'bg-blue-100 text-blue-800',
  Accumulating: 'bg-purple-100 text-purple-800',
  Continuous: 'bg-orange-100 text-orange-800',
};


function ManualEffortBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

function PathwayCard({ pathway, attributeId }: {
  pathway: CrystallisationPathway;
  attributeId: string;
}) {
  const nav = useNavigationStore.getState();

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{pathway.process_name}</span>
        <button
          onClick={() => nav.focusNodeInLineage(attributeId)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          View in Lineage <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3 h-3" />
          {formatDuration(pathway.total_duration_minutes)}
        </div>
        <div className="text-gray-500">
          {pathway.system_switch_count} system switch{pathway.system_switch_count !== 1 ? 'es' : ''}
        </div>
      </div>

      <div>
        <span className="text-xs text-gray-500">Manual effort</span>
        <ManualEffortBar pct={pathway.weighted_manual_effort_pct} />
      </div>

      {pathway.waste_categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pathway.waste_categories.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200"
            >
              <AlertTriangle className="w-3 h-3" />
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttributeDetailPanel({ attributeId, onClose }: AttributeDetailPanelProps) {
  const { data: pathwayData } = useCrystallisationPathways(attributeId);
  const { data: lineageData } = useLineageWithCosts();
  const { data: processes } = useProcesses();
  const { openAttributeEditor } = useModalStore();
  const queryClient = useQueryClient();
  const focusNodeInLineage = useNavigationStore((s) => s.focusNodeInLineage);

  const handleDeleteAttribute = async (attr: Attribute) => {
    try {
      await api.deleteAttribute(attr.id);
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success(`Attribute "${attr.name}" deleted`);
      onClose();
    } catch {
      toast.error('Failed to delete attribute.');
    }
  };

  // Find the attribute in lineage data
  const attribute: Attribute | undefined = lineageData?.attributes.find(
    (a) => a.id === attributeId,
  );
  if (!attribute) {
    return (
      <div className="w-96 border-l border-gray-200 bg-white flex items-center justify-center">
        <span className="text-gray-400">Attribute not found</span>
      </div>
    );
  }

  const entity = lineageData?.entities.find((e) => e.id === attribute.entity_id);
  const system = lineageData?.systems.find((s) => s.id === attribute.system_id);

  // Compute upward trace: measures using this attribute -> metrics using those measures
  const consumingMeasures: Measure[] =
    lineageData?.measures.filter((m) => m.input_attribute_ids.includes(attributeId)) ?? [];

  const consumingMeasureIds = new Set(consumingMeasures.map((m) => m.id));
  const reachableMetrics: Metric[] =
    lineageData?.metrics.filter((mt) =>
      mt.calculated_by_measure_ids.some((mid) => consumingMeasureIds.has(mid)),
    ) ?? [];

  const pathways = pathwayData?.pathways ?? [];

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between bg-gray-50">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{attribute.name}</h3>
          {entity && <p className="text-xs text-gray-500 mt-0.5">{entity.name}</p>}
          {system && <p className="text-xs text-gray-500">{system.name}</p>}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => openAttributeEditor(attribute)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            title="Edit attribute"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteAttribute(attribute)}
            className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
            title="Delete attribute"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Properties */}
        <CollapsibleSection title="Properties" className="px-4 py-2 border-b border-gray-100">
          <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {attribute.reliability && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${RELIABILITY_COLORS[attribute.reliability] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {attribute.reliability} reliability
              </span>
            )}
            {attribute.volatility && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${VOLATILITY_COLORS[attribute.volatility] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {attribute.volatility}
              </span>
            )}
          </div>
          {(attribute.source_table || attribute.source_column) && (
            <div className="text-xs text-gray-500 space-y-0.5">
              {attribute.source_table && (
                <p>
                  <span className="text-gray-500">Table:</span> {attribute.source_table}
                </p>
              )}
              {attribute.source_column && (
                <p>
                  <span className="text-gray-500">Column:</span> {attribute.source_column}
                </p>
              )}
            </div>
          )}
          {attribute.perspective_ids && attribute.perspective_ids.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {attribute.perspective_ids.map((pid) => (
                <span key={pid} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  {pid}
                </span>
              ))}
            </div>
          )}
          </div>
        </CollapsibleSection>

        {/* Process Step Connections */}
        {(() => {
          const crystallisingSteps: Array<{ processName: string; stepName: string; processId: string }> = [];
          const producingSteps: Array<{ processName: string; stepName: string; processId: string }> = [];
          const consumingSteps: Array<{ processName: string; stepName: string; processId: string }> = [];
          for (const proc of processes ?? []) {
            for (const step of proc.steps) {
              if (step.crystallizes_attribute_ids?.includes(attributeId)) {
                crystallisingSteps.push({ processName: proc.name, stepName: step.name, processId: proc.id });
              }
              if (step.produces_attribute_ids?.includes(attributeId)) {
                producingSteps.push({ processName: proc.name, stepName: step.name, processId: proc.id });
              }
              if (step.consumes_attribute_ids?.includes(attributeId)) {
                consumingSteps.push({ processName: proc.name, stepName: step.name, processId: proc.id });
              }
            }
          }
          const hasAny = crystallisingSteps.length > 0 || producingSteps.length > 0 || consumingSteps.length > 0;
          if (!hasAny) return null;
          return (
            <CollapsibleSection
              title="Process Connections"
              icon={<Zap className="w-3 h-3 text-amber-500" />}
              badge={<span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-600">{crystallisingSteps.length + producingSteps.length + consumingSteps.length}</span>}
              className="px-4 py-2 border-b border-gray-100"
            >
              {crystallisingSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">Freezes at:</p>
                  {crystallisingSteps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 ml-2">
                      <span className="font-medium">{s.stepName}</span>
                      <span className="text-gray-500"> in {s.processName}</span>
                    </p>
                  ))}
                </div>
              )}
              {producingSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-1">Produced by:</p>
                  {producingSteps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 ml-2">
                      <span className="font-medium">{s.stepName}</span>
                      <span className="text-gray-500"> in {s.processName}</span>
                    </p>
                  ))}
                </div>
              )}
              {consumingSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Consumed by:</p>
                  {consumingSteps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 ml-2">
                      <span className="font-medium">{s.stepName}</span>
                      <span className="text-gray-500"> in {s.processName}</span>
                    </p>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          );
        })()}

        {/* Data Journeys */}
        <CollapsibleSection
          title="Data Journeys"
          icon={<GitBranch className="w-3 h-3 text-purple-500" />}
          badge={pathways.length > 0 ? <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-600">{pathways.length}</span> : undefined}
          defaultCollapsed={pathways.length === 0}
          className="px-4 py-2 border-b border-gray-100"
        >
          {pathways.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No data journeys found</p>
          ) : (
            <div className="space-y-2">
              {pathways.map((pw, i) => (
                <PathwayCard
                  key={`${pw.process_id}-${i}`}
                  pathway={pw}
                  attributeId={attributeId}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Upward Trace */}
        <CollapsibleSection
          title="Upward Trace"
          badge={consumingMeasures.length > 0 ? <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-600">{consumingMeasures.length} measures</span> : undefined}
          defaultCollapsed={consumingMeasures.length === 0}
          className="px-4 py-2 border-b border-gray-100"
        >
          {consumingMeasures.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No measures consume this attribute</p>
          ) : (
            <div className="space-y-2">
              {consumingMeasures.map((measure) => {
                const metricsForMeasure = reachableMetrics.filter((mt) =>
                  mt.calculated_by_measure_ids.includes(measure.id),
                );
                return (
                  <div key={measure.id} className="text-sm">
                    <p className="font-medium text-gray-800">{measure.name}</p>
                    {metricsForMeasure.length > 0 && (
                      <ul className="ml-3 mt-0.5 space-y-0.5">
                        {metricsForMeasure.map((mt) => (
                          <li key={mt.id} className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            {mt.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* Actions */}
        <div className="px-4 py-3">
          <button
            onClick={() => focusNodeInLineage(attributeId)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View in Lineage
          </button>
        </div>
      </div>
    </div>
  );
}
