import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { Check, X, Calculator } from 'lucide-react';

interface Measure {
  id: string;
  name: string;
  description?: string;
  logic?: string;
  formula?: string;
  input_attribute_ids: string[];
  input_measure_ids?: string[];
  perspective_ids: string[];
}

interface DaxMeasure {
  id: string;
  name: string;
  implements_measure_id?: string;
}

interface MeasuresTableProps {
  measures: Measure[];
  semanticModelMeasures?: DaxMeasure[];
  onMeasureClick?: (measure: Measure) => void;
  onNewMeasure?: () => void;
  onViewUsage?: (measure: Measure) => void;
}

export function MeasuresTable({
  measures,
  semanticModelMeasures = [],
  onMeasureClick,
  onNewMeasure,
  onViewUsage,
}: MeasuresTableProps) {
  const columns = useMemo<ColumnDef<Measure>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Measure Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        id: 'logic',
        header: 'Logic / Formula',
        cell: (info) => {
          const measure = info.row.original;
          const display = measure.logic || measure.formula || 'N/A';
          return (
            <div className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded max-w-md truncate">
              {display}
            </div>
          );
        },
      },
      {
        accessorKey: 'input_attribute_ids',
        header: 'Input Attributes',
        cell: (info) => {
          const attributes = info.getValue() as string[];
          return (
            <div className="text-sm text-gray-600">
              {attributes.length} attribute{attributes.length !== 1 ? 's' : ''}
            </div>
          );
        },
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
        id: 'semantic_status',
        header: 'Semantic Status',
        cell: (info) => {
          const measure = info.row.original;
          const isImplemented = semanticModelMeasures.some(
            (daxMeasure) => daxMeasure.implements_measure_id === measure.id
          );
          const implementingMeasures = semanticModelMeasures.filter(
            (daxMeasure) => daxMeasure.implements_measure_id === measure.id
          );

          return (
            <div className="flex items-center gap-2">
              {isImplemented ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Implemented ({implementingMeasures.length})
                  </span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    Not Implemented
                  </span>
                </>
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
                onMeasureClick?.(info.row.original);
              }}
              className="px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewUsage?.(info.row.original);
              }}
              className="px-3 py-1 text-green-600 hover:bg-green-100 hover:text-green-800 rounded text-sm font-medium transition-colors"
            >
              Usage
            </button>
          </div>
        ),
      },
    ],
    [onMeasureClick, onViewUsage, semanticModelMeasures]
  );

  // Show empty state if no measures
  if (measures.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Measures</h2>
            <p className="text-gray-600 mt-1">
              Calculations and derivations from attributes
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Calculator className="w-full h-full" />}
          title="No Measures Yet"
          description="Measures are calculations derived from attributes. They transform raw data into meaningful values. Examples: Total Production Quantity (sum of quantities), Average Cycle Time, Defect Rate (calculated ratio)."
          actionLabel="+ Create First Measure"
          onAction={onNewMeasure}
          secondaryActionLabel="📖 Learn About Measures"
          onSecondaryAction={() => window.open('https://docs.example.com/measures', '_blank')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Measures</h2>
          <p className="text-gray-600 mt-1">
            Calculations and derivations from attributes
          </p>
        </div>
        <button
          onClick={onNewMeasure}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Measure
        </button>
      </div>

      <DataTable
        data={measures}
        columns={columns}
        searchPlaceholder="Search measures..."
        onRowClick={onMeasureClick}
      />
    </div>
  );
}
