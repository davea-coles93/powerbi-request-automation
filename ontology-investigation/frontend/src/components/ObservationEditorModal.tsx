import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ObservationData {
  id?: string;
  name: string;
  description?: string;
  entity_id: string;
  system_id: string;
  source_actor?: string;
  reliability?: 'High' | 'Medium' | 'Low';
  volatility?: 'Point-in-time' | 'Accumulating' | 'Continuous';
  notes?: string;
}

interface ObservationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  observation?: ObservationData | null;
  onSave: (observation: ObservationData) => void;
  availableEntities?: Array<{ id: string; name: string }>;
  availableSystems?: Array<{ id: string; name: string }>;
}

export function ObservationEditorModal({
  isOpen,
  onClose,
  observation,
  onSave,
  availableEntities = [],
  availableSystems = [],
}: ObservationEditorModalProps) {
  const [formData, setFormData] = useState<ObservationData>({
    name: '',
    description: '',
    entity_id: '',
    system_id: '',
    source_actor: '',
    reliability: 'Medium',
    volatility: 'Point-in-time',
    notes: '',
  });

  useEffect(() => {
    if (observation) {
      setFormData(observation);
    } else {
      setFormData({
        name: '',
        description: '',
        entity_id: '',
        system_id: '',
        source_actor: '',
        reliability: 'Medium',
        volatility: 'Point-in-time',
        notes: '',
      });
    }
  }, [observation, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving observation:', formData);
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {observation ? 'Edit Observation' : 'Create New Observation'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define a data point captured in a source system
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observation Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Production Quantity, Inventory Count"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe what this observation represents..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity *
                  </label>
                  <select
                    required
                    value={formData.entity_id}
                    onChange={(e) =>
                      setFormData({ ...formData, entity_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an entity...</option>
                    {availableEntities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System *
                  </label>
                  <select
                    required
                    value={formData.system_id}
                    onChange={(e) =>
                      setFormData({ ...formData, system_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a system...</option>
                    {availableSystems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Data Quality & Characteristics */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Data Quality & Characteristics
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Actor
                  </label>
                  <input
                    type="text"
                    value={formData.source_actor}
                    onChange={(e) =>
                      setFormData({ ...formData, source_actor: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Machine Operator, System Admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reliability
                  </label>
                  <select
                    value={formData.reliability}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reliability: e.target.value as ObservationData['reliability'],
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volatility
                </label>
                <select
                  value={formData.volatility}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      volatility: e.target.value as ObservationData['volatility'],
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Point-in-time">Point-in-time</option>
                  <option value="Accumulating">Accumulating</option>
                  <option value="Continuous">Continuous</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Point-in-time: Snapshot at a moment | Accumulating: Running total |
                  Continuous: Always changing
                </p>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any additional context or notes about this observation..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Save Observation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
