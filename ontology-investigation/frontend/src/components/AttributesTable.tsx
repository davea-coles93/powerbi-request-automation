import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Database } from 'lucide-react';

interface Attribute {
  id: string;
  name: string;
  description?: string;
  system_id: string;
  entity_id: string;
  reliability?: 'High' | 'Medium' | 'Low';
  volatility?: 'Point-in-time' | 'Accumulating' | 'Continuous';
  perspective_ids?: string[];
}

interface AttributesTableProps {
  attributes: Attribute[];
  onAttributeClick?: (attribute: Attribute) => void;
  onNewAttribute?: () => void;
  onMapAttribute?: (attribute: Attribute) => void;
}

export function AttributesTable({
  attributes,
  onAttributeClick,
  onNewAttribute,
  onMapAttribute,
}: AttributesTableProps) {
  const columns = useMemo<ColumnDef<Attribute>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Attribute Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'system_id',
        header: 'Source System',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded">
              {info.getValue() as string}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'entity_id',
        header: 'Entity',
        cell: (info) => (
          <div className="text-sm text-gray-600">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'reliability',
        header: 'Reliability',
        cell: (info) => {
          const reliability = info.getValue() as string | undefined;
          if (!reliability) return <span className="text-xs text-gray-400">N/A</span>;
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                reliability === 'High'
                  ? 'bg-green-100 text-green-800'
                  : reliability === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {reliability}
            </span>
          );
        },
      },
      {
        accessorKey: 'volatility',
        header: 'Volatility',
        cell: (info) => (
          <div className="text-xs text-gray-600">{info.getValue() as string}</div>
        ),
      },
      {
        id: 'perspectives',
        header: 'Perspectives',
        cell: (info) => {
          const attr = info.row.original;
          const perspectives = attr.perspective_ids || [];
          if (perspectives.length === 0) {
            return <span className="text-xs text-gray-400">N/A</span>;
          }
          return (
            <div className="flex gap-1 flex-wrap">
              {perspectives.slice(0, 2).map((p) => (
                <span
                  key={p}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p === 'operational'
                      ? 'bg-green-100 text-green-800'
                      : p === 'management'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {p.substring(0, 3)}
                </span>
              ))}
              {perspectives.length > 2 && (
                <span className="text-xs text-gray-500">+{perspectives.length - 2}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttributeClick?.(info.row.original);
              }}
              className="px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMapAttribute?.(info.row.original);
              }}
              className="px-3 py-1 text-purple-600 hover:bg-purple-100 hover:text-purple-800 rounded text-sm font-medium transition-colors"
            >
              Map
            </button>
          </div>
        ),
      },
    ],
    [onAttributeClick, onMapAttribute]
  );

  // Show empty state if no attributes
  if (attributes.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attributes</h2>
            <p className="text-gray-600 mt-1">
              Data attributes captured in source systems
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Database className="w-full h-full" />}
          title="No Attributes Yet"
          description="Attributes are raw data points captured about entities in your source systems. They form the foundation of your measures and metrics. Examples: Production Confirmation, Inventory Count, Customer Order."
          actionLabel="+ Create First Attribute"
          onAction={onNewAttribute}
          secondaryActionLabel="📖 Learn About Attributes"
          onSecondaryAction={() => window.open('https://docs.example.com/attributes', '_blank')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attributes</h2>
          <p className="text-gray-600 mt-1">
            Data attributes captured in source systems
          </p>
        </div>
        <button
          onClick={onNewAttribute}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Attribute
        </button>
      </div>

      <DataTable
        data={attributes}
        columns={columns}
        searchPlaceholder="Search attributes..."
        onRowClick={onAttributeClick}
      />
    </div>
  );
}
