import { useMemo, useState } from 'react';
import { Clock, Layers, ArrowRight, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { useMetrics, useLineageWithCosts } from '../../hooks/useOntology';

const INITIAL_VISIBLE = 6;

function severityColor(manualPct: number): { bg: string; text: string; border: string; bar: string } {
  if (manualPct >= 70) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' };
  if (manualPct >= 30) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' };
}

interface BusinessQuestionCostCardsProps {
  perspectiveId?: string | null;
  onScrollToAutomation?: () => void;
}

export function BusinessQuestionCostCards({ perspectiveId, onScrollToAutomation }: BusinessQuestionCostCardsProps = {}) {
  const { data: metrics } = useMetrics();
  const { data: lineageData } = useLineageWithCosts();
  const [showAll, setShowAll] = useState(false);

  const costCards = useMemo(() => {
    if (!metrics || !lineageData) return [];

    const { measures, crystallisation_costs } = lineageData;

    const filteredMetrics = perspectiveId
      ? metrics.filter((m) => m.perspective_ids?.includes(perspectiveId))
      : metrics;

    return filteredMetrics.map((metric) => {
      const metricMeasureIds = new Set(metric.calculated_by_measure_ids || []);
      const relatedMeasures = measures.filter((m) => metricMeasureIds.has(m.id));
      const attributeIds = new Set<string>();
      for (const m of relatedMeasures) {
        for (const aId of m.input_attribute_ids || []) {
          attributeIds.add(aId);
        }
      }

      let totalDuration = 0;
      let weightedManualSum = 0;
      let totalWeightedDur = 0;
      let totalSwitches = 0;
      const allWaste = new Set<string>();
      let attributesWithCosts = 0;

      for (const aId of attributeIds) {
        const cost = crystallisation_costs[aId];
        if (cost) {
          attributesWithCosts++;
          totalDuration += cost.total_duration_minutes;
          if (cost.total_duration_minutes > 0) {
            weightedManualSum += cost.weighted_manual_effort_pct * cost.total_duration_minutes;
            totalWeightedDur += cost.total_duration_minutes;
          }
          totalSwitches += cost.system_switch_count;
          cost.waste_categories.forEach((w) => allWaste.add(w));
        }
      }

      const manualPct = totalWeightedDur > 0
        ? Math.round(weightedManualSum / totalWeightedDur)
        : 0;

      return {
        metric,
        totalDuration,
        manualPct,
        totalSwitches,
        attributeCount: attributeIds.size,
        attributesWithCosts,
        wasteCategories: Array.from(allWaste),
      };
    }).sort((a, b) => b.totalDuration - a.totalDuration);
  }, [metrics, lineageData, perspectiveId]);

  const cardsWithCosts = costCards.filter((c) => c.totalDuration > 0);
  if (!cardsWithCosts.length) return null;

  // Summary stats
  const totalTime = cardsWithCosts.reduce((s, c) => s + c.totalDuration, 0);
  const avgManual = cardsWithCosts.length > 0
    ? Math.round(cardsWithCosts.reduce((s, c) => s + c.manualPct, 0) / cardsWithCosts.length)
    : 0;
  const highCostCount = cardsWithCosts.filter((c) => c.manualPct >= 70).length;

  const visibleCards = showAll ? cardsWithCosts : cardsWithCosts.slice(0, INITIAL_VISIBLE);
  const hasMore = cardsWithCosts.length > INITIAL_VISIBLE;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Cost to Answer Each Question</h3>
        <span className="text-xs text-gray-500">
          Operational effort required to freeze the data behind each business question
        </span>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-4 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
        <div>
          <span className="text-gray-500">Total cost </span>
          <span className="font-semibold text-gray-900">{formatDuration(totalTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">Avg manual </span>
          <span className={`font-semibold ${avgManual >= 70 ? 'text-red-700' : avgManual >= 30 ? 'text-amber-700' : 'text-emerald-700'}`}>{avgManual}%</span>
        </div>
        <div>
          <span className="text-gray-500">High risk </span>
          <span className="font-semibold text-red-700">{highCostCount}</span>
          <span className="text-gray-500"> of {cardsWithCosts.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleCards.map(({ metric, totalDuration, manualPct, totalSwitches, attributeCount, wasteCategories }) => {
          const colors = severityColor(manualPct);
          return (
            <div
              key={metric.id}
              className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
            >
              <p className="text-xs text-gray-500 mb-1 line-clamp-2">
                {metric.business_question}
              </p>
              <h4 className="font-semibold text-gray-900 text-sm mb-3">{metric.name}</h4>

              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {formatDuration(totalDuration)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">{attributeCount} attrs</span>
                </div>
                {totalSwitches > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-600">{totalSwitches} switches</span>
                  </div>
                )}
              </div>

              {/* Manual effort bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bar} rounded-full transition-all`}
                    style={{ width: `${manualPct}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${colors.text}`}>{manualPct}% manual</span>
              </div>

              {wasteCategories.length > 0 && (
                <p className="text-[11px] text-gray-600 mt-2">
                  <span className="text-gray-400">Cost drivers: </span>
                  {wasteCategories.slice(0, 3).join(', ')}
                </p>
              )}

              {manualPct >= 70 && onScrollToAutomation && (
                <button
                  onClick={onScrollToAutomation}
                  className="mt-2 flex items-center gap-1 text-[11px] font-medium text-purple-700 hover:text-purple-900 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  See wasteful steps
                </button>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {showAll ? (
            <>Show less <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show all {cardsWithCosts.length} questions <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
