import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MetricData {
  id?: string;
  name: string;
  description?: string;
  business_question: string;
  calculated_by_measure_ids: string[];
  perspective_ids: string[];
}

interface MetricEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric?: MetricData | null;
  onSave: (metric: MetricData) => void;
  availableMeasures?: Array<{ id: string; name: string }>;
}

export function MetricEditorModal({
  isOpen,
  onClose,
  metric,
  onSave,
  availableMeasures = [],
}: MetricEditorModalProps) {
  const [formData, setFormData] = useState<MetricData>({
    name: '',
    description: '',
    business_question: '',
    calculated_by_measure_ids: [],
    perspective_ids: [],
  });

  useEffect(() => {
    if (metric) {
      setFormData(metric);
    } else {
      setFormData({
        name: '',
        description: '',
        business_question: '',
        calculated_by_measure_ids: [],
        perspective_ids: [],
      });
    }
  }, [metric, isOpen]);

  const handleMeasureToggle = (measureId: string) => {
    const isSelected = formData.calculated_by_measure_ids.includes(measureId);
    setFormData({
      ...formData,
      calculated_by_measure_ids: isSelected
        ? formData.calculated_by_measure_ids.filter((id) => id !== measureId)
        : [...formData.calculated_by_measure_ids, measureId],
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
                {metric ? 'Edit Metric' : 'Create New Metric'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define a business KPI or performance indicator
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
                  Metric Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cost of Goods Sold, Inventory Accuracy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Question *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_question}
                  onChange={(e) =>
                    setFormData({ ...formData, business_question: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., What did it cost to produce what we sold?"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The key business question this metric answers
                </p>
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
                  placeholder="Detailed description of what this metric measures..."
                />
              </div>
            </div>

            {/* Calculated By Measures */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Calculated By Measures
              </h3>
              <p className="text-sm text-gray-600">
                Select the measures that calculate this metric
              </p>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-2">
                {availableMeasures.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No measures available
                  </p>
                ) : (
                  availableMeasures.map((measure) => (
                    <label
                      key={measure.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.calculated_by_measure_ids.includes(measure.id)}
                        onChange={() => handleMeasureToggle(measure.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{measure.name}</span>
                    </label>
                  ))
                )}
              </div>

              {formData.calculated_by_measure_ids.length > 0 && (
                <div className="text-sm text-gray-600">
                  {formData.calculated_by_measure_ids.length} measure
                  {formData.calculated_by_measure_ids.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Perspectives */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Perspectives</h3>
              <p className="text-sm text-gray-600">
                Select which perspectives this metric belongs to
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
              Save Metric
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
