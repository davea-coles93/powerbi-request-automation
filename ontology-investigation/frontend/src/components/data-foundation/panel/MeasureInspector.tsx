import { Database, Workflow, Loader2 } from 'lucide-react';
import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import { useMeasureConnections } from '../../../hooks/useOntology';
import type { Measure, Attribute, Metric } from '../../../types/ontology';

interface MeasureInspectorProps {
  data: Measure;
}

function PerspectiveBadge({ perspectiveId }: { perspectiveId: string }) {
  const colorMap: Record<string, string> = {
    operational: 'bg-green-100 text-green-800',
    management: 'bg-yellow-100 text-yellow-800',
    financial: 'bg-blue-100 text-blue-800',
  };
  const cls = colorMap[perspectiveId] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {perspectiveId}
    </span>
  );
}

export function MeasureInspector({ data }: MeasureInspectorProps) {
  const { attributes, metrics } = useDataFoundationData();
  const selectNode = useDataFoundationStore((s) => s.selectNode);
  const attrConfig = entityTypeConfig.attribute;
  const metricConfig = entityTypeConfig.metric;

  const { data: connections, isLoading: connectionsLoading } = useMeasureConnections(data.id);

  const inputAttributes: Attribute[] = (data.input_attribute_ids ?? [])
    .map((id: string) => attributes.find((a: any) => a.id === id))
    .filter(Boolean) as Attribute[];

  const usedByMetrics: Metric[] = metrics.filter((m: any) =>
    m.calculated_by_measure_ids?.includes(data.id),
  );

  const hasPowerBISources = connections && connections.power_bi_sources.length > 0;
  const hasConnectedProcesses = connections && connections.connected_processes.length > 0;

  return (
    <div className="p-4 space-y-5">
      {/* Name & Perspective */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{data.name}</h3>
        {data.perspective_ids && data.perspective_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.perspective_ids.map((pid) => (
              <PerspectiveBadge key={pid} perspectiveId={pid} />
            ))}
          </div>
        )}
      </div>

      {/* Formula / Description */}
      {(data.formula || data.logic || data.description) && (
        <div>
          {data.formula && (
            <div className="mb-2">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Formula</h4>
              <code className="block text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 font-mono whitespace-pre-wrap">
                {data.formula}
              </code>
            </div>
          )}
          {data.logic && !data.formula && (
            <div className="mb-2">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Logic</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{data.logic}</p>
            </div>
          )}
          {data.description && (
            <div>
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Description</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Power BI Sources */}
      {connectionsLoading ? (
        <div className="border-t pt-4 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading connections...
        </div>
      ) : hasPowerBISources ? (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Power BI Sources
          </h4>
          <div className="space-y-1">
            {connections.power_bi_sources.map((src) => (
              <div
                key={src.attribute_id}
                className="px-3 py-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-sm"
              >
                <code className="font-mono text-indigo-700 text-xs">
                  '{src.source_table}'[{src.source_column}]
                </code>
                <span className="text-gray-400 mx-1.5">&larr;</span>
                <span className="text-gray-600">{src.attribute_name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Input Attributes */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          Input Attributes
        </h4>
        {inputAttributes.length > 0 ? (
          <div className="space-y-1.5">
            {inputAttributes.map((attr) => (
              <button
                key={attr.id}
                onClick={() => selectNode({ id: attr.id, type: 'attribute', data: attr })}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 group"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: attrConfig.bg, color: attrConfig.color }}
                >
                  {attrConfig.icon}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {attr.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No input attributes</p>
        )}
      </div>

      {/* Connected Processes */}
      {hasConnectedProcesses && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5" />
            Connected Processes
          </h4>
          <div className="space-y-1.5">
            {connections.connected_processes.map((step) => (
              <div
                key={`${step.process_id}-${step.step_id}`}
                className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{step.step_name}</span>
                  {step.manual_effort_percentage != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      step.manual_effort_percentage >= 80
                        ? 'bg-red-100 text-red-700'
                        : step.manual_effort_percentage >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {step.manual_effort_percentage}% manual
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {step.process_name}
                  <span className="mx-1">&middot;</span>
                  {step.shared_attributes.length} shared attribute{step.shared_attributes.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used By Metrics */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          Used By Metrics
        </h4>
        {usedByMetrics.length > 0 ? (
          <div className="space-y-1.5">
            {usedByMetrics.map((metric) => (
              <button
                key={metric.id}
                onClick={() => selectNode({ id: metric.id, type: 'metric', data: metric })}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 group"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: metricConfig.bg, color: metricConfig.color }}
                >
                  {metricConfig.icon}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {metric.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not used by any metrics</p>
        )}
      </div>
    </div>
  );
}
