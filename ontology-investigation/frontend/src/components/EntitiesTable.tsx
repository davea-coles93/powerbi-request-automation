import { useMemo, useState } from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { PerspectiveBadges } from './cells/PerspectiveBadges';
import { Eye, Edit, Trash2, Box } from 'lucide-react';

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
  onDeleteEntity?: (entity: Entity) => void;
  onViewLenses?: (entity: Entity) => void;
  onNewEntity?: () => void;
}

export function EntitiesTable({
  entities,
  onEntityClick,
  onEditEntity,
  onDeleteEntity,
  onViewLenses,
  onNewEntity,
}: EntitiesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);

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
            {onDeleteEntity && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(info.row.original);
                }}
                className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-100 hover:text-red-800 rounded text-sm font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [onEditEntity, onViewLenses, onDeleteEntity]
  );

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
        renderSubComponent={({ row }: { row: Row<Entity> }) => {
          const entity = row.original;
          return (
            <div className="space-y-3">
              {entity.description && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                  <p className="text-sm text-gray-700 mt-0.5">{entity.description}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Core Attributes</span>
                {entity.core_attributes.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-0.5">No core attributes defined</p>
                ) : (
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {entity.core_attributes.map((attr, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{attr.name}</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">{attr.data_type}</span>
                        {attr.description && (
                          <span className="text-xs text-gray-400 truncate" title={attr.description}>{attr.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Perspective Lenses</span>
                {entity.lenses.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-0.5">No lenses defined</p>
                ) : (
                  <div className="mt-1 space-y-2">
                    {entity.lenses.map((lens, i) => (
                      <div key={i} className="flex items-start gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                        <PerspectiveBadges perspectiveIds={[lens.perspective_id]} />
                        <p className="text-sm text-gray-700 italic">"{lens.interpretation}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="Entity"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteEntity?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
