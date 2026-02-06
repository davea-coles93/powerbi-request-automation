import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface Observation {
  id: string;
  name: string;
  description?: string;
  system_id: string;
  entity_id: string;
  reliability?: 'High' | 'Medium' | 'Low';
  volatility?: 'Point-in-time' | 'Accumulating' | 'Continuous';
  perspective_ids?: string[];
}

interface ObservationsTableProps {
  observations: Observation[];
  onObservationClick?: (observation: Observation) => void;
  onNewObservation?: () => void;
  onMapObservation?: (observation: Observation) => void;
}

export function ObservationsTable({
  observations,
  onObservationClick,
  onNewObservation,
  onMapObservation,
}: ObservationsTableProps) {
  const columns = useMemo<ColumnDef<Observation>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Observation Name',
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
          const obs = info.row.original;
          const perspectives = obs.perspective_ids || [];
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
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onObservationClick?.(info.row.original);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMapObservation?.(info.row.original);
              }}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Map
            </button>
          </div>
        ),
      },
    ],
    [onObservationClick, onMapObservation]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Observations</h2>
          <p className="text-gray-600 mt-1">
            Data points captured into source systems
          </p>
        </div>
        <button
          onClick={onNewObservation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Observation
        </button>
      </div>

      <DataTable
        data={observations}
        columns={columns}
        searchPlaceholder="Search observations..."
        onRowClick={onObservationClick}
      />
    </div>
  );
}
