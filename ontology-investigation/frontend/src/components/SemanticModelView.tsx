import { useState } from 'react';
import { Layers, Table2, AlertTriangle, X, Columns, Calculator, Link2, Upload } from 'lucide-react';
import { StarSchemaView, RecommendedTablesView, useRecommendedSchema } from './semantic-model';
import { GapAnalysisDashboard } from './GapAnalysisDashboard';
import { useMappingStatus } from '../hooks/useOntology';
import type { RecommendedTable } from './semantic-model';

interface SemanticModelViewProps {
  onImportTmdl?: () => void;
}

type View = 'star-schema' | 'tables' | 'gap-analysis';

export function SemanticModelView({ onImportTmdl }: SemanticModelViewProps) {
  const [activeView, setActiveView] = useState<View>('star-schema');
  const [selectedTable, setSelectedTable] = useState<RecommendedTable | null>(null);

  const { tables, coverage } = useRecommendedSchema();
  const { data: mappingStatus, isLoading: mappingLoading } = useMappingStatus();

  const factCount = tables.filter((t) => t.tableType === 'Fact').length;
  const dimCount = tables.filter((t) => t.tableType === 'Dimension').length;

  const navItems: { id: View; label: string; icon: React.ReactNode; badge?: number | string; section: string }[] = [
    {
      id: 'star-schema',
      label: 'Star Schema',
      icon: <Layers className="w-4 h-4" />,
      badge: tables.length > 0 ? tables.length : undefined,
      section: 'Design',
    },
    {
      id: 'tables',
      label: 'Tables',
      icon: <Table2 className="w-4 h-4" />,
      badge: tables.length > 0 ? `${factCount}F / ${dimCount}D` : undefined,
      section: 'Design',
    },
    {
      id: 'gap-analysis',
      label: 'Gap Analysis',
      icon: <AlertTriangle className="w-4 h-4" />,
      section: 'Analysis',
    },
  ];

  const sections = [...new Set(navItems.map((i) => i.section))];

  const renderContent = () => {
    switch (activeView) {
      case 'star-schema':
        return <StarSchemaView onSelectTable={setSelectedTable} />;
      case 'tables':
        return <RecommendedTablesView />;
      case 'gap-analysis':
        return mappingLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>Loading gap analysis...</span>
            </div>
          </div>
        ) : (
          <GapAnalysisDashboard
            mappingStatus={
              mappingStatus
                ? {
                    ...mappingStatus,
                    orphaned_attributes: mappingStatus.orphaned_attributes || [],
                    orphaned_measures: [],
                    unmapped_columns: [],
                  }
                : { orphaned_attributes: [], orphaned_measures: [], unmapped_columns: [] }
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {sections.map((section) => (
          <div key={section} className="px-4 pt-5 pb-2">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {section}
            </h3>
            <nav className="space-y-1">
              {navItems
                .filter((i) => i.section === section)
                .map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        if (item.id !== 'star-schema') setSelectedTable(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>
          </div>
        ))}

        {/* Coverage summary */}
        {coverage.totalAttributes > 0 && (
          <div className="mt-auto px-4 py-4 border-t border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Coverage
            </h3>
            <div className="space-y-2">
              <CoverageBar
                label="Entities"
                mapped={coverage.entitiesMapped}
                total={coverage.totalEntities}
              />
              <CoverageBar
                label="Attributes"
                mapped={coverage.attributesMapped}
                total={coverage.totalAttributes}
              />
              <CoverageBar
                label="Measures"
                mapped={coverage.measuresMapped}
                total={coverage.totalMeasures}
              />
            </div>
          </div>
        )}

        {/* Import button */}
        {onImportTmdl && (
          <div className="px-4 py-4 border-t border-gray-100">
            <button
              onClick={onImportTmdl}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
            >
              <Upload className="w-4 h-4" />
              Import from Power BI
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-hidden ${activeView === 'star-schema' ? '' : 'overflow-y-auto'}`}>
          {renderContent()}
        </div>

        {/* Table detail panel (star schema only) */}
        {activeView === 'star-schema' && selectedTable && (
          <TableDetailPanel table={selectedTable} tables={tables} onClose={() => setSelectedTable(null)} />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function CoverageBar({ label, mapped, total }: { label: string; mapped: number; total: number }) {
  const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">
          {mapped}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TableDetailPanel({
  table,
  tables,
  onClose,
}: {
  table: RecommendedTable;
  tables: RecommendedTable[];
  onClose: () => void;
}) {
  const isFact = table.tableType === 'Fact';

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            isFact ? 'bg-blue-500' : 'bg-purple-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-mono font-bold text-gray-900 truncate">{table.name}</h3>
          <p className="text-xs text-gray-400">{table.tableType} Table</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Source entity */}
        {table.sourceEntityName && (
          <div className="text-xs text-gray-500">
            Source: <span className="font-medium text-gray-700">{table.sourceEntityName}</span>
          </div>
        )}

        {/* Columns */}
        {table.columns.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Columns className="w-3 h-3" /> Columns ({table.columns.length})
            </h4>
            <div className="space-y-1">
              {table.columns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-gray-50"
                >
                  <span className="font-mono text-gray-800 flex-1 truncate">{col.name}</span>
                  {col.dataType && (
                    <span className="text-gray-400 font-mono text-[10px]">{col.dataType}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DAX Measures */}
        {table.measures.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calculator className="w-3 h-3" /> Measures ({table.measures.length})
            </h4>
            <div className="space-y-1">
              {table.measures.map((m) => (
                <div key={m.id} className="px-2 py-1.5 rounded bg-gray-50">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-800 flex-1 truncate">{m.name}</span>
                    {m.metricIds.length > 0 && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {m.metricIds.length} metric{m.metricIds.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {m.formula && (
                    <div className="text-[10px] font-mono text-gray-500 mt-1 truncate">
                      = {m.formula}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Dimensions */}
        {table.relatedDimensionIds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Relationships ({table.relatedDimensionIds.length})
            </h4>
            <div className="space-y-1">
              {table.relatedDimensionIds.map((dimId) => {
                const dim = tables.find((t) => t.id === dimId);
                return (
                  <div
                    key={dimId}
                    className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-purple-50 text-purple-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="font-mono truncate">{dim?.name || dimId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
