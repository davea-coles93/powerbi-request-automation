import { useState } from 'react';
import { Clock, AlertTriangle, ChevronDown, ChevronRight, Snowflake, ExternalLink } from 'lucide-react';
import { formatDuration, getEffortColor, getEffortTextColor } from '../../../utils/formatters';
import { useCrystallisationPathways } from '../../../hooks/useOntology';
import { useNavigationStore } from '../../../hooks/useNavigationStore';

interface StepDetailEdgeInspectorProps {
  edgeData: any;
}

const costTypeConfig: Record<string, { title: string; icon: string; description: (name: string) => string }> = {
  capture: {
    title: 'Capture Cost',
    icon: '🔒',
    description: (name) => `What it costs to capture ${name} into a trusted fact`,
  },
  measurement: {
    title: 'Measurement Cost',
    icon: '📐',
    description: (name) => `What it costs to calculate ${name}`,
  },
  analysis: {
    title: 'Analysis Cost',
    icon: '📊',
    description: (name) => `What it costs to answer ${name}`,
  },
};

export function StepDetailEdgeInspector({
  edgeData,
}: StepDetailEdgeInspectorProps) {
  const costType = edgeData.costType || 'capture';
  const entityId = edgeData.attributeId || edgeData.measureId || edgeData.metricId || edgeData.target;
  const entityName = edgeData.attributeId
    ? (edgeData.label || edgeData.attributeId)
    : (edgeData.measureId || edgeData.metricId || edgeData.label || edgeData.target);

  // Only fetch crystallisation pathways for capture-type edges (attributes)
  const { data: pathwayData, isLoading } = useCrystallisationPathways(
    costType === 'capture' ? entityId : '',
  );
  const [processOriginOpen, setProcessOriginOpen] = useState(false);

  const duration = edgeData.total_duration_minutes ?? 0;
  const manualPct = edgeData.weighted_manual_effort_pct ?? 0;
  const switchCount = edgeData.system_switch_count ?? 0;
  const wasteCategories: string[] = edgeData.waste_categories ?? [];

  const pathways = pathwayData?.pathways ?? [];
  const config = costTypeConfig[costType] || costTypeConfig.capture;

  const handleOpenProcess = (processId: string, processName: string) => {
    useNavigationStore.getState().openProcessDetail({
      attributeId: entityId,
      attributeName: entityName,
      processId,
      processName,
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Snowflake className="w-4 h-4 text-purple-500" />
        <span>{config.title}</span>
      </div>

      <div className="text-xs text-gray-500">
        {config.description(entityName)}
      </div>

      {/* Aggregate cost summary */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDuration(duration)}
          </span>
          <span className={`font-medium ${getEffortTextColor(manualPct)}`}>
            {Math.round(manualPct)}% manual
          </span>
          {switchCount > 0 && (
            <span className="text-gray-500">{switchCount} switches</span>
          )}
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getEffortColor(manualPct)}`}
            style={{ width: `${Math.min(100, manualPct)}%` }}
          />
        </div>
        {wasteCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {wasteCategories.map((category, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Process Origin — collapsed by default */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <div className="w-3 h-3 border border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {pathways.length > 0 && (
        <div>
          <button
            onClick={() => setProcessOriginOpen(!processOriginOpen)}
            className="w-full flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {processOriginOpen
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
            <span className="font-medium">Process Origin</span>
            <span className="text-gray-400 ml-auto">{pathways.length} {pathways.length === 1 ? 'process' : 'processes'}</span>
          </button>

          {processOriginOpen && (
            <div className="mt-2 space-y-2">
              {pathways.map((pathway, idx) => {
                const stepCount = pathway.contributing_steps.length + 1;
                const crystallisingName = pathway.crystallising_step?.name;

                return (
                  <div key={idx} className="bg-gray-50 rounded-md px-3 py-2 space-y-1.5">
                    <div className="text-xs font-medium text-gray-700">{pathway.process_name}</div>
                    <div className="text-[11px] text-gray-500">
                      {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                      {crystallisingName && (
                        <> · freezes at <span className="font-medium text-gray-600">{crystallisingName}</span></>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenProcess(pathway.process_id, pathway.process_name)}
                      className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Process Canvas
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {pathways.length === 0 && !isLoading && (
        <div className="text-xs text-gray-400 py-1">No process data available</div>
      )}
    </div>
  );
}
