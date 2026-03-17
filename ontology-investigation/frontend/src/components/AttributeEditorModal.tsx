import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { OntologyState } from '../types/ontology';
import { StateSelector } from './shared/StateSelector';

interface ConstraintData {
  type: 'range' | 'required' | 'format';
  min?: number;
  max?: number;
  pattern?: string;
  unit?: string;
  description: string;
}

interface AttributeData {
  id?: string;
  name: string;
  description?: string;
  entity_id: string;
  system_id: string;
  source_actor?: string;
  reliability?: 'High' | 'Medium' | 'Low';
  volatility?: 'Point-in-time' | 'Accumulating' | 'Continuous';
  notes?: string;
  source_table?: string;
  source_column?: string;
  source_connection?: string;
  data_type?: 'string' | 'number' | 'date' | 'boolean' | 'decimal';
  constraints?: ConstraintData[];
  perspective_ids?: string[];
  state?: OntologyState;
}

interface AttributeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribute?: AttributeData | null;
  onSave: (attribute: AttributeData) => void;
  availableEntities?: Array<{ id: string; name: string }>;
  availableSystems?: Array<{ id: string; name: string }>;
  availablePerspectives?: Array<{ id: string; name: string }>;
  onCreateEntity?: (entity: { name: string; description: string }) => Promise<{ id: string; name: string }>;
  onCreateSystem?: (system: { name: string; description: string }) => Promise<{ id: string; name: string }>;
}

const defaultFormData: AttributeData = {
  name: '',
  description: '',
  entity_id: '',
  system_id: '',
  source_actor: '',
  reliability: 'Medium',
  volatility: 'Point-in-time',
  notes: '',
  source_table: '',
  source_column: '',
  source_connection: '',
  data_type: 'string',
  constraints: [],
  perspective_ids: [],
  state: 'as-is',
};

