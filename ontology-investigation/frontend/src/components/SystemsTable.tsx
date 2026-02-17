import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { SystemTypeBadge } from './cells/SystemTypeBadge';
import { ReliabilityBadge } from './cells/ReliabilityBadge';
import { Edit, Trash2, Database, Server } from 'lucide-react';
import { System, IntegrationStatus } from '../types/ontology';

interface SystemsTableProps {
  systems: System[];
  onSystemClick?: (system: System) => void;
  onEditSystem?: (system: System) => void;
  onDeleteSystem?: (system: System) => void;
  onNewSystem?: () => void;
}

const integrationStatusColors: Record<IntegrationStatus, string> = {
  'Connected': 'bg-green-100 text-green-800',
  'Planned': 'bg-yellow-100 text-yellow-800',
  'Manual Extract': 'bg-orange-100 text-orange-800',
  'None': 'bg-gray-100 text-gray-600',
};

export function SystemsTable({
  systems,
  onSystemClick,
  onEditSystem,
  onDeleteSystem,
  onNewSystem,
}: SystemsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<System | null>(null);

  const columns = useMemo<ColumnDef<System>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'System Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => <SystemTypeBadge type={info.getValue() as string} />,
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor',
        cell: (info) => {
          const vendor = info.getValue() as string | undefined;
          return (
            <div className="text-sm text-gray-700">
              {vendor || <span className="text-gray-400">Not specified</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'integration_status',
        header: 'Integration Status',
        cell: (info) => {
          const status = info.getValue() as IntegrationStatus | undefined;
          if (!status) return <span className="text-gray-400 text-sm">-</span>;
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${integrationStatusColors[status]}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'reliability_default',
        header: 'Reliability',
        cell: (info) => <ReliabilityBadge reliability={info.getValue() as string | undefined} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSystem?.(info.row.original);
              }}
              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
            {onDeleteSystem && (
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
    [onEditSystem, onDeleteSystem]
  );

  // Show empty state if no systems
  if (systems.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Systems
            </h2>
            <p className="text-gray-600 mt-1">
              Source systems that produce attributes and data
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Server className="w-full h-full" />}
          title="No Systems Yet"
          description="Systems are the source applications where data originates. They capture business events and produce attributes. Examples: SAP ERP, Manufacturing Execution System (MES), Warehouse Management System (WMS), Excel spreadsheets."
          actionLabel="+ Add First System"
          onAction={onNewSystem}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Systems
          </h2>
          <p className="text-gray-600 mt-1">
            Source systems that produce attributes and data
          </p>
        </div>
        <button
          onClick={onNewSystem}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New System
        </button>
      </div>

      <DataTable
        data={systems}
        columns={columns}
        searchPlaceholder="Search systems..."
        onRowClick={onSystemClick}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="System"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteSystem?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
