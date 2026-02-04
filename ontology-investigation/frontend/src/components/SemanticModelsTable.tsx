import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface SemanticModelTable {
  id: string;
  name: string;
  table_type: 'Fact' | 'Dimension' | 'Bridge';
  columns_count: number;
  measures_count: number;
  mapped_entity_id?: string;
  source_system_id?: string;
  has_relationships: boolean;
}

interface SemanticModelsTableProps {
  tables: SemanticModelTable[];
  onTableClick?: (table: SemanticModelTable) => void;
  onEditTable?: (tableId: string) => void;
  onViewRelationships?: (tableId: string) => void;
  onMapColumns?: (tableId: string) => void;
  onNewTable?: () => void;
}

export function SemanticModelsTable({
  tables,
  onTableClick,
  onEditTable,
  onViewRelationships,
  onMapColumns,
  onNewTable,
}: SemanticModelsTableProps) {
  const columns = useMemo<ColumnDef<SemanticModelTable>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Table Name',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{info.getValue() as string}</span>
          </div>
        ),
      },
      {
        accessorKey: 'table_type',
        header: 'Type',
        cell: (info) => {
          const type = info.getValue() as string;
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                type === 'Fact'
                  ? 'bg-blue-100 text-blue-800'
                  : type === 'Dimension'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {type === 'Fact' ? '⚡ Fact' : type === 'Dimension' ? '📊 Dimension' : '🔗 Bridge'}
            </span>
          );
        },
      },
      {
        accessorKey: 'columns_count',
        header: 'Columns',
        cell: (info) => (
          <div className="text-sm text-gray-600">{info.getValue() as number}</div>
        ),
      },
      {
        accessorKey: 'measures_count',
        header: 'DAX Measures',
        cell: (info) => {
          const count = info.getValue() as number;
          return (
            <div className="text-sm text-gray-600">
              {count > 0 ? (
                <span className="text-green-600 font-medium">{count}</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'source_system_id',
        header: 'Source',
        cell: (info) => {
          const source = info.getValue() as string | undefined;
          return source ? (
            <span className="text-xs font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded">
              {source}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">Not mapped</span>
          );
        },
      },
      {
        accessorKey: 'mapped_entity_id',
        header: 'Ontology Mapping',
        cell: (info) => {
          const mapped = info.getValue() as string | undefined;
          return mapped ? (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1 w-fit">
              ✓ Mapped
            </span>
          ) : (
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded flex items-center gap-1 w-fit">
              ⚠ Not mapped
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTable?.(info.row.original.id);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMapColumns?.(info.row.original.id);
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Map
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewRelationships?.(info.row.original.id);
              }}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              Relationships
            </button>
          </div>
        ),
      },
    ],
    [onEditTable, onViewRelationships, onMapColumns]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Semantic Model</h2>
          <p className="text-gray-600 mt-1">
            Power BI tables, columns, and relationships
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            📥 Import from PBIX
          </button>
          <button
            onClick={onNewTable}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Table
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Fact Tables</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {tables.filter((t) => t.table_type === 'Fact').length}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-purple-600 text-sm font-medium">Dimensions</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {tables.filter((t) => t.table_type === 'Dimension').length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Mapped</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {tables.filter((t) => t.mapped_entity_id).length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-yellow-600 text-sm font-medium">Unmapped</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">
            {tables.filter((t) => !t.mapped_entity_id).length}
          </div>
        </div>
      </div>

      <DataTable
        data={tables}
        columns={columns}
        searchPlaceholder="Search tables..."
        onRowClick={onTableClick}
      />
    </div>
  );
}
