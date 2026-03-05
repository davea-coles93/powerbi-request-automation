import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import type { System, Attribute } from '../../../types/ontology';

interface SystemInspectorProps {
  data: System;
}

const integrationStatusColors: Record<string, { bg: string; text: string }> = {
  Connected: { bg: 'bg-green-100', text: 'text-green-800' },
  Planned: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Manual Extract': { bg: 'bg-orange-100', text: 'text-orange-800' },
  None: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const reliabilityColors: Record<string, { bg: string; text: string }> = {
  High: { bg: 'bg-green-100', text: 'text-green-800' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Low: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function SystemInspector({ data }: SystemInspectorProps) {
  const { attributes } = useDataFoundationData();
  const selectNode = useDataFoundationStore((s) => s.selectNode);
  const attrConfig = entityTypeConfig.attribute;

  // Attributes hosted by this system
  const hostedAttributes: Attribute[] = attributes.filter(
    (a: any) => a.system_id === data.id,
  );

  const integrationInfo = data.integration_status
    ? integrationStatusColors[data.integration_status]
    : null;

  const reliabilityInfo = data.reliability_default
    ? reliabilityColors[data.reliability_default]
    : null;

  return (
    <div className="p-4 space-y-5">
      {/* Name */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">{data.name}</h3>
        {data.notes && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{data.notes}</p>
        )}
      </div>

      {/* Properties */}
      <div className="space-y-2">
        {data.type && (
          <PropertyRow label="Type" value={data.type} />
        )}
        {data.vendor && (
          <PropertyRow label="Vendor" value={data.vendor} />
        )}
        {integrationInfo && data.integration_status && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Integration</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${integrationInfo.bg} ${integrationInfo.text}`}>
              {data.integration_status}
            </span>
          </div>
        )}
        {reliabilityInfo && data.reliability_default && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Default Reliability</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reliabilityInfo.bg} ${reliabilityInfo.text}`}>
              {data.reliability_default}
            </span>
          </div>
        )}
      </div>

      {/* Hosted Attributes */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
          Hosted Attributes ({hostedAttributes.length})
        </h4>
        {hostedAttributes.length > 0 ? (
          <div className="space-y-1.5">
            {hostedAttributes.map((attr) => (
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
        ) : (
          <p className="text-sm text-gray-400">No attributes hosted</p>
        )}
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}
