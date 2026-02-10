import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Eye, Edit, Box } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  description?: string;
  core_attributes: Array<{
    name: string;
    data_type: 'string' | 'number' | 'date' | 'datetime' | 'boolean';
    description?: string;
  }>;
  lenses: Array<{
    perspective_id: string;
    interpretation: string;
    derived_attributes: any[];
  }>;
}

interface EntitiesTableProps {
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  onEditEntity?: (entity: Entity) => void;
  onViewLenses?: (entity: Entity) => void;
  onNewEntity?: () => void;
}

export function EntitiesTable({
  entities,
  onEntityClick,
  onEditEntity,
  onViewLenses,
  onNewEntity,
}: EntitiesTableProps) {
  const columns = useMemo<ColumnDef<Entity>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Entity Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: (info) => {
          const description = info.getValue() as string | undefined;
          return (
            <div className="text-sm text-gray-600 max-w-md truncate">
              {description || <span className="text-gray-400">No description</span>}
            </div>
          );
        },
      },
      {
        id: 'core_attributes',
        header: '# of Core Attributes',
        cell: (info) => {
          const entity = info.row.original;
          const count = entity.core_attributes.length;
          return (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{count}</span> attribute{count !== 1 ? 's' : ''}
            </div>
          );
        },
      },
      {
        id: 'lenses',
        header: '# of Lenses (Perspectives)',
        cell: (info) => {
          const entity = info.row.original;
          const count = entity.lenses.length;
          return (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{count}</span> lens{count !== 1 ? 'es' : ''}
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
                onEditEntity?.(info.row.original);
              }}
              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewLenses?.(info.row.original);
              }}
              className="flex items-center gap-1 px-3 py-1 text-purple-600 hover:bg-purple-100 hover:text-purple-800 rounded text-sm font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Lenses
            </button>
          </div>
        ),
      },
    ],
    [onEditEntity, onViewLenses]
  );

  // Show empty state if no entities
  if (entities.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Entities</h2>
            <p className="text-gray-600 mt-1">
              Business concepts with core attributes and perspective-based lenses
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Box className="w-full h-full" />}
          title="No Entities Yet"
          description="Entities are the core business concepts you track and analyze. They have core attributes that define them and can have different interpretations (lenses) based on perspectives. Examples: Production Order, Material, Customer, Work Center."
          actionLabel="+ Create First Entity"
          onAction={onNewEntity}
          secondaryActionLabel="📖 Learn About Entities"
          onSecondaryAction={() => window.open('https://docs.example.com/entities', '_blank')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Entities</h2>
          <p className="text-gray-600 mt-1">
            Business concepts with core attributes and perspective-based lenses
          </p>
        </div>
        <button
          onClick={onNewEntity}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Entity
        </button>
      </div>

      <DataTable
        data={entities}
        columns={columns}
        searchPlaceholder="Search entities..."
        onRowClick={onEntityClick}
      />
    </div>
  );
}
