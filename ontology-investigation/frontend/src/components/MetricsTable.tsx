import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface Metric {
  id: string;
  name: string;
  description?: string;
  business_question: string;
  calculated_by_measure_ids: string[];
  perspective_ids: string[];
}

interface MetricsTableProps {
  metrics: Metric[];
  onMetricClick?: (metric: Metric) => void;
  onViewLineage?: (metricId: string) => void;
  onNewMetric?: () => void;
  onEditMetric?: (metric: Metric) => void;
}

export function MetricsTable({ metrics, onMetricClick, onViewLineage, onNewMetric, onEditMetric }: MetricsTableProps) {
  const columns = useMemo<ColumnDef<Metric>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Metric Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'business_question',
        header: 'Business Question',
        cell: (info) => (
          <div className="text-gray-600 max-w-md">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'perspective_ids',
        header: 'Perspectives',
        cell: (info) => {
          const perspectives = info.getValue() as string[];
          return (
            <div className="flex gap-1 flex-wrap">
              {perspectives.map((p) => (
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
                  {p}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'calculated_by_measure_ids',
        header: 'Measures',
        cell: (info) => {
          const measures = info.getValue() as string[];
          return (
            <div className="text-sm text-gray-600">
              {measures.length} measure{measures.length !== 1 ? 's' : ''}
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
                onEditMetric?.(info.row.original);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewLineage?.(info.row.original.id);
              }}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              View Lineage
            </button>
          </div>
        ),
      },
    ],
    [onMetricClick, onViewLineage, onEditMetric]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Metrics</h2>
          <p className="text-gray-600 mt-1">
            Business KPIs and performance indicators
          </p>
        </div>
        <button
          onClick={onNewMetric}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Metric
        </button>
      </div>

      <DataTable
        data={metrics}
        columns={columns}
        searchPlaceholder="Search metrics..."
        onRowClick={onMetricClick}
      />
    </div>
  );
}
