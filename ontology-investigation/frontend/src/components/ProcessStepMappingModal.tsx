import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ProcessStepMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepData: {
    id: string;
    label: string;
    description?: string;
    sequence: number;
    perspective_id: string;
    mappedTableIds?: string[];
    mappedMeasureIds?: string[];
  } | null;
  availableTables: Array<{ id: string; name: string; table_type: string }>;
  availableMeasures: Array<{ id: string; name: string; description?: string }>;
  onSave: (mappings: { stepId: string; tableIds: string[]; measureIds: string[] }) => void;
}

export function ProcessStepMappingModal({
  isOpen,
  onClose,
  stepData,
  availableTables,
  availableMeasures,
  onSave,
}: ProcessStepMappingModalProps) {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);

  useEffect(() => {
    if (stepData) {
      setSelectedTables(stepData.mappedTableIds || []);
      setSelectedMeasures(stepData.mappedMeasureIds || []);
    }
  }, [stepData, isOpen]);

  const handleTableToggle = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleMeasureToggle = (measureId: string) => {
    setSelectedMeasures((prev) =>
      prev.includes(measureId) ? prev.filter((id) => id !== measureId) : [...prev, measureId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stepData) {
      onSave({
        stepId: stepData.id,
        tableIds: selectedTables,
        measureIds: selectedMeasures,
      });
      onClose();
    }
  };

  if (!isOpen || !stepData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Map to Semantic Model</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {stepData.sequence}: {stepData.label}
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
            {/* Step Description */}
            {stepData.description && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm text-gray-700">{stepData.description}</p>
              </div>
            )}

            {/* Semantic Model Tables Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Map to Semantic Model Tables
                </h3>
                <span className="text-sm text-gray-600">
                  {selectedTables.length} selected
                </span>
              </div>

              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {availableTables.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tables available
                  </div>
                ) : (
                  availableTables.map((table) => {
                    const isSelected = selectedTables.includes(table.id);
                    return (
                      <label
                        key={table.id}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center w-5 h-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTableToggle(table.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{table.name}</span>
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                              {table.table_type}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Measures Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Map to Measures</h3>
                <span className="text-sm text-gray-600">
                  {selectedMeasures.length} selected
                </span>
              </div>

              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {availableMeasures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No measures available
                  </div>
                ) : (
                  availableMeasures.map((measure) => {
                    const isSelected = selectedMeasures.includes(measure.id);
                    return (
                      <label
                        key={measure.id}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center w-5 h-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMeasureToggle(measure.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{measure.name}</div>
                          {measure.description && (
                            <div className="text-sm text-gray-600 mt-0.5">{measure.description}</div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </label>
                    );
                  })
                )}
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
              Save Mappings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
