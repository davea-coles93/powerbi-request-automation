import { useMemo, useState } from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { PerspectiveBadges } from './cells/PerspectiveBadges';
import { Target, Trash2 } from 'lucide-react';

interface Metric {
  id: string;
  name: string;
  description?: string;
  business_question: string;
  calculated_by_measure_ids: string[];
  perspective_ids: string[];
}

interface LookupMeasure {
  id: string;
  name: string;
}

interface MetricsTableProps {
  metrics: Metric[];
  measures?: LookupMeasure[];
  onMetricClick?: (metric: Metric) => void;
  onViewLineage?: (metricId: string) => void;
  onNewMetric?: () => void;
  onEditMetric?: (metric: Metric) => void;
  onDeleteMetric?: (metric: Metric) => void;
}

export function MetricsTable({ metrics, measures = [], onMetricClick, onViewLineage, onNewMetric, onEditMetric, onDeleteMetric }: MetricsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Metric | null>(null);
  const measureMap = useMemo(() => new Map(measures.map(m => [m.id, m.name])), [measures]);
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
          <div className="text-gray-600 max-w-md italic">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'perspective_ids',
        header: 'Perspectives',
        cell: (info) => <PerspectiveBadges perspectiveIds={info.getValue() as string[]} />,
      },
      {
        accessorKey: 'calculated_by_measure_ids',
        header: 'Measures',
        cell: (info) => {
          const measureIds = info.getValue() as string[];
          const resolvedNames = measureIds.map(id => measureMap.get(id) || id);
          return (
            <div className="text-sm text-gray-600" title={resolvedNames.join(', ')}>
              {resolvedNames.length === 0 ? (
                <span className="text-gray-400">None</span>
              ) : resolvedNames.length <= 2 ? (
                resolvedNames.join(', ')
              ) : (
                <>{resolvedNames.slice(0, 2).join(', ')} <span className="text-gray-400">+{resolvedNames.length - 2}</span></>
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
            {onDeleteMetric && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(info.row.original);
                }}
                className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-100 hover:text-red-800 rounded text-sm font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [onMetricClick, onViewLineage, onEditMetric, onDeleteMetric, measureMap]
  );

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
        renderSubComponent={({ row }: { row: Row<Metric> }) => {
          const metric = row.original;
          const resolvedMeasures = metric.calculated_by_measure_ids.map(id => ({
            id,
            name: measureMap.get(id) || id,
          }));
          return (
            <div className="space-y-3">
              {metric.description && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                  <p className="text-sm text-gray-700 mt-0.5">{metric.description}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Calculated by measures</span>
                {resolvedMeasures.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-0.5">No measures linked</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {resolvedMeasures.map(m => (
                      <span key={m.id} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {onViewLineage && (
                <button
                  onClick={() => onViewLineage(metric.id)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  View Full Lineage →
                </button>
              )}
            </div>
          );
        }}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="Metric"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteMetric?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
