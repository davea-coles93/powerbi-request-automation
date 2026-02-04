import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Edit, Database } from 'lucide-react';
import { System, SystemType, IntegrationStatus } from '../types/ontology';

interface SystemsTableProps {
  systems: System[];
  onSystemClick?: (system: System) => void;
  onEditSystem?: (system: System) => void;
  onNewSystem?: () => void;
}

const systemTypeColors: Record<SystemType, string> = {
  'ERP': 'bg-blue-100 text-blue-700',
  'MES': 'bg-purple-100 text-purple-700',
  'WMS': 'bg-green-100 text-green-700',
  'Spreadsheet': 'bg-yellow-100 text-yellow-700',
  'Manual': 'bg-gray-100 text-gray-700',
  'BI': 'bg-indigo-100 text-indigo-700',
  'Other': 'bg-gray-100 text-gray-600',
};

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
  onNewSystem,
}: SystemsTableProps) {
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
        cell: (info) => {
          const type = info.getValue() as SystemType;
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemTypeColors[type]}`}>
              {type}
            </span>
          );
        },
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
        cell: (info) => {
          const reliability = info.getValue() as string | undefined;
          const colors = {
            'High': 'text-green-700',
            'Medium': 'text-yellow-700',
            'Low': 'text-red-700',
          };
          return (
            <div className={`text-sm font-medium ${reliability ? colors[reliability as keyof typeof colors] : 'text-gray-400'}`}>
              {reliability || '-'}
            </div>
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
                onEditSystem?.(info.row.original);
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        ),
      },
    ],
    [onEditSystem]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Systems
          </h2>
          <p className="text-gray-600 mt-1">
            Source systems that produce observations and data
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
    </div>
  );
}
