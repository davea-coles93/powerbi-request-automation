import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Eye,
  ShieldAlert,
  Zap,
  Plus,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Activity,
  Clock,
  DollarSign,
  GitBranch,
} from 'lucide-react';
import {
  useProcesses,
  useWorkshopSessions,
  useCreateWorkshopSession,
  useSaveGapAnalysisData,
  useAutoDetectGaps,
  useMaterializeElement,
} from '../hooks/useOntology';
import { StepLineageDrawer } from './StepLineageDrawer';
import { AutomationBadge } from './cells/AutomationBadge';
import { ManualEffortBar } from './cells/ManualEffortBar';
import type { WorkshopSession, GapAnalysisData, GapItem, GapType, ProcessStep } from '../types/ontology';

// --- Gap type display config ---

const GAP_TYPE_CONFIG: Record<GapType, { label: string; color: string; icon: typeof AlertTriangle }> = {
  missing_supply: { label: 'Missing Supply', color: 'red', icon: AlertTriangle },
  unused_supply: { label: 'Unused Supply', color: 'orange', icon: Eye },
  shadow_system: { label: 'Shadow System', color: 'yellow', icon: ShieldAlert },
  high_manual_effort: { label: 'High Manual Effort', color: 'purple', icon: Zap },
};

const GAP_TYPES = Object.keys(GAP_TYPE_CONFIG) as GapType[];

function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
  };
  return map[color] || map.red;
}

function makeId() {
  return 'gap-' + Math.random().toString(36).slice(2, 10);
}

// --- Efficiency calculation ---

interface EfficiencyMetrics {
  totalSteps: number;
  avgManualEffort: number;
  totalManualHours: number;
  estimatedMonthlyCost: number;
  automationOpportunities: ProcessStep[];
  systemSwitchingCount: number;
}

