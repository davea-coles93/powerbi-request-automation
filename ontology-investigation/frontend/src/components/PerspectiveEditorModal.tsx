import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Perspective } from '../types/ontology';

interface PerspectiveEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  perspective: Perspective | null;
  onSave: (data: Perspective) => void;
  existingPerspectiveIds?: string[];
}

export function PerspectiveEditorModal({
  isOpen,
  onClose,
  perspective,
  onSave,
  existingPerspectiveIds = [],
}: PerspectiveEditorModalProps) {
  const [formData, setFormData] = useState<Perspective>({
    id: '',
    name: '',
    purpose: '',
    primary_concern: '',
    typical_actors: [],
    consumes_from: [],
    feeds: [],
  });

  const [newActor, setNewActor] = useState('');

  useEffect(() => {
    if (perspective) {
      setFormData(perspective);
    } else {
      setFormData({
        id: '',
        name: '',
        purpose: '',
        primary_concern: '',
        typical_actors: [],
        consumes_from: [],
        feeds: [],
      });
    }
    setNewActor('');
  }, [perspective, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '_'),
    };

    onSave(data);
    onClose();
  };

  const addActor = () => {
    const trimmed = newActor.trim();
    if (trimmed && !formData.typical_actors.includes(trimmed)) {
      setFormData({ ...formData, typical_actors: [...formData.typical_actors, trimmed] });
      setNewActor('');
    }
  };

  const removeActor = (actor: string) => {
    setFormData({
      ...formData,
      typical_actors: formData.typical_actors.filter(a => a !== actor),
    });
  };

  const toggleConsumesFrom = (id: string) => {
    const current = formData.consumes_from;
    setFormData({
      ...formData,
      consumes_from: current.includes(id) ? current.filter(c => c !== id) : [...current, id],
    });
  };

  const toggleFeeds = (id: string) => {
    const current = formData.feeds;
    setFormData({
      ...formData,
      feeds: current.includes(id) ? current.filter(f => f !== id) : [...current, id],
    });
  };

  if (!isOpen) return null;

  const otherPerspectiveIds = existingPerspectiveIds.filter(id => id !== formData.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {perspective ? 'Edit Perspective' : 'New Perspective'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perspective Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Operational"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perspective ID
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="Auto-generated from name if left blank"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to auto-generate from name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Tracks day-to-day work and production activities"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Concern <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.primary_concern}
                onChange={(e) => setFormData({ ...formData, primary_concern: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., What work is being done?"
              />
            </div>
          </div>

          {/* Typical Actors */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900">Typical Actors</h3>
            <p className="text-sm text-gray-600">
              People or roles that typically operate within this perspective.
            </p>

            <div className="flex flex-wrap gap-2 mb-2">
              {formData.typical_actors.map((actor) => (
                <span
                  key={actor}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
                >
                  {actor}
                  <button
                    type="button"
                    onClick={() => removeActor(actor)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {formData.typical_actors.length === 0 && (
                <span className="text-sm text-gray-400">No actors added</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newActor}
                onChange={(e) => setNewActor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addActor();
                  }
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Production Operator"
              />
              <button
                type="button"
                onClick={addActor}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Relationships */}
          {otherPerspectiveIds.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">Relationships</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consumes From (receives data from)
                </label>
                <div className="flex flex-wrap gap-2">
                  {otherPerspectiveIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleConsumesFrom(id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.consumes_from.includes(id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feeds (provides data to)
                </label>
                <div className="flex flex-wrap gap-2">
                  {otherPerspectiveIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleFeeds(id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.feeds.includes(id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {perspective ? 'Update Perspective' : 'Create Perspective'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
