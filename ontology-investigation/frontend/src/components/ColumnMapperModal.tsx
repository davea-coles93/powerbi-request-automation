import { useState, useEffect } from 'react';
import { X, Link, Unlink, ArrowRight, CheckCircle } from 'lucide-react';

interface Observation {
  id: string;
  name: string;
  description?: string;
  entity_id: string;
  isMapped: boolean;
}

interface Column {
  id: string;
  name: string;
  data_type: string;
  mapped_observation_id?: string;
}

interface ColumnMapping {
  column_id: string;
  observation_id: string;
}

interface ColumnMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  columns: Column[];
  availableObservations: Observation[];
  existingMappings: ColumnMapping[];
  onSave: (mappings: ColumnMapping[]) => void;
}

export function ColumnMapperModal({
  isOpen,
  onClose,
  tableName,
  columns,
  availableObservations,
  existingMappings,
  onSave,
}: ColumnMapperModalProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<string | null>(null);

  useEffect(() => {
    setMappings(existingMappings);
  }, [existingMappings, isOpen]);

  const handleCreateMapping = () => {
    if (selectedColumn && selectedObservation) {
      // Remove any existing mapping for this column
      const newMappings = mappings.filter((m) => m.column_id !== selectedColumn);
      newMappings.push({
        column_id: selectedColumn,
        observation_id: selectedObservation,
      });
      setMappings(newMappings);
      setSelectedColumn(null);
      setSelectedObservation(null);
    }
  };

  const handleRemoveMapping = (columnId: string) => {
    setMappings(mappings.filter((m) => m.column_id !== columnId));
  };

  const handleSubmit = () => {
    onSave(mappings);
    onClose();
  };

  const getMappedObservationForColumn = (columnId: string): string | undefined => {
    return mappings.find((m) => m.column_id === columnId)?.observation_id;
  };

  const isObservationMapped = (observationId: string): boolean => {
    return mappings.some((m) => m.observation_id === observationId);
  };

  const getObservationById = (id: string): Observation | undefined => {
    return availableObservations.find((o) => o.id === id);
  };

  const unmappedColumns = columns.filter((col) => !getMappedObservationForColumn(col.id));
  const unmappedObservations = availableObservations.filter(
    (obs) => !isObservationMapped(obs.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Map Columns to Observations</h2>
            <p className="text-sm text-gray-600 mt-1">
              Table: <span className="font-semibold">{tableName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="border-b px-6 py-3 bg-gray-50 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase">Total Columns</div>
            <div className="text-lg font-bold text-gray-900">{columns.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Mapped</div>
            <div className="text-lg font-bold text-green-600">{mappings.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Unmapped</div>
            <div className="text-lg font-bold text-yellow-600">
              {columns.length - mappings.length}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Observations */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="px-6 py-4 bg-blue-50 border-b">
              <h3 className="font-semibold text-gray-900">Available Observations</h3>
              <p className="text-xs text-gray-600 mt-1">
                {unmappedObservations.length} unmapped
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {availableObservations.map((obs) => {
                const isMapped = isObservationMapped(obs.id);
                const isSelected = selectedObservation === obs.id;
                return (
                  <div
                    key={obs.id}
                    onClick={() => setSelectedObservation(obs.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isMapped
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{obs.name}</span>
                          {isMapped && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        {obs.description && (
                          <p className="text-xs text-gray-600 mt-1">{obs.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Entity: {obs.entity_id}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Columns */}
          <div className="w-1/2 flex flex-col">
            <div className="px-6 py-4 bg-purple-50 border-b">
              <h3 className="font-semibold text-gray-900">Table Columns</h3>
              <p className="text-xs text-gray-600 mt-1">
                {unmappedColumns.length} unmapped
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {columns.map((col) => {
                const mappedObsId = getMappedObservationForColumn(col.id);
                const mappedObs = mappedObsId ? getObservationById(mappedObsId) : undefined;
                const isSelected = selectedColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedColumn(col.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : mappedObs
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{col.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                            {col.data_type}
                          </span>
                        </div>
                        {mappedObs ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Link className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700 font-medium">
                              Mapped to: {mappedObs.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMapping(col.id);
                              }}
                              className="ml-auto text-red-600 hover:text-red-800"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-yellow-600">Not mapped</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mapping Action Bar */}
        {selectedColumn && selectedObservation && (
          <div className="border-t bg-blue-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Selected Column:</span>
                  <span className="ml-2 font-semibold text-purple-700">
                    {columns.find((c) => c.id === selectedColumn)?.name}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Selected Observation:</span>
                  <span className="ml-2 font-semibold text-blue-700">
                    {availableObservations.find((o) => o.id === selectedObservation)?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCreateMapping}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Link className="w-4 h-4" />
                Create Mapping
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between items-center bg-white">
          <div className="text-sm text-gray-600">
            {mappings.length} of {columns.length} columns mapped
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Save Mappings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
