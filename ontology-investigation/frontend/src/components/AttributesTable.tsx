import { useMemo, useState } from 'react';
import { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { PerspectiveBadges } from './cells/PerspectiveBadges';
import { ReliabilityBadge } from './cells/ReliabilityBadge';
import { VolatilityBadge } from './cells/VolatilityBadge';
import { Database, AlertTriangle, Trash2 } from 'lucide-react';
import { useImpactAnalysis } from '../hooks/useOntology';

interface Attribute {
  id: string;
  name: string;
  description?: string;
  system_id: string;
  entity_id: string;
  reliability?: 'High' | 'Medium' | 'Low';
  volatility?: 'Point-in-time' | 'Accumulating' | 'Continuous';
  perspective_ids?: string[];
  source_table?: string;
  source_column?: string;
  source_connection?: string;
  constraints?: Array<{
    type: 'range' | 'required' | 'format';
    min?: number;
    max?: number;
    pattern?: string;
    unit?: string;
    description: string;
  }>;
}

interface LookupItem {
  id: string;
  name: string;
}

interface MeasureLookup {
  id: string;
  name: string;
  input_attribute_ids: string[];
}

interface MetricLookup {
  id: string;
  name: string;
  calculated_by_measure_ids: string[];
}

interface AttributesTableProps {
  attributes: Attribute[];
  systems?: LookupItem[];
  entities?: LookupItem[];
  measures?: MeasureLookup[];
  metrics?: MetricLookup[];
  onAttributeClick?: (attribute: Attribute) => void;
  onDeleteAttribute?: (attribute: Attribute) => void;
  onNewAttribute?: () => void;
  onMapAttribute?: (attribute: Attribute) => void;
  onShowImpact?: (attribute: Attribute) => void;
}

function AttributeImpactSection({ attributeId }: { attributeId: string }) {
  const { data, isLoading, error } = useImpactAnalysis(attributeId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
        <span className="text-sm text-gray-500">Analyzing impact...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { affected_measures, affected_metrics } = data;

  if (affected_measures.length === 0 && affected_metrics.length === 0) {
    return (
      <div>
        <span className="text-xs font-semibold text-gray-500 uppercase">Impact Analysis</span>
        <p className="text-sm text-gray-400 mt-0.5">No downstream dependencies found</p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
        Impact Analysis
      </span>
      <p className="text-sm text-gray-700 mt-0.5">
        If this attribute has issues, <strong>{affected_measures.length} measure{affected_measures.length !== 1 ? 's' : ''}</strong> and <strong>{affected_metrics.length} metric{affected_metrics.length !== 1 ? 's' : ''}</strong> are at risk
      </p>
      {affected_measures.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {affected_measures.map((m: any) => (
            <span key={m.id} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
              {m.name}
            </span>
          ))}
        </div>
      )}
      {affected_metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {affected_metrics.map((mt: any) => (
            <span
              key={mt.id}
              className="inline-flex items-center px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium"
              title={mt.business_question || undefined}
            >
              {mt.name}
              {mt.business_question && (
                <span className="ml-1 text-[10px] text-orange-500 truncate max-w-[150px]">
                  - {mt.business_question}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttributesTable({
  attributes,
  systems = [],
  entities = [],
  measures = [],
  metrics = [],
  onAttributeClick,
  onDeleteAttribute,
  onNewAttribute,
  onMapAttribute,
  onShowImpact,
}: AttributesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);
  const systemMap = useMemo(() => new Map(systems.map(s => [s.id, s.name])), [systems]);
  const entityMap = useMemo(() => new Map(entities.map(e => [e.id, e.name])), [entities]);
  const columns = useMemo<ColumnDef<Attribute>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Attribute Name',
        cell: (info) => {
          const attr = info.row.original;
          const constraintCount = attr.constraints?.length ?? 0;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{info.getValue() as string}</span>
              {constraintCount > 0 && (
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold leading-none"
                  title={`${constraintCount} business rule${constraintCount !== 1 ? 's' : ''}`}
                >
                  {constraintCount} rule{constraintCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'system_id',
        header: 'Source System',
        cell: (info) => {
          const id = info.getValue() as string;
          const name = systemMap.get(id);
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded">
                {name || id}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'entity_id',
        header: 'Entity',
        cell: (info) => {
          const id = info.getValue() as string;
          const name = entityMap.get(id);
          return (
            <div className="text-sm text-gray-600">{name || id}</div>
          );
        },
      },
      {
        accessorKey: 'reliability',
        header: 'Reliability',
        cell: (info) => <ReliabilityBadge reliability={info.getValue() as string | undefined} />,
      },
      {
        accessorKey: 'volatility',
        header: 'Volatility',
        cell: (info) => <VolatilityBadge volatility={info.getValue() as string | undefined} />,
      },
      {
        id: 'perspectives',
        header: 'Perspectives',
        cell: (info) => (
          <PerspectiveBadges
            perspectiveIds={info.row.original.perspective_ids || []}
            maxVisible={2}
            abbreviated
          />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttributeClick?.(info.row.original);
              }}
              className="px-3 py-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMapAttribute?.(info.row.original);
              }}
              className="px-3 py-1 text-purple-600 hover:bg-purple-100 hover:text-purple-800 rounded text-sm font-medium transition-colors"
            >
              Map
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowImpact?.(info.row.original);
              }}
              className="px-3 py-1 text-orange-600 hover:bg-orange-100 hover:text-orange-800 rounded text-sm font-medium transition-colors"
            >
              Impact
            </button>
            {onDeleteAttribute && (
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
    [onAttributeClick, onMapAttribute, onShowImpact, onDeleteAttribute, systemMap, entityMap]
  );

  if (attributes.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attributes</h2>
            <p className="text-gray-600 mt-1">
              Data attributes captured in source systems
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Database className="w-full h-full" />}
          title="No Attributes Yet"
          description="Attributes are raw data points captured about entities in your source systems. They form the foundation of your measures and metrics. Examples: Production Confirmation, Inventory Count, Customer Order."
          actionLabel="+ Create First Attribute"
          onAction={onNewAttribute}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attributes</h2>
          <p className="text-gray-600 mt-1">
            Data attributes captured in source systems
          </p>
        </div>
        <button
          onClick={onNewAttribute}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Attribute
        </button>
      </div>

      <DataTable
        data={attributes}
        columns={columns}
        searchPlaceholder="Search attributes..."
        onRowClick={onAttributeClick}
        renderSubComponent={({ row }: { row: Row<Attribute> }) => {
          const attr = row.original;
          const usedByMeasures = measures.filter(m => m.input_attribute_ids.includes(attr.id));
          const feedingMetricIds = new Set(
            usedByMeasures.flatMap(m =>
              metrics.filter(mt => mt.calculated_by_measure_ids.includes(m.id)).map(mt => mt.id)
            )
          );
          const feedingMetrics = metrics.filter(mt => feedingMetricIds.has(mt.id));
          const hasSourceBinding = attr.source_table || attr.source_column;
          const constraints = attr.constraints ?? [];
          return (
            <div className="space-y-3">
              {attr.description && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                  <p className="text-sm text-gray-700 mt-0.5">{attr.description}</p>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Source System</span>
                  <p className="text-sm text-gray-700 mt-0.5">{systemMap.get(attr.system_id) || attr.system_id}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Entity</span>
                  <p className="text-sm text-gray-700 mt-0.5">{entityMap.get(attr.entity_id) || attr.entity_id}</p>
                </div>
                {attr.volatility && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Volatility</span>
                    <div className="mt-0.5"><VolatilityBadge volatility={attr.volatility} /></div>
                  </div>
                )}
              </div>

              {hasSourceBinding && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Source Binding</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-mono">
                      {[attr.source_table, attr.source_column].filter(Boolean).join('.')}
                    </span>
                    {attr.source_connection && (
                      <span className="text-xs text-gray-500">
                        via {attr.source_connection}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {constraints.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Business Rules ({constraints.length})
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {constraints.map((c, i) => (
                      <div
                        key={i}
                        className="inline-flex flex-col px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-amber-800 uppercase text-[10px]">
                            {c.type}
                          </span>
                          {c.type === 'range' && (
                            <span className="text-amber-700 font-mono">
                              {c.min != null ? c.min : '*'} - {c.max != null ? c.max : '*'}
                              {c.unit ? ` ${c.unit}` : ''}
                            </span>
                          )}
                          {c.type === 'format' && c.pattern && (
                            <span className="text-amber-700 font-mono">{c.pattern}</span>
                          )}
                        </div>
                        {c.description && (
                          <span className="text-amber-700">{c.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Used by {usedByMeasures.length} measure{usedByMeasures.length !== 1 ? 's' : ''}
                  {feedingMetrics.length > 0 && `, feeding ${feedingMetrics.length} metric${feedingMetrics.length !== 1 ? 's' : ''}`}
                </span>
                {usedByMeasures.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {usedByMeasures.map(m => (
                      <span key={m.id} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}
                {feedingMetrics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {feedingMetrics.map(mt => (
                      <span key={mt.id} className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                        {mt.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <AttributeImpactSection attributeId={attr.id} />
            </div>
          );
        }}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType="Attribute"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteAttribute?.(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
