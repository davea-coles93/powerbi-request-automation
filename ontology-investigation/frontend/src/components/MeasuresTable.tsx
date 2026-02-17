import { useMemo, useState } from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { PerspectiveBadges } from './cells/PerspectiveBadges';
import { Check, X, Calculator, ArrowRight, Trash2 } from 'lucide-react';
import { useMeasureUsage } from '../hooks/useOntology';

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

interface LookupAttribute {
  id: string;
  name: string;
}

interface MeasuresTableProps {
  measures: Measure[];
  attributes?: LookupAttribute[];
  semanticModelMeasures?: DaxMeasure[];
  onMeasureClick?: (measure: Measure) => void;
  onDeleteMeasure?: (measure: Measure) => void;
  onNewMeasure?: () => void;
  onViewUsage?: (measure: Measure) => void;
}

function MeasureDependencySection({ measureId }: { measureId: string }) {
  const { data, isLoading, error } = useMeasureUsage(measureId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-gray-500">Loading dependencies...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { depends_on_attributes, depends_on_measures, used_in_metrics, used_in_measures } = data;
  const hasInputs = depends_on_attributes.length > 0 || depends_on_measures.length > 0;
  const hasOutputs = used_in_metrics.length > 0 || used_in_measures.length > 0;

  if (!hasInputs && !hasOutputs) {
    return (
      <div>
        <span className="text-xs font-semibold text-gray-500 uppercase">Dependencies</span>
        <p className="text-sm text-gray-400 mt-0.5">No upstream or downstream dependencies found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="font-semibold uppercase">Dependency Flow</span>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-indigo-600 font-medium">
            {depends_on_attributes.length} attribute{depends_on_attributes.length !== 1 ? 's' : ''}
          </span>
          {depends_on_measures.length > 0 && (
            <>
              <span>+</span>
              <span className="text-yellow-600 font-medium">
                {depends_on_measures.length} measure{depends_on_measures.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-bold text-gray-800">THIS MEASURE</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-green-600 font-medium">
            {used_in_metrics.length} metric{used_in_metrics.length !== 1 ? 's' : ''}
          </span>
          {used_in_measures.length > 0 && (
            <>
              <span>+</span>
              <span className="text-yellow-600 font-medium">
                {used_in_measures.length} measure{used_in_measures.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {hasInputs && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Inputs</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {depends_on_attributes.map((obs: any) => (
              <span key={obs.id} className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                {obs.name}
              </span>
            ))}
            {depends_on_measures.map((m: any) => (
              <span key={m.id} className="inline-flex items-center px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasOutputs && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Outputs</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {used_in_metrics.map((mt: any) => (
              <span key={mt.id} className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                {mt.name}
              </span>
            ))}
            {used_in_measures.map((m: any) => (
              <span key={m.id} className="inline-flex items-center px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MeasuresTable({
  measures,
  attributes = [],
  semanticModelMeasures = [],
  onMeasureClick,
  onDeleteMeasure,
  onNewMeasure,
  onViewUsage,
}: MeasuresTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Measure | null>(null);
  const attributeMap = useMemo(() => new Map(attributes.map(a => [a.id, a.name])), [attributes]);
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
          const attrIds = info.getValue() as string[];
          const resolvedNames = attrIds.map(id => attributeMap.get(id) || id);
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
        accessorKey: 'perspective_ids',
        header: 'Perspectives',
        cell: (info) => <PerspectiveBadges perspectiveIds={info.getValue() as string[]} />,
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
            {onDeleteMeasure && (
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
    [onMeasureClick, onViewUsage, onDeleteMeasure, semanticModelMeasures, attributeMap]
  );

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
        renderSubComponent={({ row }: { row: Row<Measure> }) => {
          const measure = row.original;
          const resolvedAttrs = measure.input_attribute_ids.map(id => ({
            id,
            name: attributeMap.get(id) || id,
          }));
          return (
            <div className="space-y-3">
              {measure.description && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                  <p className="text-sm text-gray-700 mt-0.5">{measure.description}</p>
                </div>
              )}
              {(measure.logic || measure.formula) && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Logic / Formula</span>
                  <pre className="text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg p-2 mt-0.5 whitespace-pre-wrap">
                    {measure.logic || measure.formula}
                  </pre>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Input Attributes</span>
                {resolvedAttrs.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-0.5">No attributes linked</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {resolvedAttrs.map(a => (
                      <span key={a.id} className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <MeasureDependencySection measureId={measure.id} />
            </div>
          );
        }}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="Measure"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteMeasure?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
