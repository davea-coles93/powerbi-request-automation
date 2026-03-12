import { Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../../../utils/formatters';

interface CrystallisationEdgeInspectorProps {
  edgeData: any;
  onDrillDown: () => void;
}

function getEffortColor(pct: number): string {
  if (pct > 70) return 'bg-red-500';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getEffortTextColor(pct: number): string {
  if (pct > 70) return 'text-red-600';
  if (pct >= 30) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Inspector panel content for a selected crystallisation edge.
 *
 * Shows the operational cost summary for an attribute's crystallisation
 * pathway: duration, manual effort, system switches, and waste categories.
 */
export function CrystallisationEdgeInspector({
  edgeData,
  onDrillDown,
}: CrystallisationEdgeInspectorProps) {
  const duration = edgeData.total_duration_minutes ?? 0;
  const manualPct = edgeData.weighted_manual_effort_pct ?? 0;
  const switchCount = edgeData.system_switch_count ?? 0;
  const wasteCategories: string[] = edgeData.waste_categories ?? [];
  const processNames: string[] = edgeData.process_names ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="w-4 h-4 text-purple-500" />
        <span>Crystallisation Pathway</span>
      </div>

      {/* Process names */}
      {processNames.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Processes</div>
          <div className="space-y-1">
            {processNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded"
              >
                <ArrowRight className="w-3 h-3 text-gray-400" />
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-1">Total Duration</div>
        <div className="text-lg font-semibold text-gray-900">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Manual effort */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Manual Effort</span>
          <span className={`text-xs font-medium ${getEffortTextColor(manualPct)}`}>
            {Math.round(manualPct)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getEffortColor(manualPct)}`}
            style={{ width: `${Math.min(100, manualPct)}%` }}
          />
        </div>
      </div>

      {/* System switches */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
        <span className="text-xs text-gray-500">System Switches</span>
        <span className="text-sm font-medium text-gray-900">{switchCount}</span>
      </div>

      {/* Waste categories */}
      {wasteCategories.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Waste Categories</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wasteCategories.map((category, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Drill-down button */}
      <button
        onClick={onDrillDown}
        disabled={processNames.length === 0}
        className={`w-full mt-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          processNames.length === 0
            ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
            : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
        }`}
      >
        Open Crystallisation Detail
      </button>
    </div>
  );
}
