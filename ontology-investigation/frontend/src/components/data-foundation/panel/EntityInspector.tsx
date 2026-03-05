import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import type { Entity, Attribute } from '../../../types/ontology';

interface EntityInspectorProps {
  data: Entity;
}

const perspectiveColors: Record<string, { bg: string; text: string; border: string }> = {
  operational: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  management: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  financial: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
};

export function EntityInspector({ data }: EntityInspectorProps) {
  const { attributes } = useDataFoundationData();
  const selectNode = useDataFoundationStore((s) => s.selectNode);
  const attrConfig = entityTypeConfig.attribute;

  // Attributes belonging to this entity
  const entityAttributes: Attribute[] = attributes.filter(
    (a: any) => a.entity_id === data.id,
  );

  return (
    <div className="p-4 space-y-5">
      {/* Name & Description */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{data.name}</h3>
        {data.description && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{data.description}</p>
        )}
      </div>

      {/* Core Attributes (from entity schema) */}
      {data.core_attributes && data.core_attributes.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
            Core Attributes
          </h4>
          <div className="space-y-1.5">
            {data.core_attributes.map((attr, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{attr.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{attr.data_type}</span>
                </div>
                {attr.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{attr.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ontology Attributes (from the data model) */}
      {entityAttributes.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
            Attributes ({entityAttributes.length})
          </h4>
          <div className="space-y-1.5">
            {entityAttributes.map((attr) => (
              <button
                key={attr.id}
                onClick={() => selectNode({ id: attr.id, type: 'attribute', data: attr })}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 group"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: attrConfig.bg, color: attrConfig.color }}
                >
                  {attrConfig.icon}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {attr.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Perspective Lenses */}
      {data.lenses && data.lenses.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
            Perspective Lenses
          </h4>
          <div className="space-y-2">
            {data.lenses.map((lens, idx) => {
              const colors = perspectiveColors[lens.perspective_id] ?? {
                bg: 'bg-gray-50',
                text: 'text-gray-800',
                border: 'border-gray-200',
              };
              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase ${colors.text}`}>
                      {lens.perspective_id}
                    </span>
                  </div>
                  <p className={`text-sm ${colors.text}`}>{lens.interpretation}</p>
                  {lens.derived_attributes && lens.derived_attributes.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 font-medium">Derived:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lens.derived_attributes.map((da, daIdx) => (
                          <span
                            key={daIdx}
                            className="px-1.5 py-0.5 bg-white/60 rounded text-xs text-gray-700"
                          >
                            {da.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
