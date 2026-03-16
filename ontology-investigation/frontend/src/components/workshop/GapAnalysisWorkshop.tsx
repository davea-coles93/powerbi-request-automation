import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Eye,
  ShieldAlert,
  Zap,
  Plus,
  Trash2,
  Check,
  Loader2,
  Search,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  useWorkshopSessions,
  useSaveGapAnalysisData,
  useAutoDetectGaps,
  useMaterializeElement,
} from '../../hooks/useOntology';
import type { WorkshopSession, GapAnalysisData, GapItem, GapType } from '../../types/ontology';

// --- Props ---

interface GapAnalysisWorkshopProps {
  session: WorkshopSession;
  onSessionUpdate: (session: WorkshopSession) => void;
}

// --- Gap type display config ---

const GAP_TYPE_CONFIG: Record<
  GapType,
  { label: string; color: string; icon: typeof AlertTriangle }
> = {
  missing_supply: { label: 'Missing Supply', color: 'red', icon: AlertTriangle },
  unused_supply: { label: 'Unused Supply', color: 'orange', icon: Eye },
  shadow_system: { label: 'Shadow System', color: 'yellow', icon: ShieldAlert },
  high_manual_effort: { label: 'High Manual Effort', color: 'purple', icon: Zap },
  broken_lineage: { label: 'Broken Lineage', color: 'blue', icon: AlertTriangle },
  coverage_gap: { label: 'Coverage Gap', color: 'teal', icon: Eye },
  process_risk: { label: 'Process Risk', color: 'indigo', icon: ShieldAlert },
  missing_crystallisation: { label: 'Missing Data Journey', color: 'pink', icon: AlertTriangle },
  high_crystallisation_cost: { label: 'High Data Journey Cost', color: 'cyan', icon: Zap },
  late_crystallisation: { label: 'Late Data Journey', color: 'emerald', icon: AlertTriangle },
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

// --- Component ---

export function GapAnalysisWorkshop({ session, onSessionUpdate }: GapAnalysisWorkshopProps) {
  const { data: allSessions } = useWorkshopSessions();
  const saveGapAnalysisData = useSaveGapAnalysisData();
  const autoDetectGaps = useAutoDetectGaps();
  const materializeElement = useMaterializeElement();

  const [data, setData] = useState<GapAnalysisData>(() => session.gap_analysis_data ?? {
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

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const persistData = useCallback((updated: GapAnalysisData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGapAnalysisData.mutate(
        { sessionId: session.id, data: updated },
        {
          onSuccess: () => {
            onSessionUpdate({ ...session, gap_analysis_data: updated });
          },
        },
      );
    }, 500);
  }, [session, saveGapAnalysisData, onSessionUpdate]);

  // Trigger auto-save when data changes
  useEffect(() => {
    persistData(data);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, persistData]);

  // --- Source sessions ---

  const topDownSessions = (allSessions ?? []).filter(
    (s: WorkshopSession) => s.session_type === 'top_down',
  );
  const bottomUpSessions = (allSessions ?? []).filter(
    (s: WorkshopSession) => s.session_type === 'bottom_up',
  );

  const toggleSessionId = (list: 'top_down_session_ids' | 'bottom_up_session_ids', id: string) => {
    setData((prev) => {
      const ids = prev[list].includes(id)
        ? prev[list].filter((x) => x !== id)
        : [...prev[list], id];
      return { ...prev, [list]: ids };
    });
  };

  // --- Detect gaps ---

  const handleDetectGaps = async () => {
    // Save source selection first, then detect
    saveGapAnalysisData.mutate(
      { sessionId: session.id, data: dataRef.current },
      {
        onSuccess: async () => {
          try {
            const result = await autoDetectGaps.mutateAsync(session.id);
            const detected: GapItem[] = (result as any)?.gaps ?? [];
            setData((prev) => {
              const existingIds = new Set(prev.gaps.map((g) => g.id));
              const merged = [
                ...prev.gaps,
                ...detected.filter((g) => !existingIds.has(g.id)),
              ];
              return { ...prev, gaps: merged };
            });
          } catch {
            // detection failed silently
          }
        },
      },
    );
  };

  // --- Gap CRUD ---

  const updateGap = (id: string, patch: Partial<GapItem>) => {
    setData((prev) => ({
      ...prev,
      gaps: prev.gaps.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const deleteGap = (id: string) => {
    setData((prev) => ({ ...prev, gaps: prev.gaps.filter((g) => g.id !== id) }));
  };

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
    if (gap.related_attribute_ids.length === 0) return;
    materializeElement.mutate({
      sessionId: session.id,
      data: {
        element_type: 'attribute' as const,
        source_session_id: session.id,
        source_element_id: gap.related_attribute_ids[0],
      },
    });
  };

  // --- Summary counts ---

  const counts = GAP_TYPES.reduce(
    (acc, t) => {
      acc[t] = data.gaps.filter((g) => g.gap_type === t).length;
      return acc;
    },
    {} as Record<GapType, number>,
  );
  const resolvedCount = data.gaps.filter((g) => g.resolved).length;
  const unresolvedCount = data.gaps.length - resolvedCount;

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Source Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Top-Down Sessions (Demand)
          </h4>
          {topDownSessions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No top-down sessions found</p>
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

        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Bottom-Up Sessions (Supply)
          </h4>
          {bottomUpSessions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No bottom-up sessions found</p>
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

      {/* Detect Gaps Button */}
      <button
        onClick={handleDetectGaps}
        disabled={autoDetectGaps.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {autoDetectGaps.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Detecting Gaps...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Detect Gaps
          </>
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
          <div key={gapType}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${cls.text}`}>
              <Icon className="w-4 h-4" />
              {config.label} ({gaps.length})
            </h4>
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className={`border rounded-lg p-4 ${cls.bg} ${cls.border} ${gap.resolved ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-800 flex-1">{gap.description}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateGap(gap.id, { resolved: !gap.resolved })}
                        className={`p-1 rounded transition-colors ${
                          gap.resolved
                            ? 'text-green-600 hover:text-green-700 bg-green-100'
                            : 'text-gray-400 hover:text-green-500'
                        }`}
                        title={gap.resolved ? 'Mark unresolved' : 'Mark resolved'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteGap(gap.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Delete gap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Priority dropdown + suggested action */}
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

                  {/* Suggested action - editable */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={gap.suggested_action ?? ''}
                      onChange={(e) => updateGap(gap.id, { suggested_action: e.target.value })}
                      placeholder="Suggested action..."
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white/70 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Resolution notes (shown when resolved) */}
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

      {/* Empty state when no gaps */}
      {data.gaps.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No gaps identified yet</p>
          <p className="text-xs mt-1">Use "Detect Gaps" or add gaps manually</p>
        </div>
      )}

      {/* Add Gap Manually */}
      {showAddForm ? (
        <div className="border border-purple-200 bg-purple-50/30 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-800 mb-3">Add Gap Manually</h5>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <div className="relative">
                  <select
                    value={newGap.gap_type}
                    onChange={(e) => setNewGap((p) => ({ ...p, gap_type: e.target.value as GapType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {GAP_TYPES.map((t) => (
                      <option key={t} value={t}>{GAP_TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <div className="relative">
                  <select
                    value={newGap.priority}
                    onChange={(e) => setNewGap((p) => ({ ...p, priority: e.target.value as GapItem['priority'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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
                placeholder="Recommended action to resolve..."
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
                <Plus className="w-3 h-3" />
                Add Gap
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Gap Manually
        </button>
      )}

      {/* Summary Bar */}
      {data.gaps.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {GAP_TYPES.map((t) => {
              if (counts[t] === 0) return null;
              const cfg = GAP_TYPE_CONFIG[t];
              const cls = colorClasses(cfg.color);
              const Icon = cfg.icon;
              return (
                <span key={t} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${cls.badge} ${cls.text}`}>
                  <Icon className="w-3 h-3" />
                  {counts[t]} {cfg.label}
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
  );
}
