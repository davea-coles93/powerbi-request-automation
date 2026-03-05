import { ExternalLink } from 'lucide-react';
import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import type { Metric, Measure } from '../../../types/ontology';

interface MetricInspectorProps {
  data: Metric;
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

export function MetricInspector({ data }: MetricInspectorProps) {
  const { measures } = useDataFoundationData();
  const selectNode = useDataFoundationStore((s) => s.selectNode);
  const measureConfig = entityTypeConfig.measure;

  const linkedMeasures: Measure[] = (data.calculated_by_measure_ids ?? [])
    .map((id: string) => measures.find((m: any) => m.id === id))
    .filter(Boolean) as Measure[];

  const handleMeasureClick = (measure: Measure) => {
    selectNode({ id: measure.id, type: 'measure', data: measure });
  };

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

      {/* Description */}
      {data.description && (
        <div>
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Description</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
        </div>
      )}

      {/* Business Question */}
      {data.business_question && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <h4 className="font-semibold text-xs text-purple-600 uppercase tracking-wide mb-1">Business Question</h4>
          <p className="text-sm text-purple-800 italic">"{data.business_question}"</p>
        </div>
      )}

      {/* Calculated By */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          Calculated By
        </h4>
        {linkedMeasures.length > 0 ? (
          <div className="space-y-1.5">
            {linkedMeasures.map((measure) => (
              <button
                key={measure.id}
                onClick={() => handleMeasureClick(measure)}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 group"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: measureConfig.bg, color: measureConfig.color }}
                >
                  {measureConfig.icon}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {measure.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No linked measures</p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t pt-4">
        <button className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm">
          <ExternalLink className="w-3.5 h-3.5" />
          Trace Lineage
        </button>
      </div>
    </div>
  );
}
