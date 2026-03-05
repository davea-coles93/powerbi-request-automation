import { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Columns, Calculator, Link2, AlertTriangle } from 'lucide-react';
import { useRecommendedSchema, type RecommendedTable } from '../hooks/useRecommendedSchema';

export function RecommendedTablesView() {
  const { tables, relationships, coverage, isLoading } = useRecommendedSchema();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Generating recommended tables...</span>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Database className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">No Tables to Recommend</h3>
        <p className="text-gray-500 text-sm">
          Add entities and attributes in the Data Foundation to see recommended Power BI tables.
        </p>
      </div>
    );
  }

  const factTables = tables.filter((t) => t.tableType === 'Fact');
  const dimTables = tables.filter((t) => t.tableType === 'Dimension');

  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Coverage stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Fact Tables" value={factTables.length} color="blue" icon="⚡" />
        <StatCard label="Dimensions" value={dimTables.length} color="purple" icon="📊" />
        <StatCard label="Relationships" value={relationships.length} color="indigo" icon="🔗" />
        <StatCard
          label="Attribute Coverage"
          value={`${pct(coverage.attributesMapped, coverage.totalAttributes)}%`}
          color="green"
          icon="✓"
          subtitle={`${coverage.attributesMapped} of ${coverage.totalAttributes}`}
        />
      </div>

      {/* Fact tables section */}
      {factTables.length > 0 && (
        <TableSection
          title="Fact Tables"
          subtitle="Contain measures and foreign keys to dimensions"
          icon={<span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />}
          tables={factTables}
          allTables={tables}
          expandedId={expandedId}
          onToggle={setExpandedId}
        />
      )}

      {/* Dimension tables section */}
      {dimTables.length > 0 && (
        <TableSection
          title="Dimension Tables"
          subtitle="One per entity — attributes become columns"
          icon={<span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />}
          tables={dimTables}
          allTables={tables}
          expandedId={expandedId}
          onToggle={setExpandedId}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function StatCard({ label, value, color, subtitle }: {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-lg p-4 ${cls.split(' ')[0]}`}>
      <div className={`text-sm font-medium ${cls.split(' ')[1]}`}>{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
    </div>
  );
}

function TableSection({ title, subtitle, icon, tables, allTables, expandedId, onToggle }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tables: RecommendedTable[];
  allTables: RecommendedTable[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400 ml-1">— {subtitle}</span>
      </div>
      <div className="space-y-2">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            allTables={allTables}
            isExpanded={expandedId === table.id}
            onToggle={() => onToggle(expandedId === table.id ? null : table.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TableCard({ table, allTables, isExpanded, onToggle }: {
  table: RecommendedTable;
  allTables: RecommendedTable[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isFact = table.tableType === 'Fact';
  const isOrphan = isFact && table.relatedDimensionIds.length === 0;
  const borderColor = isOrphan ? 'border-amber-200' : isFact ? 'border-blue-200' : 'border-purple-200';
  const bgColor = isOrphan ? 'bg-amber-50/50' : 'bg-white';

  return (
    <div className={`border ${borderColor} rounded-lg ${bgColor} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        {isExpanded
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }

        <span className="text-sm font-mono font-semibold text-gray-900 flex-1">
          {table.name}
        </span>

        {isOrphan && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Needs input attributes
          </span>
        )}

        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isFact ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {table.tableType}
        </span>

        {table.columns.length > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Columns className="w-3 h-3" />
            {table.columns.length}
          </span>
        )}
        {table.measures.length > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calculator className="w-3 h-3" />
            {table.measures.length}
          </span>
        )}
        {table.relatedDimensionIds.length > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {table.relatedDimensionIds.length}
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4 bg-white/80">
          {/* Source entity */}
          {table.sourceEntityName && (
            <div className="text-xs text-gray-500">
              Source entity: <span className="font-medium text-gray-700">{table.sourceEntityName}</span>
            </div>
          )}

          {/* Columns */}
          {table.columns.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Columns className="w-3 h-3" /> Columns ({table.columns.length})
              </h4>
              <div className="grid gap-1">
                {table.columns.map((col) => (
                  <div key={col.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-gray-50">
                    <span className="font-mono text-gray-800 flex-1">{col.name}</span>
                    {col.dataType && (
                      <span className="text-xs text-gray-400 font-mono">{col.dataType}</span>
                    )}
                    {col.sourceTable && col.sourceColumn && (
                      <span className="text-xs text-gray-400">
                        {col.sourceTable}.{col.sourceColumn}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAX Measures */}
          {table.measures.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calculator className="w-3 h-3" /> DAX Measures ({table.measures.length})
              </h4>
              <div className="grid gap-1">
                {table.measures.map((m) => (
                  <div key={m.id} className="px-2 py-1.5 rounded bg-gray-50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-800 flex-1">{m.name}</span>
                      {m.metricIds.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {m.metricIds.length} metric{m.metricIds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {m.formula && (
                      <div className="text-xs font-mono text-gray-500 mt-1 truncate">
                        = {m.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related dimensions */}
          {table.relatedDimensionIds.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Relationships ({table.relatedDimensionIds.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {table.relatedDimensionIds.map((dimId) => {
                  const dim = allTables.find((t) => t.id === dimId);
                  return (
                    <span
                      key={dimId}
                      className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200"
                    >
                      → {dim?.name || dimId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