export function AttributeEditorModal({
  isOpen,
  onClose,
  attribute,
  onSave,
  availableEntities = [],
  availableSystems = [],
  availablePerspectives = [],
  onCreateEntity,
  onCreateSystem,
}: AttributeEditorModalProps) {
  const [formData, setFormData] = useState<AttributeData>({ ...defaultFormData });
  const [showNewEntity, setShowNewEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityDesc, setNewEntityDesc] = useState('');
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [showNewSystem, setShowNewSystem] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [newSystemDesc, setNewSystemDesc] = useState('');
  const [creatingSystem, setCreatingSystem] = useState(false);

  useEffect(() => {
    if (attribute) {
      setFormData({
        ...defaultFormData,
        ...attribute,
        constraints: attribute.constraints ?? [],
        perspective_ids: attribute.perspective_ids ?? [],
      });
    } else {
      setFormData({ ...defaultFormData });
    }
    // Reset inline creation forms
    setShowNewEntity(false);
    setNewEntityName('');
    setNewEntityDesc('');
    setShowNewSystem(false);
    setNewSystemName('');
    setNewSystemDesc('');
  }, [attribute, isOpen]);

  const handleCreateEntity = async () => {
    if (!onCreateEntity || !newEntityName.trim()) return;
    setCreatingEntity(true);
    try {
      const created = await onCreateEntity({ name: newEntityName.trim(), description: newEntityDesc.trim() });
      setFormData({ ...formData, entity_id: created.id });
      setShowNewEntity(false);
      setNewEntityName('');
      setNewEntityDesc('');
    } finally {
      setCreatingEntity(false);
    }
  };

  const handleCreateSystem = async () => {
    if (!onCreateSystem || !newSystemName.trim()) return;
    setCreatingSystem(true);
    try {
      const created = await onCreateSystem({ name: newSystemName.trim(), description: newSystemDesc.trim() });
      setFormData({ ...formData, system_id: created.id });
      setShowNewSystem(false);
      setNewSystemName('');
      setNewSystemDesc('');
    } finally {
      setCreatingSystem(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving attribute:', formData);
    onSave(formData);
    onClose();
  };

  const addConstraint = () => {
    setFormData({
      ...formData,
      constraints: [
        ...(formData.constraints ?? []),
        { type: 'required', description: '' },
      ],
    });
  };

  const updateConstraint = (index: number, updates: Partial<ConstraintData>) => {
    const updated = [...(formData.constraints ?? [])];
    updated[index] = { ...updated[index], ...updates };
    setFormData({ ...formData, constraints: updated });
  };

  const removeConstraint = (index: number) => {
    const updated = [...(formData.constraints ?? [])];
    updated.splice(index, 1);
    setFormData({ ...formData, constraints: updated });
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
                {attribute ? 'Edit Attribute' : 'Create New Attribute'}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <StateSelector
                  value={formData.state || 'as-is'}
                  onChange={(state) => setFormData({ ...formData, state })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attribute Name *
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
                  placeholder="Describe what this attribute represents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  value={formData.data_type || 'string'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_type: e.target.value as AttributeData['data_type'],
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number (Integer)</option>
                  <option value="decimal">Decimal</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The data type of this attribute's values. Used in TMDL and Fabric exports.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Entity selector with inline create */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity *
                  </label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.entity_id}
                      onChange={(e) =>
                        setFormData({ ...formData, entity_id: e.target.value })
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an entity...</option>
                      {availableEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                    {onCreateEntity && (
                      <button
                        type="button"
                        onClick={() => setShowNewEntity(!showNewEntity)}
                        className={`px-2.5 border rounded-lg transition-colors ${
                          showNewEntity
                            ? 'bg-blue-50 border-blue-300 text-blue-600'
                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                        title="Create new entity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showNewEntity && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={newEntityName}
                        onChange={(e) => setNewEntityName(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Entity name (e.g., Production Order)"
                      />
                      <input
                        type="text"
                        value={newEntityDesc}
                        onChange={(e) => setNewEntityDesc(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Description (optional)"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateEntity}
                          disabled={!newEntityName.trim() || creatingEntity}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                          {creatingEntity ? 'Creating...' : 'Create & Select'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewEntity(false); setNewEntityName(''); setNewEntityDesc(''); }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* System selector with inline create */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System *
                  </label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.system_id}
                      onChange={(e) =>
                        setFormData({ ...formData, system_id: e.target.value })
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a system...</option>
                      {availableSystems.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.name}
                        </option>
                      ))}
                    </select>
                    {onCreateSystem && (
                      <button
                        type="button"
                        onClick={() => setShowNewSystem(!showNewSystem)}
                        className={`px-2.5 border rounded-lg transition-colors ${
                          showNewSystem
                            ? 'bg-blue-50 border-blue-300 text-blue-600'
                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                        title="Create new system"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showNewSystem && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={newSystemName}
                        onChange={(e) => setNewSystemName(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="System name (e.g., SAP ECC)"
                      />
                      <input
                        type="text"
                        value={newSystemDesc}
                        onChange={(e) => setNewSystemDesc(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Description (optional)"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateSystem}
                          disabled={!newSystemName.trim() || creatingSystem}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                          {creatingSystem ? 'Creating...' : 'Create & Select'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewSystem(false); setNewSystemName(''); setNewSystemDesc(''); }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Perspectives */}
            {availablePerspectives.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perspectives
                </label>
                <div className="flex flex-wrap gap-2">
                  {availablePerspectives.map((p) => {
                    const selected = (formData.perspective_ids ?? []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const ids = formData.perspective_ids ?? [];
                          setFormData({
                            ...formData,
                            perspective_ids: selected
                              ? ids.filter((id) => id !== p.id)
                              : [...ids, p.id],
                          });
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select which perspectives this attribute is relevant to
                </p>
              </div>
            )}

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
                        reliability: e.target.value as AttributeData['reliability'],
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
                      volatility: e.target.value as AttributeData['volatility'],
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

            {/* Source Binding */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Source Binding</h3>
              <p className="text-sm text-gray-500">
                Map this attribute to a specific table and column in the source system.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Table
                  </label>
                  <input
                    type="text"
                    value={formData.source_table ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, source_table: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g., AFKO, dbo.ProductionOrders"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Column
                  </label>
                  <input
                    type="text"
                    value={formData.source_column ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, source_column: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g., GAMNG, ConfirmedQty"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Connection
                  </label>
                  <input
                    type="text"
                    value={formData.source_connection ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, source_connection: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g., SAP ECC PRD, jdbc:sqlserver://..."
                  />
                </div>
              </div>
            </div>

            {/* Business Rules */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Business Rules</h3>
                  <p className="text-sm text-gray-500">
                    Define constraints and validation rules for this attribute.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addConstraint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </div>

              {(formData.constraints ?? []).length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No business rules defined. Click "Add Rule" to create one.
                </p>
              )}

              {(formData.constraints ?? []).map((constraint, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Rule Type
                      </label>
                      <select
                        value={constraint.type}
                        onChange={(e) =>
                          updateConstraint(index, {
                            type: e.target.value as ConstraintData['type'],
                          })
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="range">Range</option>
                        <option value="required">Required</option>
                        <option value="format">Format</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeConstraint(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {constraint.type === 'range' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Min
                        </label>
                        <input
                          type="number"
                          value={constraint.min ?? ''}
                          onChange={(e) =>
                            updateConstraint(index, {
                              min: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Min value"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Max
                        </label>
                        <input
                          type="number"
                          value={constraint.max ?? ''}
                          onChange={(e) =>
                            updateConstraint(index, {
                              max: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Max value"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={constraint.unit ?? ''}
                          onChange={(e) =>
                            updateConstraint(index, { unit: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., %, kg"
                        />
                      </div>
                    </div>
                  )}

                  {constraint.type === 'format' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Pattern
                      </label>
                      <input
                        type="text"
                        value={constraint.pattern ?? ''}
                        onChange={(e) =>
                          updateConstraint(index, { pattern: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., ^[A-Z]{2}-\\d{4}$"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={constraint.description}
                      onChange={(e) =>
                        updateConstraint(index, { description: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the business rule..."
                    />
                  </div>
                </div>
              ))}
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
                  placeholder="Any additional context or notes about this attribute..."
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
              Save Attribute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
