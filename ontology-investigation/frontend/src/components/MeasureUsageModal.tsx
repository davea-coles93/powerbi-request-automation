import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface MeasureUsageData {
  measure_id: string;
  measure_name: string;
  used_in_metrics: Array<{ id: string; name: string; description?: string }>;
  used_in_measures: Array<{ id: string; name: string; description?: string }>;
  depends_on_observations: Array<{ id: string; name: string; entity_id?: string }>;
  depends_on_measures: Array<{ id: string; name: string }>;
}

interface MeasureUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageData?: MeasureUsageData | null;
}

export function MeasureUsageModal({
  isOpen,
  onClose,
  usageData,
}: MeasureUsageModalProps) {
  if (!isOpen || !usageData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Measure Usage</h2>
            <p className="text-sm text-gray-600 mt-1">
              Viewing relationships for{' '}
              <span className="font-semibold text-blue-600">{usageData.measure_name}</span>
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
          {/* Used in Metrics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Used in Metrics ({usageData.used_in_metrics.length})
              </h3>
            </div>

            {usageData.used_in_metrics.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  This measure is not used in any metrics yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {usageData.used_in_metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="font-medium text-gray-900">{metric.name}</div>
                    {metric.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {metric.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Used in Other Measures */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Used in Other Measures ({usageData.used_in_measures.length})
              </h3>
            </div>

            {usageData.used_in_measures.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  This measure is not used in any other measures
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {usageData.used_in_measures.map((measure) => (
                  <div
                    key={measure.id}
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4"
                  >
                    <div className="font-medium text-gray-900">{measure.name}</div>
                    {measure.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {measure.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Depends On */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Depends On</h3>
            </div>

            {/* Depends on Observations */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Observations ({usageData.depends_on_observations.length})
              </h4>

              {usageData.depends_on_observations.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">No observation dependencies</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {usageData.depends_on_observations.map((obs) => (
                    <div
                      key={obs.id}
                      className="bg-green-50 border border-green-200 rounded-lg p-3"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {obs.name}
                      </div>
                      {obs.entity_id && (
                        <div className="text-xs text-gray-600 mt-1">
                          Entity: {obs.entity_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Depends on Measures */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Measures ({usageData.depends_on_measures.length})
              </h4>

              {usageData.depends_on_measures.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">No measure dependencies</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {usageData.depends_on_measures.map((measure) => (
                    <div
                      key={measure.id}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {measure.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-6">
            <div className="bg-gray-100 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Upstream Dependencies:</span>
                  <div className="font-semibold text-gray-900">
                    {usageData.depends_on_observations.length} observations,{' '}
                    {usageData.depends_on_measures.length} measures
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Downstream Usage:</span>
                  <div className="font-semibold text-gray-900">
                    {usageData.used_in_metrics.length} metrics,{' '}
                    {usageData.used_in_measures.length} measures
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
