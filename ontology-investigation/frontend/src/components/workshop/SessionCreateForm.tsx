import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { WorkshopSessionType } from '../../types/ontology';

const SESSION_TYPE_OPTIONS: { value: WorkshopSessionType; label: string; description: string }[] = [
  {
    value: 'top_down',
    label: 'Top-Down',
    description: 'Executive perspective: define business questions, metrics, and trace required attributes',
  },
  {
    value: 'bottom_up',
    label: 'Bottom-Up',
    description: 'Operational: map processes on a canvas, identify systems, data sources, and pain points',
  },
  {
    value: 'gap_analysis',
    label: 'Gap Analysis',
    description: 'Cross-reference demand vs supply, run automated gap detection, prioritize actions',
  },
];

interface SessionCreateFormProps {
  onCancel: () => void;
  onCreate: (data: {
    name: string;
    date: string;
    participants: string[];
    session_type: WorkshopSessionType;
  }) => Promise<void>;
}

export function SessionCreateForm({ onCancel, onCreate }: SessionCreateFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState('');
  const [sessionType, setSessionType] = useState<WorkshopSessionType>('top_down');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        date,
        participants: participants.split(',').map((p) => p.trim()).filter(Boolean),
        session_type: sessionType,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">New Workshop Session</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Session Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Month-End Close Discovery"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Participants (comma-separated)
          </label>
          <input
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="e.g., John Smith, Jane Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Session Type</label>
          <div className="space-y-2">
            {SESSION_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  sessionType === opt.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="session_type"
                  value={opt.value}
                  checked={sessionType === opt.value}
                  onChange={() => setSessionType(opt.value)}
                  className="mt-0.5 accent-purple-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Session
          </button>
        </div>
      </div>
    </div>
  );
}
