import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Column {
  id: string;
  name: string;
  data_type: 'Integer' | 'Decimal' | 'String' | 'Date' | 'DateTime' | 'Boolean';
  is_key: boolean;
  is_foreign_key: boolean;
}

interface Measure {
  id: string;
  name: string;
  expression: string;
  format_string: string;
  implements_measure_id?: string;
}

interface TableData {
  id?: string;
  name: string;
  table_type: 'Fact' | 'Dimension' | 'Bridge';
  description: string;
  source_system_id: string;
  mapped_entity_id?: string;
  columns: Column[];
  measures: Measure[];
}

interface TableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  table?: TableData | null;
  onSave: (table: TableData) => void;
  availableMeasures?: Array<{ id: string; name: string; logic?: string; formula?: string }>;
}

export function TableEditorModal({ isOpen, onClose, table, onSave, availableMeasures = [] }: TableEditorModalProps) {
  const [formData, setFormData] = useState<TableData>({
    name: '',
    table_type: 'Fact',
    description: '',
    source_system_id: '',
    mapped_entity_id: '',
    columns: [],
    measures: [],
  });

  useEffect(() => {
    if (table) {
      setFormData(table);
    } else {
      setFormData({
        name: '',
        table_type: 'Fact',
        description: '',
        source_system_id: '',
        mapped_entity_id: '',
        columns: [],
        measures: [],
      });
    }
  }, [table, isOpen]);

  const handleAddColumn = () => {
    const newColumn: Column = {
      id: `col_${Date.now()}`,
      name: '',
      data_type: 'String',
      is_key: false,
      is_foreign_key: false,
    };
    setFormData({ ...formData, columns: [...formData.columns, newColumn] });
  };

  const handleRemoveColumn = (id: string) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((col) => col.id !== id),
    });
  };

  const handleColumnChange = (id: string, field: keyof Column, value: any) => {
    setFormData({
      ...formData,
      columns: formData.columns.map((col) =>
        col.id === id ? { ...col, [field]: value } : col
      ),
    });
  };

  const handleAddMeasure = () => {
    const newMeasure: Measure = {
      id: `measure_${Date.now()}`,
      name: '',
      expression: '',
      format_string: '#,0',
      implements_measure_id: '',
    };
    setFormData({ ...formData, measures: [...formData.measures, newMeasure] });
  };

  const handleRemoveMeasure = (id: string) => {
    setFormData({
      ...formData,
      measures: formData.measures.filter((m) => m.id !== id),
    });
  };

  const handleMeasureChange = (id: string, field: keyof Measure, value: any) => {
    setFormData({
      ...formData,
      measures: formData.measures.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
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
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {table ? 'Edit Table' : 'Create New Table'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define semantic model table structure
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Fact_Production"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table Type *
                  </label>
                  <select
                    required
                    value={formData.table_type}
                    onChange={(e) =>
                      setFormData({ ...formData, table_type: e.target.value as any })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Fact">Fact Table</option>
                    <option value="Dimension">Dimension Table</option>
                    <option value="Bridge">Bridge Table</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe the purpose of this table..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source System ID
                  </label>
                  <input
                    type="text"
                    value={formData.source_system_id}
                    onChange={(e) =>
                      setFormData({ ...formData, source_system_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., erp, mes, wms"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mapped Entity ID
                  </label>
                  <input
                    type="text"
                    value={formData.mapped_entity_id}
                    onChange={(e) =>
                      setFormData({ ...formData, mapped_entity_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ontology entity ID"
                  />
                </div>
              </div>
            </div>

            {/* Columns Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Columns</h3>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              </div>

              {formData.columns.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-500">No columns defined yet</p>
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="text-blue-600 hover:text-blue-700 font-medium mt-2"
                  >
                    Add your first column
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.columns.map((column) => (
                    <div
                      key={column.id}
                      className="bg-gray-50 p-4 rounded-lg border flex gap-4 items-start"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Column name"
                          value={column.name}
                          onChange={(e) =>
                            handleColumnChange(column.id, 'name', e.target.value)
                          }
                          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={column.data_type}
                          onChange={(e) =>
                            handleColumnChange(column.id, 'data_type', e.target.value)
                          }
                          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Integer">Integer</option>
                          <option value="Decimal">Decimal</option>
                          <option value="String">String</option>
                          <option value="Date">Date</option>
                          <option value="DateTime">DateTime</option>
                          <option value="Boolean">Boolean</option>
                        </select>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={column.is_key}
                              onChange={(e) =>
                                handleColumnChange(column.id, 'is_key', e.target.checked)
                              }
                              className="rounded"
                            />
                            <span>Key</span>
                          </label>
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={column.is_foreign_key}
                              onChange={(e) =>
                                handleColumnChange(
                                  column.id,
                                  'is_foreign_key',
                                  e.target.checked
                                )
                              }
                              className="rounded"
                            />
                            <span>FK</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(column.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Measures Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">DAX Measures</h3>
                <button
                  type="button"
                  onClick={handleAddMeasure}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Measure
                </button>
              </div>

              {formData.measures.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-500">No measures defined yet</p>
                  <button
                    type="button"
                    onClick={handleAddMeasure}
                    className="text-green-600 hover:text-green-700 font-medium mt-2"
                  >
                    Add your first measure
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.measures.map((measure) => {
                    const selectedBusinessMeasure = availableMeasures.find(
                      (m) => m.id === measure.implements_measure_id
                    );

                    return (
                      <div
                        key={measure.id}
                        className="bg-gray-50 p-4 rounded-lg border space-y-3"
                      >
                        <div className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="DAX Measure name"
                              value={measure.name}
                              onChange={(e) =>
                                handleMeasureChange(measure.id, 'name', e.target.value)
                              }
                              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Format string (e.g., #,0.00)"
                              value={measure.format_string}
                              onChange={(e) =>
                                handleMeasureChange(measure.id, 'format_string', e.target.value)
                              }
                              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeasure(measure.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Implements Business Measure <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={measure.implements_measure_id || ''}
                            onChange={(e) =>
                              handleMeasureChange(measure.id, 'implements_measure_id', e.target.value)
                            }
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                          >
                            <option value="">Select a business measure...</option>
                            {availableMeasures.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            This DAX measure implements the selected business measure
                          </p>
                        </div>

                        {selectedBusinessMeasure && (selectedBusinessMeasure.logic || selectedBusinessMeasure.formula) && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-xs font-medium text-blue-900 mb-2">
                              Business Logic Reference:
                            </div>
                            <div className="font-mono text-xs text-blue-800">
                              {selectedBusinessMeasure.logic || selectedBusinessMeasure.formula}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              DAX Formula Implementation
                            </label>
                            <textarea
                              placeholder="SUMX('Table', [Column1] * [Column2])..."
                              value={measure.expression}
                              onChange={(e) =>
                                handleMeasureChange(measure.id, 'expression', e.target.value)
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white"
                              rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Implement the business logic above using DAX syntax
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              Save Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
