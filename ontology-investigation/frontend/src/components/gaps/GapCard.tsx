import { Check, Trash2, ChevronDown } from 'lucide-react';
import { colorClasses } from './types';
import type { GapItem, GapType } from './types';
import { AlertTriangle, Eye, ShieldAlert, Zap } from 'lucide-react';

const GAP_TYPE_CONFIG: Record<GapType, { label: string; color: string; icon: typeof AlertTriangle }> = {
  missing_supply: { label: 'Missing Supply', color: 'red', icon: AlertTriangle },
  unused_supply: { label: 'Unused Supply', color: 'orange', icon: Eye },
  shadow_system: { label: 'Shadow System', color: 'yellow', icon: ShieldAlert },
  high_manual_effort: { label: 'High Manual Effort', color: 'purple', icon: Zap },
};

interface GapCardProps {
  gap: GapItem;
  onUpdate: (id: string, patch: Partial<GapItem>) => void;
  onDelete: (id: string) => void;
  onMaterialize?: (gap: GapItem) => void;
  isMaterializing?: boolean;
}

export function GapCard({ gap, onUpdate, onDelete, onMaterialize, isMaterializing }: GapCardProps) {
  const config = GAP_TYPE_CONFIG[gap.gap_type];
  const cls = colorClasses(config.color);

  return (
    <div className={`border rounded-lg p-4 ${cls.bg} ${cls.border} ${gap.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-800 flex-1">{gap.description}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onUpdate(gap.id, { resolved: !gap.resolved })}
            className={`p-1 rounded transition-colors ${
              gap.resolved
                ? 'text-green-600 hover:text-green-700 bg-green-100'
                : 'text-gray-500 hover:text-green-500'
            }`}
            title={gap.resolved ? 'Mark unresolved' : 'Mark resolved'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(gap.id)}
            className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
            title="Delete gap"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
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
        {gap.gap_type === 'missing_supply' &&
          gap.related_attribute_ids.length > 0 &&
          onMaterialize && (
            <button
              onClick={() => onMaterialize(gap)}
              disabled={isMaterializing}
              className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isMaterializing ? 'Creating...' : 'Create in Ontology'}
            </button>
          )}
      </div>
      <div className="mt-2">
        <input
          type="text"
          value={gap.suggested_action ?? ''}
          onChange={(e) => onUpdate(gap.id, { suggested_action: e.target.value })}
          placeholder="Suggested action..."
          className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white/70 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>
      {gap.resolved && (
        <div className="mt-2">
          <textarea
            value={gap.resolution_notes ?? ''}
            onChange={(e) => onUpdate(gap.id, { resolution_notes: e.target.value })}
            placeholder="Resolution notes..."
            rows={2}
            className="w-full text-xs px-2 py-1 border border-green-200 rounded bg-green-50 focus:ring-1 focus:ring-green-500 resize-none"
          />
        </div>
      )}
    </div>
  );
}

// Re-export config for use in parent components
export { GAP_TYPE_CONFIG };
