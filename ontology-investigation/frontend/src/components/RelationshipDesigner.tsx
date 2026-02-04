import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  table_type: 'Fact' | 'Dimension' | 'Bridge';
  x?: number;
  y?: number;
}

interface Relationship {
  id: string;
  from_table_id: string;
  to_table_id: string;
  cardinality: '1:1' | '1:*' | '*:1' | '*:*';
  from_column?: string;
  to_column?: string;
}

interface RelationshipDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  relationships: Relationship[];
  onSave: (relationships: Relationship[]) => void;
}

export function RelationshipDesigner({
  isOpen,
  onClose,
  tables,
  relationships: initialRelationships,
  onSave,
}: RelationshipDesignerProps) {
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);

  // Position tables in a layout
  const [tablePositions, setTablePositions] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  useEffect(() => {
    // Initialize table positions in a grid layout
    const positions = new Map<string, { x: number; y: number }>();
    const cols = Math.ceil(Math.sqrt(tables.length));
    const padding = 50;
    const boxWidth = 180;
    const boxHeight = 100;
    const spacingX = boxWidth + 100;
    const spacingY = boxHeight + 80;

    tables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positions.set(table.id, {
        x: padding + col * spacingX,
        y: padding + row * spacingY,
      });
    });

    setTablePositions(positions);
  }, [tables]);

  const handleAddRelationship = () => {
    setEditingRelationship({
      id: `rel_${Date.now()}`,
      from_table_id: tables[0]?.id || '',
      to_table_id: tables[1]?.id || '',
      cardinality: '1:*',
      from_column: '',
      to_column: '',
    });
    setIsAddingRelationship(true);
  };

  const handleSaveRelationship = () => {
    if (editingRelationship) {
      if (isAddingRelationship) {
        setRelationships([...relationships, editingRelationship]);
      } else {
        setRelationships(
          relationships.map((r) => (r.id === editingRelationship.id ? editingRelationship : r))
        );
      }
      setEditingRelationship(null);
      setIsAddingRelationship(false);
    }
  };

  const handleDeleteRelationship = (id: string) => {
    setRelationships(relationships.filter((r) => r.id !== id));
    if (selectedRelationship === id) {
      setSelectedRelationship(null);
    }
  };

  const handleEditRelationship = (rel: Relationship) => {
    setEditingRelationship({ ...rel });
    setIsAddingRelationship(false);
  };

  const handleSubmit = () => {
    onSave(relationships);
    onClose();
  };

  const getTableById = (id: string): Table | undefined => {
    return tables.find((t) => t.id === id);
  };

  const getTableColor = (type: 'Fact' | 'Dimension' | 'Bridge'): string => {
    switch (type) {
      case 'Fact':
        return 'fill-blue-100 stroke-blue-500';
      case 'Dimension':
        return 'fill-purple-100 stroke-purple-500';
      case 'Bridge':
        return 'fill-gray-100 stroke-gray-500';
    }
  };

  if (!isOpen) return null;

  const canvasWidth = Math.max(
    1000,
    ...Array.from(tablePositions.values()).map((p) => p.x + 200)
  );
  const canvasHeight = Math.max(
    600,
    ...Array.from(tablePositions.values()).map((p) => p.y + 150)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relationship Designer</h2>
            <p className="text-sm text-gray-600 mt-1">
              Define relationships between tables
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-b px-6 py-3 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Tables:</span>
              <span className="ml-2 font-semibold">{tables.length}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Relationships:</span>
              <span className="ml-2 font-semibold">{relationships.length}</span>
            </div>
          </div>
          <button
            onClick={handleAddRelationship}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Relationship
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="bg-white border rounded-lg shadow-sm"
          >
            {/* Draw relationship lines */}
            {relationships.map((rel) => {
              const fromPos = tablePositions.get(rel.from_table_id);
              const toPos = tablePositions.get(rel.to_table_id);
              const fromTable = getTableById(rel.from_table_id);
              const toTable = getTableById(rel.to_table_id);

              if (!fromPos || !toPos || !fromTable || !toTable) return null;

              const fromX = fromPos.x + 90;
              const fromY = fromPos.y + 50;
              const toX = toPos.x + 90;
              const toY = toPos.y + 50;

              const isSelected = selectedRelationship === rel.id;

              return (
                <g key={rel.id}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke={isSelected ? '#3b82f6' : '#6b7280'}
                    strokeWidth={isSelected ? 3 : 2}
                    markerEnd="url(#arrowhead)"
                    className="cursor-pointer hover:stroke-blue-500"
                    onClick={() => setSelectedRelationship(rel.id)}
                  />
                  {/* Cardinality label */}
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2 - 5}
                    fill="#374151"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {rel.cardinality}
                  </text>
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>

            {/* Draw table boxes */}
            {tables.map((table) => {
              const pos = tablePositions.get(table.id);
              if (!pos) return null;

              const colorClass = getTableColor(table.table_type);

              return (
                <g key={table.id} transform={`translate(${pos.x}, ${pos.y})`}>
                  <rect
                    width="180"
                    height="100"
                    rx="8"
                    className={`${colorClass} stroke-2`}
                  />
                  <text
                    x="90"
                    y="30"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill="#1f2937"
                  >
                    {table.name}
                  </text>
                  <text
                    x="90"
                    y="50"
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {table.table_type}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Relationship List / Editor Sidebar */}
        <div className="border-t bg-white">
          <div className="px-6 py-4">
            <h3 className="font-semibold text-gray-900 mb-3">Relationships</h3>
            {relationships.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-gray-500 text-sm">No relationships defined</p>
                <button
                  onClick={handleAddRelationship}
                  className="text-blue-600 hover:text-blue-700 font-medium mt-2 text-sm"
                >
                  Add your first relationship
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-auto">
                {relationships.map((rel) => {
                  const fromTable = getTableById(rel.from_table_id);
                  const toTable = getTableById(rel.to_table_id);
                  const isSelected = selectedRelationship === rel.id;

                  return (
                    <div
                      key={rel.id}
                      onClick={() => setSelectedRelationship(rel.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {fromTable?.name} → {toTable?.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Cardinality: {rel.cardinality}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRelationship(rel);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRelationship(rel.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Edit Relationship Modal */}
        {editingRelationship && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {isAddingRelationship ? 'Add Relationship' : 'Edit Relationship'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Table
                  </label>
                  <select
                    value={editingRelationship.from_table_id}
                    onChange={(e) =>
                      setEditingRelationship({
                        ...editingRelationship,
                        from_table_id: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Table
                  </label>
                  <select
                    value={editingRelationship.to_table_id}
                    onChange={(e) =>
                      setEditingRelationship({
                        ...editingRelationship,
                        to_table_id: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardinality
                  </label>
                  <select
                    value={editingRelationship.cardinality}
                    onChange={(e) =>
                      setEditingRelationship({
                        ...editingRelationship,
                        cardinality: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1:1">One to One (1:1)</option>
                    <option value="1:*">One to Many (1:*)</option>
                    <option value="*:1">Many to One (*:1)</option>
                    <option value="*:*">Many to Many (*:*)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Column (optional)
                  </label>
                  <input
                    type="text"
                    value={editingRelationship.from_column || ''}
                    onChange={(e) =>
                      setEditingRelationship({
                        ...editingRelationship,
                        from_column: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ProductID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Column (optional)
                  </label>
                  <input
                    type="text"
                    value={editingRelationship.to_column || ''}
                    onChange={(e) =>
                      setEditingRelationship({
                        ...editingRelationship,
                        to_column: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ProductKey"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingRelationship(null);
                    setIsAddingRelationship(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRelationship}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white">
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
            Save Relationships
          </button>
        </div>
      </div>
    </div>
  );
}
