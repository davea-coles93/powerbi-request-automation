import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Link, Sparkles, Pencil, X, Trash2 } from 'lucide-react';
import type { WorkshopProposals, ProposedMetric, ProposedMeasure, ProposedAttribute } from '../../types/ontology';

interface LookupItem {
  id: string;
  name: string;
}

interface ProposalCardProps {
  proposals: WorkshopProposals;
  onMaterialize: (proposals: WorkshopProposals) => Promise<any>;
  disabled?: boolean;
  systems?: LookupItem[];
  entities?: LookupItem[];
  perspectives?: LookupItem[];
}

const PERSPECTIVE_COLORS: Record<string, string> = {
  operational: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  management: 'bg-amber-100 text-amber-700 border-amber-200',
  financial: 'bg-blue-100 text-blue-700 border-blue-200',
};

function PerspectivePill({ id, onRemove }: { id: string; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PERSPECTIVE_COLORS[id] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {id}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-red-600">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

function SmallInput({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 ${className}`}
    />
  );
}

function SmallSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: LookupItem[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

// ─── Individual element editors ───────────────────────────────

function MetricRow({ item, editing, onEdit, onChange, onRemove, perspectives }: {
  item: ProposedMetric; editing: boolean; onEdit: () => void;
  onChange: (m: ProposedMetric) => void; onRemove: () => void; perspectives?: LookupItem[];
}) {
  if (item.is_existing) {
    return (
      <div className="flex items-center gap-2 py-1 px-1 text-xs text-gray-500">
        <span>🎯</span>
        <span className="italic">{item.name}</span>
        <Link className="w-3 h-3 text-blue-400" />
        <span className="text-[10px]">(existing)</span>
      </div>
    );
  }

  return (
    <div className="py-1.5 px-1 group">
      <div className="flex items-center gap-2">
        <span className="text-sm">🎯</span>
        <span className="text-xs font-medium text-gray-900 flex-1">{item.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-0.5 hover:bg-gray-100 rounded" title="Edit">
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={onRemove} className="p-0.5 hover:bg-red-50 rounded" title="Remove">
            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-0.5 ml-6">
        {item.perspective_ids?.map((p) => <PerspectivePill key={p} id={p} />)}
        <span className="text-[11px] text-gray-500 italic ml-1">"{item.business_question}"</span>
      </div>
      {editing && (
        <div className="mt-2 ml-6 space-y-1.5 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name</label>
            <SmallInput value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Business Question</label>
            <SmallInput value={item.business_question} onChange={(v) => onChange({ ...item, business_question: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
            <SmallInput value={item.description} onChange={(v) => onChange({ ...item, description: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Perspectives</label>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.perspective_ids?.map((p) => (
                <PerspectivePill key={p} id={p} onRemove={() => onChange({ ...item, perspective_ids: item.perspective_ids.filter((x) => x !== p) })} />
              ))}
              {perspectives?.filter((p) => !item.perspective_ids?.includes(p.id)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...item, perspective_ids: [...(item.perspective_ids || []), p.id] })}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-gray-300 text-gray-400 hover:border-purple-300 hover:text-purple-500"
                >
                  + {p.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeasureRow({ item, editing, onEdit, onChange, onRemove, perspectives }: {
  item: ProposedMeasure; editing: boolean; onEdit: () => void;
  onChange: (m: ProposedMeasure) => void; onRemove: () => void; perspectives?: LookupItem[];
}) {
  if (item.is_existing) {
    return (
      <div className="flex items-center gap-2 py-1 px-1 text-xs text-gray-500">
        <span>📐</span>
        <span className="italic">{item.name}</span>
        <Link className="w-3 h-3 text-blue-400" />
        <span className="text-[10px]">(existing)</span>
      </div>
    );
  }

  return (
    <div className="py-1.5 px-1 group">
      <div className="flex items-center gap-2">
        <span className="text-sm">📐</span>
        <span className="text-xs font-medium text-gray-900 flex-1">{item.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-0.5 hover:bg-gray-100 rounded" title="Edit">
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={onRemove} className="p-0.5 hover:bg-red-50 rounded" title="Remove">
            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      <div className="ml-6 mt-0.5 text-[11px] text-gray-500">{item.logic || item.description}</div>
      {editing && (
        <div className="mt-2 ml-6 space-y-1.5 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name</label>
            <SmallInput value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Logic</label>
            <SmallInput value={item.logic} onChange={(v) => onChange({ ...item, logic: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
            <SmallInput value={item.description} onChange={(v) => onChange({ ...item, description: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Perspectives</label>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.perspective_ids?.map((p) => (
                <PerspectivePill key={p} id={p} onRemove={() => onChange({ ...item, perspective_ids: item.perspective_ids.filter((x) => x !== p) })} />
              ))}
              {perspectives?.filter((p) => !item.perspective_ids?.includes(p.id)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...item, perspective_ids: [...(item.perspective_ids || []), p.id] })}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-gray-300 text-gray-400 hover:border-purple-300 hover:text-purple-500"
                >
                  + {p.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttributeRow({ item, editing, onEdit, onChange, onRemove, systems, entities, perspectives }: {
  item: ProposedAttribute; editing: boolean; onEdit: () => void;
  onChange: (a: ProposedAttribute) => void; onRemove: () => void;
  systems?: LookupItem[]; entities?: LookupItem[]; perspectives?: LookupItem[];
}) {
  if (item.is_existing) {
    return (
      <div className="flex items-center gap-2 py-1 px-1 text-xs text-gray-500">
        <span>📊</span>
        <span className="italic">{item.name}</span>
        <Link className="w-3 h-3 text-blue-400" />
        <span className="text-[10px]">(existing)</span>
      </div>
    );
  }

  return (
    <div className="py-1.5 px-1 group">
      <div className="flex items-center gap-2">
        <span className="text-sm">📊</span>
        <span className="text-xs font-medium text-gray-900 flex-1">{item.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-0.5 hover:bg-gray-100 rounded" title="Edit">
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={onRemove} className="p-0.5 hover:bg-red-50 rounded" title="Remove">
            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      <div className="ml-6 mt-0.5 text-[11px] text-gray-500">
        {item.entity_id && <span>Entity: {item.entity_id}</span>}
        {item.system_id && <span> | System: {item.system_id}</span>}
      </div>
      {editing && (
        <div className="mt-2 ml-6 space-y-1.5 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Name</label>
            <SmallInput value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
            <SmallInput value={item.description} onChange={(v) => onChange({ ...item, description: v })} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Entity</label>
              {entities && entities.length > 0 ? (
                <SmallSelect value={item.entity_id} onChange={(v) => onChange({ ...item, entity_id: v })} options={entities} placeholder="Select entity..." />
              ) : (
                <SmallInput value={item.entity_id} onChange={(v) => onChange({ ...item, entity_id: v })} placeholder="Entity ID" />
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">System</label>
              {systems && systems.length > 0 ? (
                <SmallSelect value={item.system_id} onChange={(v) => onChange({ ...item, system_id: v })} options={systems} placeholder="Select system..." />
              ) : (
                <SmallInput value={item.system_id} onChange={(v) => onChange({ ...item, system_id: v })} placeholder="System ID" />
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Perspectives</label>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.perspective_ids?.map((p) => (
                <PerspectivePill key={p} id={p} onRemove={() => onChange({ ...item, perspective_ids: item.perspective_ids.filter((x) => x !== p) })} />
              ))}
              {perspectives?.filter((p) => !item.perspective_ids?.includes(p.id)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...item, perspective_ids: [...(item.perspective_ids || []), p.id] })}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-gray-300 text-gray-400 hover:border-purple-300 hover:text-purple-500"
                >
                  + {p.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ProposalCard ────────────────────────────────────────

export function ProposalCard({ proposals: initialProposals, onMaterialize, disabled, systems, entities, perspectives }: ProposalCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [materializing, setMaterializing] = useState(false);
  const [materialized, setMaterialized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Local editable copy
  const [metrics, setMetrics] = useState(initialProposals.metrics);
  const [measures, setMeasures] = useState(initialProposals.measures);
  const [attributes, setAttributes] = useState(initialProposals.attributes);

  const totalNew =
    metrics.filter((m) => !m.is_existing).length +
    measures.filter((m) => !m.is_existing).length +
    attributes.filter((a) => !a.is_existing).length;

  const totalExisting =
    metrics.filter((m) => m.is_existing).length +
    measures.filter((m) => m.is_existing).length +
    attributes.filter((a) => a.is_existing).length;

  const handleMaterialize = async () => {
    setMaterializing(true);
    try {
      await onMaterialize({ metrics, measures, attributes });
      setMaterialized(true);
    } catch {
      // error handled in hook
    } finally {
      setMaterializing(false);
    }
  };

  const toggleEdit = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  return (
    <div className="mt-3 border border-purple-200 rounded-lg bg-purple-50/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-purple-500" /> : <ChevronRight className="w-3.5 h-3.5 text-purple-500" />}
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-purple-700">
            Proposed Elements
          </span>
          <span className="text-[10px] text-purple-500">
            {totalNew} new{totalExisting > 0 ? `, ${totalExisting} linked` : ''}
          </span>
        </div>
        {!materialized && totalNew > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleMaterialize(); }}
            disabled={disabled || materializing}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {materializing ? (
              <span className="animate-pulse">Creating...</span>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Accept & Create
              </>
            )}
          </button>
        )}
        {materialized && (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-medium">
            <Check className="w-3 h-3" />
            Created
          </span>
        )}
      </div>

      {/* Body */}
      {expanded && !materialized && (
        <div className="px-2 pb-2 space-y-1">
          {metrics.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 px-1">Metrics</div>
              {metrics.map((m) => (
                <MetricRow
                  key={m.id}
                  item={m}
                  editing={editingId === m.id}
                  onEdit={() => toggleEdit(m.id)}
                  onChange={(updated) => setMetrics((prev) => prev.map((x) => x.id === m.id ? updated : x))}
                  onRemove={() => setMetrics((prev) => prev.filter((x) => x.id !== m.id))}
                  perspectives={perspectives}
                />
              ))}
            </div>
          )}

          {measures.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 px-1">Measures</div>
              {measures.map((m) => (
                <MeasureRow
                  key={m.id}
                  item={m}
                  editing={editingId === m.id}
                  onEdit={() => toggleEdit(m.id)}
                  onChange={(updated) => setMeasures((prev) => prev.map((x) => x.id === m.id ? updated : x))}
                  onRemove={() => setMeasures((prev) => prev.filter((x) => x.id !== m.id))}
                  perspectives={perspectives}
                />
              ))}
            </div>
          )}

          {attributes.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 px-1">Attributes</div>
              {attributes.map((a) => (
                <AttributeRow
                  key={a.id}
                  item={a}
                  editing={editingId === a.id}
                  onEdit={() => toggleEdit(a.id)}
                  onChange={(updated) => setAttributes((prev) => prev.map((x) => x.id === a.id ? updated : x))}
                  onRemove={() => setAttributes((prev) => prev.filter((x) => x.id !== a.id))}
                  systems={systems}
                  entities={entities}
                  perspectives={perspectives}
                />
              ))}
            </div>
          )}

          {totalNew > 0 ? (
            <p className="text-[10px] text-gray-400 px-1 pt-1">
              Hover to edit or remove. Click pencil to adjust details.
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 px-1 pt-1">
              All elements already exist in the ontology. No new elements to create.
            </p>
          )}
        </div>
      )}

      {/* Compact summary after materialized */}
      {expanded && materialized && (
        <div className="px-3 pb-2 text-[11px] text-green-600">
          {metrics.filter((m) => !m.is_existing).map((m) => m.name).join(', ')}
          {measures.filter((m) => !m.is_existing).length > 0 && ` + ${measures.filter((m) => !m.is_existing).length} measures`}
          {attributes.filter((a) => !a.is_existing).length > 0 && ` + ${attributes.filter((a) => !a.is_existing).length} attributes`}
        </div>
      )}
    </div>
  );
}