export function GapsView() {
  const { data: processes } = useProcesses();
  const { data: allSessions } = useWorkshopSessions();
  const createSession = useCreateWorkshopSession();
  const saveGapAnalysisData = useSaveGapAnalysisData();
  const autoDetectGaps = useAutoDetectGaps();
  const materializeElement = useMaterializeElement();

  const [hourlyRate, setHourlyRate] = useState(75);
  const [lineageStepId, setLineageStepId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Gap data state
  const [data, setData] = useState<GapAnalysisData>({
    top_down_session_ids: [],
    bottom_up_session_ids: [],
    gaps: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGap, setNewGap] = useState<Partial<GapItem>>({
    gap_type: 'missing_supply',
    description: '',
    priority: 'medium',
    suggested_action: '',
  });

  // Auto-select or create a gap analysis session
  useEffect(() => {
    if (!allSessions || activeSessionId) return;
    const gapSession = allSessions.find((s) => s.session_type === 'gap_analysis');
    if (gapSession) {
      setActiveSessionId(gapSession.id);
      setData(gapSession.gap_analysis_data ?? {
        top_down_session_ids: [],
        bottom_up_session_ids: [],
        gaps: [],
      });
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

  const efficiency = useMemo<EfficiencyMetrics>(() => {
    if (!processes || processes.length === 0) {
      return { totalSteps: 0, avgManualEffort: 0, totalManualHours: 0, estimatedMonthlyCost: 0, automationOpportunities: [], systemSwitchingCount: 0 };
    }
    const allSteps: ProcessStep[] = processes.flatMap((p) => p.steps);
    const totalSteps = allSteps.length;
    const stepsWithManual = allSteps.filter((s) => s.manual_effort_percentage !== undefined);
    const avgManualEffort = stepsWithManual.length > 0
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
  }, [processes, hourlyRate]);

  const toggleSection = (section: string) => setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  // --- Gap analysis source sessions ---

  const topDownSessions = (allSessions ?? []).filter((s) => s.session_type === 'top_down');
  const bottomUpSessions = (allSessions ?? []).filter((s) => s.session_type === 'bottom_up');

  const toggleSessionId = (list: 'top_down_session_ids' | 'bottom_up_session_ids', id: string) => {
    setData((prev) => {
      const ids = prev[list].includes(id) ? prev[list].filter((x) => x !== id) : [...prev[list], id];
      return { ...prev, [list]: ids };
    });
  };

  // --- Detect gaps ---

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

  const addManualGap = () => {
    if (!newGap.description?.trim()) return;
    const gap: GapItem = {
      id: makeId(),
      gap_type: newGap.gap_type ?? 'missing_supply',
      description: newGap.description.trim(),
      priority: newGap.priority ?? 'medium',
      related_entity_ids: [],
      related_attribute_ids: [],
      related_measure_ids: [],
      related_process_ids: [],
      suggested_action: newGap.suggested_action || undefined,
      resolved: false,
    };
    setData((prev) => ({ ...prev, gaps: [...prev.gaps, gap] }));
    setNewGap({ gap_type: 'missing_supply', description: '', priority: 'medium', suggested_action: '' });
    setShowAddForm(false);
  };

  const handleMaterialize = (gap: GapItem) => {
    if (!activeSessionId || gap.related_attribute_ids.length === 0) return;
    materializeElement.mutate({
      sessionId: activeSessionId,
      data: { element_type: 'attribute' as const, source_session_id: activeSessionId, source_element_id: gap.related_attribute_ids[0] },
    });
  };

  // --- Summary counts ---

  const counts = GAP_TYPES.reduce((acc, t) => { acc[t] = data.gaps.filter((g) => g.gap_type === t).length; return acc; }, {} as Record<GapType, number>);
  const resolvedCount = data.gaps.filter((g) => g.resolved).length;
  const unresolvedCount = data.gaps.length - resolvedCount;

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
          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Process Efficiency Summary Cards */}
        {efficiency.totalSteps > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Process Steps</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{efficiency.totalSteps}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Manual Effort</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{efficiency.avgManualEffort.toFixed(1)}%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Manual Hours/Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{efficiency.totalManualHours.toFixed(1)}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Est. Monthly Cost</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${efficiency.estimatedMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Top Automation Opportunities */}
        {efficiency.automationOpportunities.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => toggleSection('automation')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Top Automation Opportunities
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{efficiency.automationOpportunities.length} opportunities</span>
                {collapsedSections.automation ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {!collapsedSections.automation && (
              <div className="px-4 pb-4 overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-sm font-medium text-gray-700 pb-2">Process Step</th>
                      <th className="text-center text-sm font-medium text-gray-700 pb-2">Manual %</th>
                      <th className="text-center text-sm font-medium text-gray-700 pb-2">Duration</th>
                      <th className="text-center text-sm font-medium text-gray-700 pb-2">Potential</th>
                      <th className="text-center text-sm font-medium text-gray-700 pb-2">Est. Savings/Mo</th>
                      <th className="text-center text-sm font-medium text-gray-700 pb-2">Lineage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiency.automationOpportunities.slice(0, 8).map((step) => {
                      const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);
                      const monthlySavings = manualHours * hourlyRate * 0.8;
                      return (
                        <tr key={step.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 text-sm text-gray-900">{step.name}</td>
                          <td className="py-3 text-center"><ManualEffortBar percentage={step.manual_effort_percentage} /></td>
                          <td className="py-3 text-center text-sm text-gray-600">{step.estimated_duration_minutes || 0}m</td>
                          <td className="py-3 text-center"><div className="flex items-center justify-center"><AutomationBadge potential={step.automation_potential} /></div></td>
                          <td className="py-3 text-center text-sm font-semibold text-green-600">
                            ${monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => setLineageStepId(step.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                            >
                              <GitBranch className="w-3 h-3" />
                              Lineage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Gap Analysis Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Gap Analysis
            </h3>
            {!activeSession && (
              <button
                onClick={createDefaultSession}
                disabled={createSession.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Initialize Gap Analysis
              </button>
            )}
          </div>

          {/* Source Selection */}
          {(topDownSessions.length > 0 || bottomUpSessions.length > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Top-Down Sessions (Demand)</h4>
                {topDownSessions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No top-down sessions yet</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {topDownSessions.map((s: WorkshopSession) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.top_down_session_ids.includes(s.id)}
                          onChange={() => toggleSessionId('top_down_session_ids', s.id)}
                          className="accent-purple-600"
                        />
                        <span className="text-gray-700 truncate">{s.name}</span>
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{s.date}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Bottom-Up Sessions (Supply)</h4>
                {bottomUpSessions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No bottom-up sessions yet</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {bottomUpSessions.map((s: WorkshopSession) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.bottom_up_session_ids.includes(s.id)}
                          onChange={() => toggleSessionId('bottom_up_session_ids', s.id)}
                          className="accent-purple-600"
                        />
                        <span className="text-gray-700 truncate">{s.name}</span>
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{s.date}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detect Gaps Button */}
          <button
            onClick={handleDetectGaps}
            disabled={autoDetectGaps.isPending || (!activeSession && createSession.isPending)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {autoDetectGaps.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Detecting Gaps...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Detect Gaps</>
            )}
          </button>

          {/* Gap Cards grouped by type */}
          {GAP_TYPES.map((gapType) => {
            const config = GAP_TYPE_CONFIG[gapType];
            const gaps = data.gaps.filter((g) => g.gap_type === gapType);
            if (gaps.length === 0) return null;
            const Icon = config.icon;
            const cls = colorClasses(config.color);
            return (
              <div key={gapType} className="mb-4">
                <h4 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${cls.text}`}>
                  <Icon className="w-4 h-4" />
                  {config.label} ({gaps.length})
                </h4>
                <div className="space-y-3">
                  {gaps.map((gap) => (
                    <div key={gap.id} className={`border rounded-lg p-4 ${cls.bg} ${cls.border} ${gap.resolved ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-800 flex-1">{gap.description}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateGap(gap.id, { resolved: !gap.resolved })}
                            className={`p-1 rounded transition-colors ${gap.resolved ? 'text-green-600 hover:text-green-700 bg-green-100' : 'text-gray-400 hover:text-green-500'}`}
                            title={gap.resolved ? 'Mark unresolved' : 'Mark resolved'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteGap(gap.id)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete gap">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="relative">
                          <select
                            value={gap.priority}
                            onChange={(e) => updateGap(gap.id, { priority: e.target.value as GapItem['priority'] })}
                            className="text-xs pl-2 pr-6 py-1 border rounded appearance-none bg-white focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {gapType === 'missing_supply' && gap.related_attribute_ids.length > 0 && (
                          <button
                            onClick={() => handleMaterialize(gap)}
                            disabled={materializeElement.isPending}
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                          >
                            {materializeElement.isPending ? 'Creating...' : 'Create in Ontology'}
                          </button>
                        )}
                      </div>
                      <div className="mt-2">
                        <input
                          type="text"
                          value={gap.suggested_action ?? ''}
                          onChange={(e) => updateGap(gap.id, { suggested_action: e.target.value })}
                          placeholder="Suggested action..."
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white/70 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      {gap.resolved && (
                        <div className="mt-2">
                          <textarea
                            value={gap.resolution_notes ?? ''}
                            onChange={(e) => updateGap(gap.id, { resolution_notes: e.target.value })}
                            placeholder="Resolution notes..."
                            rows={2}
                            className="w-full text-xs px-2 py-1 border border-green-200 rounded bg-green-50 focus:ring-1 focus:ring-green-500 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {data.gaps.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No gaps identified yet</p>
              <p className="text-xs mt-1">Use "Detect Gaps" or add gaps manually below</p>
            </div>
          )}

          {/* Add Gap Manually */}
          {showAddForm ? (
            <div className="border border-purple-200 bg-purple-50/30 rounded-lg p-4 mt-4">
              <h5 className="text-sm font-medium text-gray-800 mb-3">Add Gap Manually</h5>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={newGap.gap_type}
                      onChange={(e) => setNewGap((p) => ({ ...p, gap_type: e.target.value as GapType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {GAP_TYPES.map((t) => (
                        <option key={t} value={t}>{GAP_TYPE_CONFIG[t].label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select
                      value={newGap.priority}
                      onChange={(e) => setNewGap((p) => ({ ...p, priority: e.target.value as GapItem['priority'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                  <textarea
                    value={newGap.description ?? ''}
                    onChange={(e) => setNewGap((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Describe the gap..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Suggested Action</label>
                  <input
                    type="text"
                    value={newGap.suggested_action ?? ''}
                    onChange={(e) => setNewGap((p) => ({ ...p, suggested_action: e.target.value }))}
                    placeholder="Recommended action..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddForm(false); setNewGap({ gap_type: 'missing_supply', description: '', priority: 'medium', suggested_action: '' }); }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addManualGap}
                    disabled={!newGap.description?.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Gap
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors mt-4"
            >
              <Plus className="w-4 h-4" /> Add Gap Manually
            </button>
          )}

          {/* Summary Bar */}
          {data.gaps.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4 flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                {GAP_TYPES.map((t) => {
                  if (counts[t] === 0) return null;
                  const cfg = GAP_TYPE_CONFIG[t];
                  const cls = colorClasses(cfg.color);
                  const Icon = cfg.icon;
                  return (
                    <span key={t} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${cls.badge} ${cls.text}`}>
                      <Icon className="w-3 h-3" /> {counts[t]} {cfg.label}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 font-medium">{resolvedCount} resolved</span>
                <span className="text-gray-400">|</span>
                <span className="text-red-600 font-medium">{unresolvedCount} unresolved</span>
              </div>
            </div>
          )}
        </div>

        {/* Annual ROI Summary */}
        {efficiency.automationOpportunities.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Potential Annual Savings</h3>
                <p className="text-sm text-gray-600">
                  If top {Math.min(efficiency.automationOpportunities.length, 8)} automation opportunities are implemented
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600">
                  ${efficiency.automationOpportunities.slice(0, 8).reduce((sum, step) => {
                    const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);
                    return sum + manualHours * hourlyRate * 0.8 * 12;
                  }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-600 mt-1">per year</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step Lineage Drawer */}
      {lineageStepId && <StepLineageDrawer stepId={lineageStepId} onClose={() => setLineageStepId(null)} />}
    </div>
  );
}
