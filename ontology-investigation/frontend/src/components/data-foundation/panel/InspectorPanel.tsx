import { X } from 'lucide-react';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import { entityTypeConfig } from '../nodes/entityTypeConfig';
import { MetricInspector } from './MetricInspector';
import { MeasureInspector } from './MeasureInspector';
import { AttributeInspector } from './AttributeInspector';
import { EntityInspector } from './EntityInspector';
import { SystemInspector } from './SystemInspector';

function InspectorContent({ type, data }: { type: string; data: any }) {
  switch (type) {
    case 'metric':
      return <MetricInspector data={data} />;
    case 'measure':
      return <MeasureInspector data={data} />;
    case 'attribute':
      return <AttributeInspector data={data} />;
    case 'entity':
      return <EntityInspector data={data} />;
    case 'system':
      return <SystemInspector data={data} />;
    default:
      return (
        <div className="p-4 text-sm text-gray-500">
          Unknown element type: {type}
        </div>
      );
  }
}

export function InspectorPanel() {
  const inspectorOpen = useDataFoundationStore((s) => s.inspectorOpen);
  const selectedNode = useDataFoundationStore((s) => s.selectedNode);
  const closeInspector = useDataFoundationStore((s) => s.closeInspector);

  const config = selectedNode ? entityTypeConfig[selectedNode.type] : null;
  const title = config?.label ?? 'Inspector';

  return (
    <div
      className={`absolute top-0 right-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col transition-transform duration-200 ease-out ${
        inspectorOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {config && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
              style={{
                backgroundColor: config.bg,
                color: config.color,
                borderColor: config.border,
                borderWidth: 1,
              }}
            >
              {config.icon} {title}
            </span>
          )}
          {!config && (
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
              {title}
            </h3>
          )}
        </div>
        <button
          onClick={closeInspector}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedNode ? (
          <InspectorContent type={selectedNode.type} data={selectedNode.data} />
        ) : (
          <div className="p-4 text-sm text-gray-400">No element selected.</div>
        )}
      </div>
    </div>
  );
}
