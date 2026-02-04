import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MeasureData {
  id?: string;
  name: string;
  description?: string;
  logic?: string;
  formula?: string;
  input_observation_ids: string[];
  input_measure_ids: string[];
  perspective_ids: string[];
}

interface MeasureEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  measure?: MeasureData | null;
  onSave: (measure: MeasureData) => void;
  availableObservations?: Array<{ id: string; name: string }>;
  availableMeasures?: Array<{ id: string; name: string }>;
}

export function MeasureEditorModal({
  isOpen,
  onClose,
  measure,
  onSave,
  availableObservations = [],
  availableMeasures = [],
}: MeasureEditorModalProps) {
  const [formData, setFormData] = useState<MeasureData>({
    name: '',
    description: '',
    logic: '',
    formula: '',
    input_observation_ids: [],
    input_measure_ids: [],
    perspective_ids: [],
  });

  useEffect(() => {
    if (measure) {
      setFormData(measure);
    } else {
      setFormData({
        name: '',
        description: '',
        logic: '',
        formula: '',
        input_observation_ids: [],
        input_measure_ids: [],
        perspective_ids: [],
      });
    }
  }, [measure, isOpen]);

  const handleObservationToggle = (obsId: string) => {
    const isSelected = formData.input_observation_ids.includes(obsId);
    setFormData({
      ...formData,
      input_observation_ids: isSelected
        ? formData.input_observation_ids.filter((id) => id !== obsId)
        : [...formData.input_observation_ids, obsId],
    });
  };

  const handleMeasureToggle = (measureId: string) => {
    const isSelected = formData.input_measure_ids.includes(measureId);
    setFormData({
      ...formData,
      input_measure_ids: isSelected
        ? formData.input_measure_ids.filter((id) => id !== measureId)
        : [...formData.input_measure_ids, measureId],
    });
  };

  const handlePerspectiveToggle = (perspectiveId: string) => {
    const isSelected = formData.perspective_ids.includes(perspectiveId);
    setFormData({
      ...formData,
      perspective_ids: isSelected
        ? formData.perspective_ids.filter((id) => id !== perspectiveId)
        : [...formData.perspective_ids, perspectiveId],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving measure:', formData);
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {measure ? 'Edit Measure' : 'Create New Measure'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define a calculation or derivation from observations
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
                  Measure Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Total Production Quantity, Average Cycle Time"
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
                  placeholder="Describe what this measure calculates..."
                />
              </div>
            </div>

            {/* Calculation Details */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Calculation Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logic
                </label>
                <textarea
                  value={formData.logic}
                  onChange={(e) => setFormData({ ...formData, logic: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder="Describe the business logic in plain English..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formula (Business Logic)
                </label>
                <textarea
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder="e.g., SUM(quantity × price), AVG(cycle_time)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define the business logic. DAX implementation happens in the semantic model.
                </p>
              </div>
            </div>

            {/* Input Observations */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Input Observations
              </h3>
              <p className="text-sm text-gray-600">
                Select the observations this measure depends on
              </p>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-2">
                {availableObservations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No observations available
                  </p>
                ) : (
                  availableObservations.map((obs) => (
                    <label
                      key={obs.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.input_observation_ids.includes(obs.id)}
                        onChange={() => handleObservationToggle(obs.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{obs.name}</span>
                    </label>
                  ))
                )}
              </div>

              {formData.input_observation_ids.length > 0 && (
                <div className="text-sm text-gray-600">
                  {formData.input_observation_ids.length} observation
                  {formData.input_observation_ids.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Input Measures (for derived measures) */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Input Measures (for derived measures)
              </h3>
              <p className="text-sm text-gray-600">
                Select other measures this measure builds upon
              </p>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-2">
                {availableMeasures.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No measures available</p>
                ) : (
                  availableMeasures
                    .filter((m) => m.id !== measure?.id) // Don't show current measure
                    .map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.input_measure_ids.includes(m.id)}
                          onChange={() => handleMeasureToggle(m.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{m.name}</span>
                      </label>
                    ))
                )}
              </div>

              {formData.input_measure_ids.length > 0 && (
                <div className="text-sm text-gray-600">
                  {formData.input_measure_ids.length} measure
                  {formData.input_measure_ids.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Perspectives */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Perspectives</h3>
              <p className="text-sm text-gray-600">
                Select which perspectives use this measure
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.perspective_ids.includes('operational')}
                    onChange={() => handlePerspectiveToggle('operational')}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Operational</div>
                    <div className="text-xs text-gray-600">
                      Day-to-day operations and processes
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.perspective_ids.includes('management')}
                    onChange={() => handlePerspectiveToggle('management')}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Management</div>
                    <div className="text-xs text-gray-600">
                      Planning, control, and decision-making
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.perspective_ids.includes('financial')}
                    onChange={() => handlePerspectiveToggle('financial')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Financial</div>
                    <div className="text-xs text-gray-600">
                      Cost, revenue, and financial reporting
                    </div>
                  </div>
                </label>
              </div>

              {formData.perspective_ids.length > 0 && (
                <div className="text-sm text-gray-600">
                  {formData.perspective_ids.length} perspective
                  {formData.perspective_ids.length !== 1 ? 's' : ''} selected
                </div>
              )}
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
              Save Measure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
