import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, AlertTriangle, Eye, ShieldAlert, Zap, Link, Target, Snowflake, DollarSign, Clock } from 'lucide-react';
import { colorClasses } from './types';
import type { GapItem, GapType } from './types';

const GAP_TYPE_CONFIG: Record<GapType, { label: string; color: string; icon: typeof AlertTriangle }> = {
  missing_supply: { label: 'Missing Supply', color: 'red', icon: AlertTriangle },
  unused_supply: { label: 'Unused Supply', color: 'orange', icon: Eye },
  shadow_system: { label: 'Shadow System', color: 'yellow', icon: ShieldAlert },
  high_manual_effort: { label: 'High Manual Effort', color: 'purple', icon: Zap },
  broken_lineage: { label: 'Broken Lineage', color: 'blue', icon: Link },
  coverage_gap: { label: 'Coverage Gap', color: 'teal', icon: Target },
  process_risk: { label: 'Process Risk', color: 'indigo', icon: ShieldAlert },
  missing_crystallisation: { label: 'Missing Data Journey', color: 'pink', icon: Snowflake },
  high_crystallisation_cost: { label: 'High Data Journey Cost', color: 'cyan', icon: DollarSign },
  late_crystallisation: { label: 'Late Data Journey', color: 'emerald', icon: Clock },
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', dot: 'bg-red-500' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
  { value: 'resolved', label: 'Resolved', dot: 'bg-green-500' },
] as const;

interface GapCardProps {
  gap: GapItem;
  onUpdate: (id: string, patch: Partial<GapItem>) => void;
  onDelete: (id: string) => void;
  onMaterialize?: (gap: GapItem) => void;
  isMaterializing?: boolean;
  elementNames?: Record<string, string>;
}

function getStatus(gap: GapItem): 'open' | 'in_progress' | 'resolved' {
  if (gap.status) return gap.status;
  return gap.resolved ? 'resolved' : 'open';
}

export function GapCard({ gap, onUpdate, onDelete, onMaterialize, isMaterializing, elementNames }: GapCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = GAP_TYPE_CONFIG[gap.gap_type];
  const cls = colorClasses(config?.color ?? 'red');
  const status = getStatus(gap);
  const Icon = config?.icon ?? AlertTriangle;

  const handleStatusChange = (newStatus: string) => {
    onUpdate(gap.id, {
      status: newStatus as GapItem['status'],
      resolved: newStatus === 'resolved',
    });
  };

  // Collect all related element IDs with their type labels
  const relatedElements: { label: string; ids: string[] }[] = [
    { label: 'Attributes', ids: gap.related_attribute_ids },
    { label: 'Entities', ids: gap.related_entity_ids },
    { label: 'Measures', ids: gap.related_measure_ids },
    { label: 'Processes', ids: gap.related_process_ids },
  ].filter((g) => g.ids.length > 0);

  const totalRelated = relatedElements.reduce((sum, g) => sum + g.ids.length, 0);

  return (
    <div className={`border rounded-lg ${cls.bg} ${cls.border} ${status === 'resolved' ? 'opacity-60' : ''}`}>
      {/* Compact header — always visible */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Icon className={`w-4 h-4 flex-shrink-0 ${cls.text}`} />
        <p className="text-sm text-gray-800 flex-1 line-clamp-2">{gap.description}</p>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status dot + selector */}
          <div className="relative flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_OPTIONS.find((s) => s.value === status)?.dot || 'bg-red-500'}`} />
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs pl-1 pr-5 py-1 border rounded appearance-none bg-white focus:ring-1 focus:ring-purple-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority */}
          <div className="relative">
            <select
              value={gap.priority}
              onChange={(e) => onUpdate(gap.id, { priority: e.target.value as GapItem['priority'] })}
              className="text-xs pl-2 pr-6 py-1 border rounded appearance-none bg-white focus:ring-1 focus:ring-purple-500"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title={expanded ? 'Collapse' : 'Expand details'}
          >
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(gap.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Delete gap"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsed summary — show related count + suggested action preview */}
      {!expanded && (totalRelated > 0 || gap.suggested_action) && (
        <div className="px-4 pb-2.5 flex items-center gap-3 text-[11px] text-gray-500">
          {totalRelated > 0 && (
            <span>{totalRelated} related element{totalRelated !== 1 ? 's' : ''}</span>
          )}
          {gap.suggested_action && (
            <span className="truncate flex-1 italic">{gap.suggested_action}</span>
          )}
        </div>
      )}

      {/* Expanded detail section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 mt-0 pt-3">
          {/* Related elements */}
          {relatedElements.length > 0 && elementNames && (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Related Elements</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {relatedElements.map(({ label, ids }) =>
                  ids.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/80 border border-gray-200 rounded text-[10px] text-gray-600"
                      title={`${label}: ${elementNames[id] || id}`}
                    >
                      <span className="text-gray-400">{label.slice(0, 4)}:</span>
                      {elementNames[id] || id}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Suggested action */}
          <div>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Suggested Action</span>
            <input
              type="text"
              value={gap.suggested_action ?? ''}
              onChange={(e) => onUpdate(gap.id, { suggested_action: e.target.value })}
              placeholder="What should be done to resolve this gap?"
              className="mt-1 w-full text-xs px-2 py-1.5 border border-gray-200 rounded bg-white/70 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Materialize button */}
          {gap.gap_type === 'missing_supply' &&
            gap.related_attribute_ids.length > 0 &&
            onMaterialize && (
              <button
                onClick={() => onMaterialize(gap)}
                disabled={isMaterializing}
                className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isMaterializing ? 'Creating...' : 'Create in Ontology'}
              </button>
            )}

          {/* Resolution notes */}
          {status === 'resolved' && (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Resolution Notes</span>
              <textarea
                value={gap.resolution_notes ?? ''}
                onChange={(e) => onUpdate(gap.id, { resolution_notes: e.target.value })}
                placeholder="How was this gap resolved?"
                rows={2}
                className="mt-1 w-full text-xs px-2 py-1.5 border border-green-200 rounded bg-green-50 focus:ring-1 focus:ring-green-500 resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export config for use in parent components
export { GAP_TYPE_CONFIG };
