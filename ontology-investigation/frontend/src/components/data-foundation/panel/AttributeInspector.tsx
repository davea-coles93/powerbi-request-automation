import { AlertTriangle, ExternalLink } from 'lucide-react';
import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import type { Attribute, Entity, System, Measure } from '../../../types/ontology';

interface AttributeInspectorProps {
  data: Attribute;
}

const reliabilityColors: Record<string, { bg: string; text: string; label: string }> = {
  High: { bg: 'bg-green-100', text: 'text-green-800', label: 'High' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
  Low: { bg: 'bg-red-100', text: 'text-red-800', label: 'Low' },
};

export function AttributeInspector({ data }: AttributeInspectorProps) {
  const { measures, entities, systems } = useDataFoundationData();
  const selectNode = useDataFoundationStore((s) => s.selectNode);
  const measureConfig = entityTypeConfig.measure;

  const entity: Entity | undefined = entities.find((e: any) => e.id === data.entity_id);
  const system: System | undefined = systems.find((s: any) => s.id === data.system_id);

  // Find measures that consume this attribute
  const usedByMeasures: Measure[] = measures.filter((m: any) =>
    m.input_attribute_ids?.includes(data.id),
  );

  const reliabilityInfo = data.reliability ? reliabilityColors[data.reliability] : null;

  return (
    <div className="p-4 space-y-5">
      {/* Name */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{data.name}</h3>
        {data.description && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{data.description}</p>
        )}
      </div>

      {/* Properties */}
      <div className="space-y-2">
        {entity && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Entity</span>
            <button
              onClick={() => selectNode({ id: entity.id, type: 'entity', data: entity })}
              className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-[200px]"
            >
              {entity.name}
            </button>
          </div>
        )}
        {system && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Source System</span>
            <button
              onClick={() => selectNode({ id: system.id, type: 'system', data: system })}
              className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-[200px]"
            >
              {system.name}
            </button>
          </div>
        )}
        {data.source_actor && (
          <PropertyRow label="Source Actor" value={data.source_actor} />
        )}
        {data.volatility && (
          <PropertyRow label="Volatility" value={data.volatility} />
        )}
        {data.source_table && (
          <PropertyRow label="Source Table" value={data.source_table} />
        )}
        {data.source_column && (
          <PropertyRow label="Source Column" value={data.source_column} />
        )}
      </div>

      {/* Reliability / Data Quality Badge */}
      {reliabilityInfo && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
            Data Quality
          </h4>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${reliabilityInfo.bg} ${reliabilityInfo.text}`}>
              {reliabilityInfo.label} Reliability
            </span>
            {data.reliability === 'Low' && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      )}

      {/* Used By Measures */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          Used By Measures
        </h4>
        {usedByMeasures.length > 0 ? (
          <div className="space-y-1.5">
            {usedByMeasures.map((measure) => (
              <button
                key={measure.id}
                onClick={() => selectNode({ id: measure.id, type: 'measure', data: measure })}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 group"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: measureConfig.bg, color: measureConfig.color }}
                >
                  {measureConfig.icon}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {measure.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not consumed by any measures</p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t pt-4">
        <button className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm">
          <ExternalLink className="w-3.5 h-3.5" />
          Impact Analysis
        </button>
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium truncate max-w-[200px]">{value}</span>
    </div>
  );
}
