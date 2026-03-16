import { useMemo, useState, useRef, useCallback } from 'react';
import { Clock, Layers, ArrowRight, ChevronLeft, ChevronRight, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { useMetrics, useLineageWithCosts } from '../../hooks/useOntology';

function severityLevel(manualPct: number): 'critical' | 'warning' | 'good' {
  if (manualPct >= 70) return 'critical';
  if (manualPct >= 30) return 'warning';
  return 'good';
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-300',
    accent: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-300',
    accent: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  good: {
    border: 'border-emerald-300',
    accent: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
} as const;

interface BusinessQuestionCostCardsProps {
  perspectiveId?: string | null;
  onScrollToAutomation?: () => void;
}

export function BusinessQuestionCostCards({ perspectiveId, onScrollToAutomation }: BusinessQuestionCostCardsProps = {}) {
  const { data: metrics } = useMetrics();
  const { data: lineageData } = useLineageWithCosts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320;
    el.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  }, [updateScrollState]);

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

  const totalTime = cardsWithCosts.reduce((s, c) => s + c.totalDuration, 0);
  const avgManual = cardsWithCosts.length > 0
    ? Math.round(cardsWithCosts.reduce((s, c) => s + c.manualPct, 0) / cardsWithCosts.length)
    : 0;
  const highCostCount = cardsWithCosts.filter((c) => c.manualPct >= 70).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header row with title + summary stats + nav arrows */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Cost to Answer Each Question</h3>
            <p className="text-xs text-gray-500">Operational effort to freeze the data behind each business question</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Inline summary stats */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900 tabular-nums">{formatDuration(totalTime)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${
              avgManual >= 70 ? 'bg-red-50' : avgManual >= 30 ? 'bg-amber-50' : 'bg-emerald-50'
            }`}>
              <TrendingUp className={`w-3 h-3 ${avgManual >= 70 ? 'text-red-400' : avgManual >= 30 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-gray-500">Manual</span>
              <span className={`font-bold tabular-nums ${avgManual >= 70 ? 'text-red-700' : avgManual >= 30 ? 'text-amber-700' : 'text-emerald-700'}`}>{avgManual}%</span>
            </div>
            {highCostCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 rounded-md">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="font-bold text-red-700 tabular-nums">{highCostCount}</span>
                <span className="text-gray-500">high risk</span>
              </div>
            )}
          </div>

          {/* Carousel nav */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 tabular-nums mr-1">{cardsWithCosts.length} questions</span>
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Fade edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto px-5 pb-5 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {cardsWithCosts.map(({ metric, totalDuration, manualPct, totalSwitches, attributeCount, wasteCategories }) => {
            const level = severityLevel(manualPct);
            const s = SEVERITY_STYLES[level];

            return (
              <div
                key={metric.id}
                className={`flex-shrink-0 w-[300px] border ${s.border} rounded-lg p-4 flex flex-col transition-shadow hover:shadow-md`}
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Top: cost + severity + waste drivers */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold tabular-nums ${s.accent}`}>
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>
                    {manualPct}% manual
                  </span>
                </div>

                {/* Waste drivers + action — prominent, near the top */}
                {(wasteCategories.length > 0 || (manualPct >= 70 && onScrollToAutomation)) && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {wasteCategories.slice(0, 2).map((w) => (
                      <span key={w} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {w}
                      </span>
                    ))}
                    {manualPct >= 70 && onScrollToAutomation && (
                      <button
                        onClick={onScrollToAutomation}
                        className="flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors cursor-pointer ml-auto"
                      >
                        <Zap className="w-3 h-3" />
                        Fix
                      </button>
                    )}
                  </div>
                )}

                {/* Manual effort bar */}
                <div className="mb-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.bar} rounded-full transition-all`}
                      style={{ width: `${manualPct}%` }}
                    />
                  </div>
                </div>

                {/* Question + metric name */}
                <div className="flex-1 min-h-0">
                  <h4 className="font-semibold text-gray-900 text-sm leading-snug">{metric.name}</h4>
                  {metric.business_question && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                      {metric.business_question}
                    </p>
                  )}
                </div>

                {/* Bottom stats */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {attributeCount} attrs
                  </span>
                  {totalSwitches > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {totalSwitches} switches
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
