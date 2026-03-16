import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  useProcesses,
  useWorkshopSessions,
  useCreateWorkshopSession,
  useSaveGapAnalysisData,
  useAutoDetectGaps,
  useMaterializeElement,
  useDetectGapsStandalone,
  useMetrics,
  useAttributes,
  useMeasures,
  useEntities,
  usePerspectives,
} from '../../hooks/useOntology';
import { StepLineageDrawer } from '../StepLineageDrawer';
import { BusinessQuestionCostCards } from './BusinessQuestionCostCards';
import { EfficiencySummaryCards } from './EfficiencySummaryCards';
import { AutomationOpportunities } from './AutomationOpportunities';
import { AnnualROISummary } from './AnnualROISummary';
import { GapCard, GAP_TYPE_CONFIG } from './GapCard';
import { AddGapForm } from './AddGapForm';
import { AIGapAnalysis } from './AIGapAnalysis';
import { GapsDashboard } from './GapsDashboard';
import { GAP_TYPES, colorClasses } from './types';
import type { GapAnalysisData, GapItem, GapType, EfficiencyMetrics, ProcessStep } from './types';
import type { WorkshopSession } from '../../types/ontology';

export function GapsView() {
  const { data: processes } = useProcesses();
  const { data: allSessions } = useWorkshopSessions();
  const createSession = useCreateWorkshopSession();
  const saveGapAnalysisData = useSaveGapAnalysisData();
  const autoDetectGaps = useAutoDetectGaps();
  const materializeElement = useMaterializeElement();
  const detectStandalone = useDetectGapsStandalone();
  const { data: perspectives } = usePerspectives();
  const { data: allMetrics } = useMetrics();
  const { data: allAttributes } = useAttributes();
  const { data: allMeasures } = useMeasures();
  const { data: allEntities } = useEntities();

  // Build element name lookup for gap cards
  const elementNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of allMetrics ?? []) map[m.id] = m.name;
    for (const a of allAttributes ?? []) map[a.id] = a.name;
    for (const m of allMeasures ?? []) map[m.id] = m.name;
    for (const e of allEntities ?? []) map[e.id] = e.name;
    for (const p of processes ?? []) map[p.id] = p.name;
    return map;
  }, [allMetrics, allAttributes, allMeasures, allEntities, processes]);

  const automationRef = useRef<HTMLDivElement>(null);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [automationFactor, setAutomationFactor] = useState(80);
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState<string | null>(null);
  const [gapSortMode, setGapSortMode] = useState<'type' | 'impact'>('impact');
  const [gapFilterType, setGapFilterType] = useState<GapType | null>(null);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
  const [showGapCards, setShowGapCards] = useState(true);
  const [lineageStepId, setLineageStepId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [data, setData] = useState<GapAnalysisData>({
    top_down_session_ids: [],
    bottom_up_session_ids: [],
    gaps: [],
  });

  // Auto-select or create a gap analysis session
  useEffect(() => {
    if (!allSessions || activeSessionId) return;
    const gapSession = allSessions.find((s) => s.session_type === 'gap_analysis');
    if (gapSession) {
      setActiveSessionId(gapSession.id);
      setData(
        gapSession.gap_analysis_data ?? {
          top_down_session_ids: [],
          bottom_up_session_ids: [],
          gaps: [],
        },
      );
    }
  }, [allSessions, activeSessionId]);

  const activeSession = allSessions?.find((s) => s.id === activeSessionId) ?? null;

  const createDefaultSession = async () => {
    const result = await createSession.mutateAsync({
      name: 'Gap Analysis',
      date: new Date().toISOString().split('T')[0],
      participants: [],
      session_type: 'gap_analysis',
    } as any);
    setActiveSessionId(result.id);
  };

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const persistData = useCallback(
    (updated: GapAnalysisData) => {
      if (!activeSessionId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveGapAnalysisData.mutate({ sessionId: activeSessionId, data: updated });
      }, 500);
    },
    [activeSessionId, saveGapAnalysisData],
  );

  useEffect(() => {
    if (activeSessionId) persistData(data);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, persistData, activeSessionId]);

  // --- Efficiency metrics ---
  const selectedPerspectiveName = perspectives?.find((p) => p.id === selectedPerspectiveId)?.name?.toLowerCase() ?? null;

  const efficiency = useMemo<EfficiencyMetrics>(() => {
    if (!processes || processes.length === 0) {
      return { totalSteps: 0, avgManualEffort: 0, totalManualHours: 0, estimatedMonthlyCost: 0, automationOpportunities: [], systemSwitchingCount: 0 };
    }
    let allSteps: ProcessStep[] = processes.flatMap((p) => p.steps);
    if (selectedPerspectiveName) {
      allSteps = allSteps.filter((s) => s.perspective_level?.toLowerCase() === selectedPerspectiveName);
    }
    const totalSteps = allSteps.length;
    const stepsWithManual = allSteps.filter((s) => s.manual_effort_percentage !== undefined);
    const avgManualEffort =
      stepsWithManual.length > 0
        ? stepsWithManual.reduce((sum, s) => sum + (s.manual_effort_percentage || 0), 0) / stepsWithManual.length
        : 0;
    const totalManualHours = allSteps.reduce((sum, step) => {
      const manualPct = step.manual_effort_percentage || 0;
      const durationHours = (step.estimated_duration_minutes || 0) / 60;
      return sum + (durationHours * manualPct) / 100;
    }, 0);
    const automationOpportunities = allSteps
      .filter((s) => (s.automation_potential === 'High' || s.automation_potential === 'Medium') && (s.manual_effort_percentage || 0) > 50)
      .sort((a, b) => {
        const aScore = (a.manual_effort_percentage || 0) * (a.estimated_duration_minutes || 0);
        const bScore = (b.manual_effort_percentage || 0) * (b.estimated_duration_minutes || 0);
        return bScore - aScore;
      });
    const systemSwitchingCount = allSteps.filter((s) => s.systems_used_ids && s.systems_used_ids.length > 1).length;
    return { totalSteps, avgManualEffort, totalManualHours, estimatedMonthlyCost: totalManualHours * hourlyRate, automationOpportunities, systemSwitchingCount };
  }, [processes, hourlyRate, selectedPerspectiveName]);

  // --- Source session selection ---
  const topDownSessions = (allSessions ?? []).filter((s) => s.session_type === 'top_down');
  const bottomUpSessions = (allSessions ?? []).filter((s) => s.session_type === 'bottom_up');

  const toggleSessionId = (list: 'top_down_session_ids' | 'bottom_up_session_ids', id: string) => {
    setData((prev) => {
      const ids = prev[list].includes(id) ? prev[list].filter((x) => x !== id) : [...prev[list], id];
      return { ...prev, [list]: ids };
    });
  };

  // --- Gap detection ---
  const handleDetectGaps = async () => {
    if (!activeSessionId) {
      await createDefaultSession();
      return;
    }
    saveGapAnalysisData.mutate(
      { sessionId: activeSessionId, data: dataRef.current },
      {
        onSuccess: async () => {
          try {
            const result = await autoDetectGaps.mutateAsync(activeSessionId);
            const detected: GapItem[] = (result as any)?.gaps ?? [];
            setData((prev) => {
              const existingIds = new Set(prev.gaps.map((g) => g.id));
              return { ...prev, gaps: [...prev.gaps, ...detected.filter((g) => !existingIds.has(g.id))] };
            });
          } catch {
            // detection failed silently
          }
        },
      },
    );
  };

  // --- Gap CRUD ---
  const updateGap = (id: string, patch: Partial<GapItem>) =>
    setData((prev) => ({ ...prev, gaps: prev.gaps.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));

  const deleteGap = (id: string) =>
    setData((prev) => ({ ...prev, gaps: prev.gaps.filter((g) => g.id !== id) }));

  const addGap = (gap: GapItem) =>
    setData((prev) => ({ ...prev, gaps: [...prev.gaps, gap] }));

  const handleScanOntology = async () => {
    try {
      const result = await detectStandalone.mutateAsync();
      const detected: GapItem[] = (result?.gaps ?? []).map((g: any) => ({
        id: g.id,
        gap_type: g.gap_type,
        description: g.description,
        priority: g.priority || 'medium',
        related_entity_ids: g.related_entity_ids || [],
        related_attribute_ids: g.related_attribute_ids || [],
        related_measure_ids: g.related_measure_ids || [],
        related_process_ids: g.related_process_ids || [],
        suggested_action: g.suggested_action,
        resolved: false,
        status: 'open' as const,
      }));
      setData((prev) => {
        const existingDescs = new Set(prev.gaps.map((g) => g.description));
        return { ...prev, gaps: [...prev.gaps, ...detected.filter((g) => !existingDescs.has(g.description))] };
      });
    } catch {
      // detection failed
    }
  };

  const handleMaterialize = (gap: GapItem) => {
    if (!activeSessionId || gap.related_attribute_ids.length === 0) return;
    materializeElement.mutate({
      sessionId: activeSessionId,
      data: { element_type: 'attribute' as const, source_session_id: activeSessionId, source_element_id: gap.related_attribute_ids[0] },
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gaps & Efficiency</h2>
            <p className="text-gray-600 text-sm mt-1">
              Cross-reference demand vs supply, identify automation opportunities
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Hourly Rate:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg w-24 text-sm"
                  min="0"
                  step="5"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Automation Factor:</label>
              <div className="relative">
                <input
                  type="number"
                  value={automationFactor}
                  onChange={(e) => setAutomationFactor(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="pl-3 pr-7 py-2 border border-gray-300 rounded-lg w-20 text-sm"
                  min="0"
                  max="100"
                  step="5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Perspective filter tabs */}
        {perspectives && perspectives.length > 0 && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedPerspectiveId(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !selectedPerspectiveId
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Perspectives
            </button>
            {perspectives.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerspectiveId(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  selectedPerspectiveId === p.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <BusinessQuestionCostCards
          perspectiveId={selectedPerspectiveId}
          onScrollToAutomation={() => automationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />

        <EfficiencySummaryCards efficiency={efficiency} />

        <div ref={automationRef} />
        <AutomationOpportunities
          opportunities={efficiency.automationOpportunities}
          hourlyRate={hourlyRate}
          automationFactor={automationFactor / 100}
          onViewLineage={setLineageStepId}
        />

        {/* AI Gap Analysis */}
        <AIGapAnalysis onAcceptGap={addGap} />

        {/* Gap Analysis Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Gap Analysis
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleScanOntology}
                disabled={detectStandalone.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                title="Automatically find structural gaps"
              >
                {detectStandalone.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Scan Ontology
              </button>
              {!activeSession && (
                <button
                  onClick={createDefaultSession}
                  disabled={createSession.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Initialize Session
                </button>
              )}
            </div>
          </div>

          {/* Dashboard — visual summary at the top */}
          <GapsDashboard
            gaps={data.gaps}
            onFilterType={setGapFilterType}
            activeFilterType={gapFilterType}
          />

          {/* Detection tools — collapsible */}
          {(topDownSessions.length > 0 || bottomUpSessions.length > 0) && (
            <details className="mt-4 border border-gray-200 rounded-lg bg-white">
              <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 select-none">
                Workshop Session Detection (demand vs supply)
              </summary>
              <div className="px-4 pb-4 pt-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Top-Down Sessions (Demand)', sessions: topDownSessions, listKey: 'top_down_session_ids' as const },
                    { label: 'Bottom-Up Sessions (Supply)', sessions: bottomUpSessions, listKey: 'bottom_up_session_ids' as const },
                  ].map(({ label, sessions, listKey }) => (
                    <div key={listKey} className="border rounded-lg p-3 bg-gray-50">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">{label}</h4>
                      {sessions.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No sessions yet</p>
                      ) : (
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {sessions.map((s: WorkshopSession) => (
                            <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={data[listKey].includes(s.id)}
                                onChange={() => toggleSessionId(listKey, s.id)}
                                className="accent-purple-600"
                              />
                              <span className="text-gray-700 truncate">{s.name}</span>
                              <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{s.date}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDetectGaps}
                  disabled={autoDetectGaps.isPending || (!activeSession && createSession.isPending)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {autoDetectGaps.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Detecting...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Detect Gaps</>
                  )}
                </button>
              </div>
            </details>
          )}

          {/* Gap List — contained scrollable panel */}
          {data.gaps.length > 0 && (
            <div className="mt-5 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Sticky header with sort controls */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                <button
                  onClick={() => setShowGapCards(!showGapCards)}
                  className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 hover:text-gray-900 cursor-pointer"
                >
                  {showGapCards ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Gap Details
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {gapFilterType
                      ? `${data.gaps.filter(g => g.gap_type === gapFilterType).length} of ${data.gaps.length}`
                      : data.gaps.length}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Sort:</span>
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setGapSortMode('impact')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        gapSortMode === 'impact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Impact
                    </button>
                    <button
                      onClick={() => setGapSortMode('type')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        gapSortMode === 'type' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Type
                    </button>
                  </div>
                </div>
              </div>

              {showGapCards && (
                <div className="max-h-[480px] overflow-y-auto">
                  <div className="p-3 space-y-2">
                    {gapSortMode === 'type' ? (
                      GAP_TYPES.map((gapType) => {
                        const config = GAP_TYPE_CONFIG[gapType];
                        const typeGaps = data.gaps.filter((g) => g.gap_type === gapType);
                        if (typeGaps.length === 0) return null;
                        if (gapFilterType && gapFilterType !== gapType) return null;
                        const Icon = config.icon;
                        const cls = colorClasses(config.color);
                        const isCollapsed = collapsedTypes.has(gapType);
                        return (
                          <div key={gapType}>
                            <button
                              onClick={() => setCollapsedTypes((prev) => {
                                const next = new Set(prev);
                                if (next.has(gapType)) next.delete(gapType); else next.add(gapType);
                                return next;
                              })}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${cls.bg} ${cls.border} border text-left hover:opacity-90 transition-opacity cursor-pointer`}
                            >
                              <Icon className={`w-4 h-4 ${cls.text}`} />
                              <span className={`text-sm font-semibold ${cls.text}`}>{config.label}</span>
                              <span className={`text-xs ${cls.text} opacity-70`}>({typeGaps.length})</span>
                              <span className="ml-auto text-gray-400 text-xs">{isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
                            </button>
                            {!isCollapsed && (
                              <div className="mt-2 space-y-2 pl-2 mb-3">
                                {typeGaps.map((gap) => (
                                  <GapCard
                                    key={gap.id}
                                    gap={gap}
                                    onUpdate={updateGap}
                                    onDelete={deleteGap}
                                    onMaterialize={handleMaterialize}
                                    elementNames={elementNames}
                                    isMaterializing={materializeElement.isPending}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      [...data.gaps]
                        .filter((g) => !gapFilterType || g.gap_type === gapFilterType)
                        .sort((a, b) => {
                          const severityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
                          const aWeight = severityWeight[a.priority] || 1;
                          const bWeight = severityWeight[b.priority] || 1;
                          const aElements = a.related_attribute_ids.length + a.related_process_ids.length + a.related_measure_ids.length + a.related_entity_ids.length;
                          const bElements = b.related_attribute_ids.length + b.related_process_ids.length + b.related_measure_ids.length + b.related_entity_ids.length;
                          return (bWeight * (1 + bElements)) - (aWeight * (1 + aElements));
                        })
                        .map((gap) => (
                          <GapCard
                            key={gap.id}
                            gap={gap}
                            onUpdate={updateGap}
                            onDelete={deleteGap}
                            onMaterialize={handleMaterialize}
                            elementNames={elementNames}
                            isMaterializing={materializeElement.isPending}
                          />
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {data.gaps.length === 0 && (
            <div className="text-center py-8 text-gray-400 mt-4">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No gaps identified yet</p>
              <p className="text-xs mt-1">Use "Scan Ontology" or "AI Gap Analysis" above to detect gaps</p>
            </div>
          )}

          <AddGapForm onAdd={addGap} />
        </div>

        <AnnualROISummary
          opportunities={efficiency.automationOpportunities}
          hourlyRate={hourlyRate}
          automationFactor={automationFactor / 100}
        />
      </div>

      {/* Step Lineage Drawer */}
      {lineageStepId && <StepLineageDrawer stepId={lineageStepId} onClose={() => setLineageStepId(null)} />}
    </div>
  );
}
