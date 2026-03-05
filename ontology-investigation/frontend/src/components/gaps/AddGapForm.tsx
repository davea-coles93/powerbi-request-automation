import { useState } from 'react';
import { Plus } from 'lucide-react';
import { GAP_TYPES } from './types';
import { GAP_TYPE_CONFIG } from './GapCard';
import type { GapType, GapItem } from './types';

interface AddGapFormProps {
  onAdd: (gap: GapItem) => void;
}

function makeId() {
  return 'gap-' + Math.random().toString(36).slice(2, 10);
}

export function AddGapForm({ onAdd }: AddGapFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [newGap, setNewGap] = useState<{
    gap_type: GapType;
    description: string;
    priority: GapItem['priority'];
    suggested_action: string;
  }>({
    gap_type: 'missing_supply',
    description: '',
    priority: 'medium',
    suggested_action: '',
  });

  const handleAdd = () => {
    if (!newGap.description.trim()) return;
    onAdd({
      id: makeId(),
      gap_type: newGap.gap_type,
      description: newGap.description.trim(),
      priority: newGap.priority,
      related_entity_ids: [],
      related_attribute_ids: [],
      related_measure_ids: [],
      related_process_ids: [],
      suggested_action: newGap.suggested_action || undefined,
      resolved: false,
    });
    setNewGap({ gap_type: 'missing_supply', description: '', priority: 'medium', suggested_action: '' });
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors mt-4"
      >
        <Plus className="w-4 h-4" /> Add Gap Manually
      </button>
    );
  }

  return (
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
                <option key={t} value={t}>
                  {GAP_TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select
              value={newGap.priority}
              onChange={(e) =>
                setNewGap((p) => ({ ...p, priority: e.target.value as GapItem['priority'] }))
              }
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
            value={newGap.description}
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
            value={newGap.suggested_action}
            onChange={(e) => setNewGap((p) => ({ ...p, suggested_action: e.target.value }))}
            placeholder="Recommended action..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(false);
              setNewGap({ gap_type: 'missing_supply', description: '', priority: 'medium', suggested_action: '' });
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!newGap.description.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Gap
          </button>
        </div>
      </div>
    </div>
  );
}
