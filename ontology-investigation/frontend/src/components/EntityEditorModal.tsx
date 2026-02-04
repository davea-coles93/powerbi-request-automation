import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface CoreAttribute {
  id: string;
  name: string;
  data_type: 'string' | 'number' | 'date' | 'datetime' | 'boolean';
  description?: string;
}

interface DerivedAttribute {
  id: string;
  name: string;
  data_type?: string;
  description?: string;
  derivation?: string;
}

interface EntityLens {
  id: string;
  perspective_id: 'operational' | 'management' | 'financial';
  interpretation: string;
  derived_attributes: DerivedAttribute[];
}

interface EntityData {
  id?: string;
  name: string;
  description?: string;
  core_attributes: CoreAttribute[];
  lenses: EntityLens[];
}

interface EntityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity?: EntityData | null;
  onSave: (entity: EntityData) => void;
}

export function EntityEditorModal({
  isOpen,
  onClose,
  entity,
  onSave,
}: EntityEditorModalProps) {
  const [formData, setFormData] = useState<EntityData>({
    name: '',
    description: '',
    core_attributes: [],
    lenses: [],
  });

  useEffect(() => {
    if (entity) {
      setFormData(entity);
    } else {
      setFormData({
        name: '',
        description: '',
        core_attributes: [],
        lenses: [],
      });
    }
  }, [entity, isOpen]);

  // Core Attributes handlers
  const handleAddCoreAttribute = () => {
    const newAttr: CoreAttribute = {
      id: `attr_${Date.now()}`,
      name: '',
      data_type: 'string',
      description: '',
    };
    setFormData({
      ...formData,
      core_attributes: [...formData.core_attributes, newAttr],
    });
  };

  const handleRemoveCoreAttribute = (id: string) => {
    setFormData({
      ...formData,
      core_attributes: formData.core_attributes.filter((attr) => attr.id !== id),
    });
  };

  const handleCoreAttributeChange = (
    id: string,
    field: keyof CoreAttribute,
    value: any
  ) => {
    setFormData({
      ...formData,
      core_attributes: formData.core_attributes.map((attr) =>
        attr.id === id ? { ...attr, [field]: value } : attr
      ),
    });
  };

  // Lens handlers
  const handleAddLens = () => {
    const newLens: EntityLens = {
      id: `lens_${Date.now()}`,
      perspective_id: 'operational',
      interpretation: '',
      derived_attributes: [],
    };
    setFormData({
      ...formData,
      lenses: [...formData.lenses, newLens],
    });
  };

  const handleRemoveLens = (id: string) => {
    setFormData({
      ...formData,
      lenses: formData.lenses.filter((lens) => lens.id !== id),
    });
  };

  const handleLensChange = (id: string, field: keyof EntityLens, value: any) => {
    setFormData({
      ...formData,
      lenses: formData.lenses.map((lens) =>
        lens.id === id ? { ...lens, [field]: value } : lens
      ),
    });
  };

  // Derived Attribute handlers
  const handleAddDerivedAttribute = (lensId: string) => {
    const newDerivedAttr: DerivedAttribute = {
      id: `derived_${Date.now()}`,
      name: '',
      data_type: 'string',
      description: '',
      derivation: '',
    };
    setFormData({
      ...formData,
      lenses: formData.lenses.map((lens) =>
        lens.id === lensId
          ? {
              ...lens,
              derived_attributes: [...lens.derived_attributes, newDerivedAttr],
            }
          : lens
      ),
    });
  };

  const handleRemoveDerivedAttribute = (lensId: string, attrId: string) => {
    setFormData({
      ...formData,
      lenses: formData.lenses.map((lens) =>
        lens.id === lensId
          ? {
              ...lens,
              derived_attributes: lens.derived_attributes.filter(
                (attr) => attr.id !== attrId
              ),
            }
          : lens
      ),
    });
  };

  const handleDerivedAttributeChange = (
    lensId: string,
    attrId: string,
    field: keyof DerivedAttribute,
    value: any
  ) => {
    setFormData({
      ...formData,
      lenses: formData.lenses.map((lens) =>
        lens.id === lensId
          ? {
              ...lens,
              derived_attributes: lens.derived_attributes.map((attr) =>
                attr.id === attrId ? { ...attr, [field]: value } : attr
              ),
            }
          : lens
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
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {entity ? 'Edit Entity' : 'Create New Entity'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define business entity with core attributes and perspective lenses
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
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Production Order, Material, Customer"
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
                  placeholder="Describe this business entity..."
                />
              </div>
            </div>

            {/* Core Attributes Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Core Attributes</h3>
                <button
                  type="button"
                  onClick={handleAddCoreAttribute}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Attribute
                </button>
              </div>

              {formData.core_attributes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-500">No core attributes defined yet</p>
                  <button
                    type="button"
                    onClick={handleAddCoreAttribute}
                    className="text-blue-600 hover:text-blue-700 font-medium mt-2"
                  >
                    Add your first core attribute
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.core_attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="bg-gray-50 p-4 rounded-lg border flex gap-4 items-start"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Attribute name"
                            value={attr.name}
                            onChange={(e) =>
                              handleCoreAttributeChange(attr.id, 'name', e.target.value)
                            }
                            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={attr.data_type}
                            onChange={(e) =>
                              handleCoreAttributeChange(
                                attr.id,
                                'data_type',
                                e.target.value
                              )
                            }
                            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="datetime">DateTime</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={attr.description}
                          onChange={(e) =>
                            handleCoreAttributeChange(
                              attr.id,
                              'description',
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreAttribute(attr.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Perspective Lenses Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Perspective Lenses
                </h3>
                <button
                  type="button"
                  onClick={handleAddLens}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Lens
                </button>
              </div>

              {formData.lenses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-500">No perspective lenses defined yet</p>
                  <button
                    type="button"
                    onClick={handleAddLens}
                    className="text-purple-600 hover:text-purple-700 font-medium mt-2"
                  >
                    Add your first lens
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lenses.map((lens) => (
                    <div
                      key={lens.id}
                      className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 space-y-3"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Perspective
                            </label>
                            <select
                              value={lens.perspective_id}
                              onChange={(e) =>
                                handleLensChange(
                                  lens.id,
                                  'perspective_id',
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="operational">Operational</option>
                              <option value="management">Management</option>
                              <option value="financial">Financial</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Interpretation
                            </label>
                            <input
                              type="text"
                              placeholder="How this perspective sees the entity"
                              value={lens.interpretation}
                              onChange={(e) =>
                                handleLensChange(lens.id, 'interpretation', e.target.value)
                              }
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLens(lens.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Derived Attributes for this lens */}
                      <div className="ml-4 pl-4 border-l-2 border-purple-300 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-gray-700">
                            Derived Attributes
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddDerivedAttribute(lens.id)}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Derived
                          </button>
                        </div>

                        {lens.derived_attributes.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">
                            No derived attributes
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {lens.derived_attributes.map((derivedAttr) => (
                              <div
                                key={derivedAttr.id}
                                className="bg-white p-3 rounded border flex gap-2 items-start"
                              >
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Attribute name"
                                      value={derivedAttr.name}
                                      onChange={(e) =>
                                        handleDerivedAttributeChange(
                                          lens.id,
                                          derivedAttr.id,
                                          'name',
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Data type"
                                      value={derivedAttr.data_type}
                                      onChange={(e) =>
                                        handleDerivedAttributeChange(
                                          lens.id,
                                          derivedAttr.id,
                                          'data_type',
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Description"
                                    value={derivedAttr.description}
                                    onChange={(e) =>
                                      handleDerivedAttributeChange(
                                        lens.id,
                                        derivedAttr.id,
                                        'description',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Derivation (optional)"
                                    value={derivedAttr.derivation}
                                    onChange={(e) =>
                                      handleDerivedAttributeChange(
                                        lens.id,
                                        derivedAttr.id,
                                        'derivation',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveDerivedAttribute(lens.id, derivedAttr.id)
                                  }
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
              Save Entity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
