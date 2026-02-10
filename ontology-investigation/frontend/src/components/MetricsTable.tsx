import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Target } from 'lucide-react';

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
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditMetric?.(info.row.original);
              }}
              className="px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewLineage?.(info.row.original.id);
              }}
              className="px-3 py-1 text-purple-600 hover:bg-purple-100 hover:text-purple-800 rounded text-sm font-medium transition-colors"
            >
              Lineage
            </button>
          </div>
        ),
      },
    ],
    [onMetricClick, onViewLineage, onEditMetric]
  );

  // Show empty state if no metrics
  if (metrics.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Metrics</h2>
            <p className="text-gray-600 mt-1">
              Business KPIs and performance indicators
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Target className="w-full h-full" />}
          title="No Metrics Yet"
          description="Metrics answer key business questions and are calculated from measures. They represent high-level KPIs that stakeholders care about. Examples: Overall Equipment Effectiveness (OEE), On-Time Delivery Rate, Inventory Turnover."
          actionLabel="+ Create First Metric"
          onAction={onNewMetric}
          secondaryActionLabel="📖 Learn About Metrics"
          onSecondaryAction={() => window.open('https://docs.example.com/metrics', '_blank')}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Metrics
          </h2>
          <p className="text-gray-600 mt-2 text-lg">
            Business KPIs and performance indicators
          </p>
        </div>
        <button
          onClick={onNewMetric}
          className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <span className="relative z-10 flex items-center gap-2">
            <span className="text-xl">+</span>
            New Metric
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity" />
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
