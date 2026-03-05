import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Link,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  usePerspectives,
  useMetrics,
  useMeasures,
  useAttributes,
  useSaveTopDownData,
} from '../../hooks/useOntology';
import type {
  WorkshopSession,
  TopDownData,
  TopDownMetricCapture,
  TopDownMeasureRequirement,
  TopDownAttributeRequirement,
  Perspective,
  Metric,
  Measure,
  Attribute,
} from '../../types/ontology';

interface TopDownWorkshopProps {
  session: WorkshopSession;
  onSessionUpdate: (session: WorkshopSession) => void;
}

// --- Combobox for linking existing items ---

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
  items: { id: string; name: string }[];
  linkedId?: string;
  placeholder?: string;
}

function LinkCombobox({ value, onChange, onSelect, onClear, items, linkedId, placeholder }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (value ? items.filter((i) => i.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8) : items.slice(0, 8)),
    [items, value],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (linkedId) onClear();
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-7 pr-16 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        {linkedId ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
            <Link className="w-3 h-3" /> LINKED
          </span>
        ) : value.trim() ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
            <Sparkles className="w-3 h-3" /> NEW
          </span>
        ) : null}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 transition-colors"
              onMouseDown={() => {
                onSelect(item.id, item.name);
                setOpen(false);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function TopDownWorkshop({ session, onSessionUpdate }: TopDownWorkshopProps) {
  const [data, setData] = useState<TopDownData>(() => session.top_down_data ?? { metrics: [] });
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [expandedMeasures, setExpandedMeasures] = useState<Set<string>>(new Set());
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  const saveTopDownData = useSaveTopDownData();
  const { data: perspectives = [] } = usePerspectives();
  const { data: existingMetrics = [] } = useMetrics();
  const { data: existingMeasures = [] } = useMeasures();
  const { data: existingAttributes = [] } = useAttributes();

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTopDownData.mutate({ sessionId: session.id, data });
      onSessionUpdate({ ...session, top_down_data: data });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // --- Helpers ---

  const update = (fn: (draft: TopDownData) => TopDownData) => setData((prev) => fn(prev));

  const addMetric = () => {
    const id = crypto.randomUUID();
    update((d) => ({
      ...d,
      metrics: [
        ...d.metrics,
        { id, business_question: '', metric_name: '', perspective_ids: [], required_measures: [] },
      ],
    }));
    setCollapsedCards((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const removeMetric = (id: string) =>
    update((d) => ({ ...d, metrics: d.metrics.filter((m) => m.id !== id) }));

  const updateMetric = (id: string, patch: Partial<TopDownMetricCapture>) =>
    update((d) => ({ ...d, metrics: d.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  const addMeasure = (metricId: string) => {
    const id = crypto.randomUUID();
    updateMetric(metricId, {
      required_measures: [
        ...(data.metrics.find((m) => m.id === metricId)?.required_measures ?? []),
        { id, name: '', required_attributes: [] },
      ],
    });
    setExpandedMeasures((prev) => new Set(prev).add(metricId));
  };

  const removeMeasure = (metricId: string, measureId: string) =>
    updateMetric(metricId, {
      required_measures: (data.metrics.find((m) => m.id === metricId)?.required_measures ?? []).filter(
        (ms) => ms.id !== measureId,
      ),
    });

  const updateMeasure = (metricId: string, measureId: string, patch: Partial<TopDownMeasureRequirement>) =>
    updateMetric(metricId, {
      required_measures: (data.metrics.find((m) => m.id === metricId)?.required_measures ?? []).map((ms) =>
        ms.id === measureId ? { ...ms, ...patch } : ms,
      ),
    });

  const addAttribute = (metricId: string, measureId: string) => {
    const id = crypto.randomUUID();
    const metric = data.metrics.find((m) => m.id === metricId);
    const measure = metric?.required_measures.find((ms) => ms.id === measureId);
    if (!measure) return;
    updateMeasure(metricId, measureId, {
      required_attributes: [...measure.required_attributes, { id, name: '' }],
    });
    setExpandedAttributes((prev) => new Set(prev).add(measureId));
  };

  const removeAttribute = (metricId: string, measureId: string, attrId: string) => {
    const metric = data.metrics.find((m) => m.id === metricId);
    const measure = metric?.required_measures.find((ms) => ms.id === measureId);
    if (!measure) return;
    updateMeasure(metricId, measureId, {
      required_attributes: measure.required_attributes.filter((a) => a.id !== attrId),
    });
  };

  const updateAttribute = (
    metricId: string,
    measureId: string,
    attrId: string,
    patch: Partial<TopDownAttributeRequirement>,
  ) => {
    const metric = data.metrics.find((m) => m.id === metricId);
    const measure = metric?.required_measures.find((ms) => ms.id === measureId);
    if (!measure) return;
    updateMeasure(metricId, measureId, {
      required_attributes: measure.required_attributes.map((a) => (a.id === attrId ? { ...a, ...patch } : a)),
    });
  };

  const toggleCollapse = (id: string) =>
    setCollapsedCards((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleMeasures = (id: string) =>
    setExpandedMeasures((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleAttributes = (id: string) =>
    setExpandedAttributes((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  // Counts
  const totalMeasures = data.metrics.reduce((sum, m) => sum + m.required_measures.length, 0);
  const totalAttributes = data.metrics.reduce(
    (sum, m) => sum + m.required_measures.reduce((s, ms) => s + ms.required_attributes.length, 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Top-Down Metric Capture</h3>
        </div>
        <button
          type="button"
          onClick={addMetric}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Business Question
        </button>
      </div>

      {/* Empty state */}
      {data.metrics.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No business questions captured yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Start by adding the first business question from your stakeholders
          </p>
          <button
            type="button"
            onClick={addMetric}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Business Question
          </button>
        </div>
      )}

      {/* Metric capture cards */}
      {data.metrics.map((metric, idx) => {
        const collapsed = collapsedCards.has(metric.id);
        const measuresExpanded = expandedMeasures.has(metric.id);

        return (
          <div key={metric.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
            {/* Card header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
              onClick={() => toggleCollapse(metric.id)}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="text-xs font-bold text-purple-600 flex-shrink-0">Q{idx + 1}</span>
              <span className="text-sm text-gray-700 truncate flex-1">
                {metric.business_question || 'New business question...'}
              </span>
              {metric.required_measures.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                  {metric.required_measures.length} measure{metric.required_measures.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMetric(metric.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                title="Delete question"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card body */}
            {!collapsed && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {/* Business question */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Question</label>
                  <input
                    type="text"
                    value={metric.business_question}
                    onChange={(e) => updateMetric(metric.id, { business_question: e.target.value })}
                    placeholder="e.g., What is our actual vs budgeted COGS by product line?"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoFocus={!metric.business_question}
                  />
                </div>

                {/* Metric name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Metric Name</label>
                  <LinkCombobox
                    value={metric.metric_name}
                    linkedId={metric.existing_metric_id}
                    onChange={(v) => updateMetric(metric.id, { metric_name: v })}
                    onSelect={(id, name) => updateMetric(metric.id, { existing_metric_id: id, metric_name: name })}
                    onClear={() => updateMetric(metric.id, { existing_metric_id: undefined })}
                    items={(existingMetrics as Metric[]).map((m) => ({ id: m.id, name: m.name }))}
                    placeholder="Search existing metrics or type a new one..."
                  />
                </div>

                {/* Perspectives */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Perspectives</label>
                  <div className="flex flex-wrap gap-2">
                    {(perspectives as Perspective[]).map((p) => {
                      const checked = metric.perspective_ids.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            checked
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => {
                              const ids = checked
                                ? metric.perspective_ids.filter((id) => id !== p.id)
                                : [...metric.perspective_ids, p.id];
                              updateMetric(metric.id, { perspective_ids: ids });
                            }}
                          />
                          {p.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Required Measures section */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleMeasures(metric.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    {measuresExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Required Measures ({metric.required_measures.length})
                  </button>

                  {measuresExpanded && (
                    <div className="mt-2 space-y-3 pl-2 border-l-2 border-purple-200">
                      {metric.required_measures.map((measure) => {
                        const attrsExpanded = expandedAttributes.has(measure.id);
                        return (
                          <div key={measure.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <LinkCombobox
                                value={measure.name}
                                linkedId={measure.existing_measure_id}
                                onChange={(v) => updateMeasure(metric.id, measure.id, { name: v })}
                                onSelect={(id, name) =>
                                  updateMeasure(metric.id, measure.id, { existing_measure_id: id, name })
                                }
                                onClear={() =>
                                  updateMeasure(metric.id, measure.id, { existing_measure_id: undefined })
                                }
                                items={(existingMeasures as Measure[]).map((m) => ({ id: m.id, name: m.name }))}
                                placeholder="Measure name..."
                              />
                              <button
                                type="button"
                                onClick={() => removeMeasure(metric.id, measure.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                                title="Remove measure"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <textarea
                              value={measure.logic ?? ''}
                              onChange={(e) =>
                                updateMeasure(metric.id, measure.id, { logic: e.target.value })
                              }
                              placeholder="Calculation logic (optional)..."
                              rows={1}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                            />

                            {/* Required Attributes */}
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleAttributes(measure.id)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-purple-600 transition-colors"
                              >
                                {attrsExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                Required Attributes ({measure.required_attributes.length})
                              </button>

                              {attrsExpanded && (
                                <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-gray-300">
                                  {measure.required_attributes.map((attr) => (
                                    <div key={attr.id} className="flex items-center gap-2">
                                      <LinkCombobox
                                        value={attr.name}
                                        linkedId={attr.existing_attribute_id}
                                        onChange={(v) =>
                                          updateAttribute(metric.id, measure.id, attr.id, { name: v })
                                        }
                                        onSelect={(id, name) =>
                                          updateAttribute(metric.id, measure.id, attr.id, {
                                            existing_attribute_id: id,
                                            name,
                                          })
                                        }
                                        onClear={() =>
                                          updateAttribute(metric.id, measure.id, attr.id, {
                                            existing_attribute_id: undefined,
                                          })
                                        }
                                        items={(existingAttributes as Attribute[]).map((a) => ({
                                          id: a.id,
                                          name: a.name,
                                        }))}
                                        placeholder="Attribute name..."
                                      />
                                      <input
                                        type="text"
                                        value={attr.entity_hint ?? ''}
                                        onChange={(e) =>
                                          updateAttribute(metric.id, measure.id, attr.id, {
                                            entity_hint: e.target.value,
                                          })
                                        }
                                        placeholder="Entity hint..."
                                        className="w-36 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeAttribute(metric.id, measure.id, attr.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                                        title="Remove attribute"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => addAttribute(metric.id, measure.id)}
                                    className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 font-medium mt-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Attribute
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => addMeasure(metric.id)}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Measure
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary bar */}
      {data.metrics.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <div className="flex items-center gap-4 text-gray-700">
            <span>
              <span className="font-semibold text-purple-700">{data.metrics.length}</span> metric
              {data.metrics.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              <span className="font-semibold text-purple-700">{totalMeasures}</span> measure
              {totalMeasures !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              <span className="font-semibold text-purple-700">{totalAttributes}</span> attribute
              {totalAttributes !== 1 ? 's' : ''}
            </span>
          </div>
          {saveTopDownData.isPending && (
            <span className="text-xs text-gray-500">Saving...</span>
          )}
          {saveTopDownData.isSuccess && !saveTopDownData.isPending && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>
      )}
    </div>
  );
}
