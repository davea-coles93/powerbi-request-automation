import { useState, useMemo, useEffect } from 'react';
import { MetricsTable } from './MetricsTable';
import { MeasuresTable } from './MeasuresTable';
import { AttributesTable } from './AttributesTable';
import { EntitiesTable } from './EntitiesTable';
import { SystemsTable } from './SystemsTable';
import { OntologyERD } from './OntologyERD';
import { FullGraphView } from './FullGraphView';
import { TopDownWorkshop } from './workshop/TopDownWorkshop';
import { Breadcrumbs } from './Breadcrumbs';
import { TableSkeletonLoader } from './SkeletonLoader';
import { useMetrics, useMeasures, useAttributes, useEntities, useSystems, useWorkshopSessions, useCreateWorkshopSession } from '../hooks/useOntology';
import type { WorkshopSession } from '../types/ontology';

type View = 'businessQuestions' | 'metrics' | 'measures' | 'attributes' | 'entities' | 'systems';

interface DataFoundationProps {
  onEditMetric?: (metric: any) => void;
  onDeleteMetric?: (metric: any) => void;
  onNewMetric?: () => void;
  onViewLineage?: (metricId: string) => void;
  onEditMeasure?: (measure: any) => void;
  onDeleteMeasure?: (measure: any) => void;
  onNewMeasure?: () => void;
  onViewMeasureUsage?: (measure: any) => void;
  onEditAttribute?: (attribute: any) => void;
  onDeleteAttribute?: (attribute: any) => void;
  onNewAttribute?: () => void;
  onEditEntity?: (entity: any) => void;
  onDeleteEntity?: (entity: any) => void;
  onNewEntity?: () => void;
  onEditSystem?: (system: any) => void;
  onDeleteSystem?: (system: any) => void;
  onNewSystem?: () => void;
}

export function DataFoundation({
  onEditMetric,
  onDeleteMetric,
  onNewMetric,
  onViewLineage,
  onEditMeasure,
  onDeleteMeasure,
  onNewMeasure,
  onViewMeasureUsage,
  onEditAttribute,
  onDeleteAttribute,
  onNewAttribute,
  onEditEntity,
  onDeleteEntity,
  onNewEntity,
  onEditSystem,
  onDeleteSystem,
  onNewSystem,
}: DataFoundationProps) {
  const [activeView, setActiveView] = useState<View>('metrics');
  const [viewMode, setViewMode] = useState<'table' | 'schema' | 'lineage'>('table');
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [topDownSessionId, setTopDownSessionId] = useState<string | null>(null);

  // Fetch data
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: measures, isLoading: measuresLoading } = useMeasures();
  const { data: attributes, isLoading: attributesLoading } = useAttributes();
  const { data: entities, isLoading: entitiesLoading } = useEntities();
  const { data: systems, isLoading: systemsLoading } = useSystems();

  // Workshop session management for Business Questions
  const { data: allSessions } = useWorkshopSessions();
  const createSession = useCreateWorkshopSession();

  // Auto-select or track top-down session for business questions
  useEffect(() => {
    if (!allSessions || topDownSessionId) return;
    const existing = allSessions.find((s) => s.session_type === 'top_down');
    if (existing) setTopDownSessionId(existing.id);
  }, [allSessions, topDownSessionId]);

  const topDownSession = allSessions?.find((s) => s.id === topDownSessionId) ?? null;

  const handleCreateTopDownSession = async () => {
    const result = await createSession.mutateAsync({
      name: 'Business Questions',
      date: new Date().toISOString().split('T')[0],
      participants: [],
      session_type: 'top_down',
    } as any);
    setTopDownSessionId(result.id);
  };

  const handleTopDownSessionUpdate = (_updated: WorkshopSession) => {
    // Session update is handled by the TopDownWorkshop component's auto-save
  };

  // Filter data by perspective (client-side)
  const filteredMetrics = useMemo(() => {
    if (!perspectiveFilter || !metrics) return metrics || [];
    return metrics.filter((m: any) => m.perspective_ids?.includes(perspectiveFilter));
  }, [metrics, perspectiveFilter]);

  const filteredMeasures = useMemo(() => {
    if (!perspectiveFilter || !measures) return measures || [];
    return measures.filter((m: any) => m.perspective_ids?.includes(perspectiveFilter));
  }, [measures, perspectiveFilter]);

  const filteredAttributes = useMemo(() => {
    if (!perspectiveFilter || !attributes) return attributes || [];
    return attributes.filter((a: any) => a.perspective_ids?.includes(perspectiveFilter));
  }, [attributes, perspectiveFilter]);

  const getViewLabel = (view: View): string => {
    switch (view) {
      case 'businessQuestions': return 'Business Questions';
      case 'metrics': return 'Metrics';
      case 'measures': return 'Measures';
      case 'attributes': return 'Attributes';
      case 'entities': return 'Entities';
      case 'systems': return 'Systems';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'metrics':
        return metricsLoading ? <TableSkeletonLoader /> : (
          <MetricsTable
            metrics={filteredMetrics}
            measures={measures || []}
            onEditMetric={onEditMetric}
            onDeleteMetric={onDeleteMetric}
            onNewMetric={onNewMetric}
            onViewLineage={onViewLineage}
          />
        );
      case 'measures':
        return measuresLoading ? <TableSkeletonLoader /> : (
          <MeasuresTable
            measures={filteredMeasures}
            attributes={attributes || []}
            onMeasureClick={onEditMeasure}
            onDeleteMeasure={onDeleteMeasure}
            onNewMeasure={onNewMeasure}
            onViewUsage={onViewMeasureUsage}
          />
        );
      case 'attributes':
        return attributesLoading ? <TableSkeletonLoader /> : (
          <AttributesTable
            attributes={filteredAttributes}
            systems={systems || []}
            entities={entities || []}
            measures={measures || []}
            metrics={metrics || []}
            onAttributeClick={onEditAttribute}
            onDeleteAttribute={onDeleteAttribute}
            onNewAttribute={onNewAttribute}
          />
        );
      case 'entities':
        return entitiesLoading ? <TableSkeletonLoader /> : (
          <EntitiesTable
            entities={entities || []}
            onEditEntity={onEditEntity}
            onDeleteEntity={onDeleteEntity}
            onNewEntity={onNewEntity}
          />
        );
      case 'systems':
        return systemsLoading ? <TableSkeletonLoader /> : (
          <SystemsTable
            systems={systems || []}
            onEditSystem={onEditSystem}
            onDeleteSystem={onDeleteSystem}
            onNewSystem={onNewSystem}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Sidebar */}
      <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-gray-200/80 flex flex-col overflow-y-auto shadow-lg">
        {/* Business Questions Section */}
        <div className="p-6 pb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            Demand Signal
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => { setActiveView('businessQuestions'); setViewMode('table'); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'businessQuestions'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'businessQuestions' ? 'text-xl' : 'text-lg'}>🎯</span>
                Business Questions
              </span>
              {topDownSession?.top_down_data?.metrics && (
                <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'businessQuestions' ? 'bg-white/20' : 'bg-gray-200'}`}>
                  {topDownSession.top_down_data.metrics.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Insights Section */}
        <div className="p-6 pt-3 border-t border-gray-200/80">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
            Insights
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('metrics')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'metrics'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'metrics' ? 'text-xl' : 'text-lg'}>📊</span>
                Metrics
              </span>
              {metrics && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'metrics' ? 'bg-white/20' : 'bg-gray-200'}`}>{metrics.length}</span>}
            </button>
            <button
              onClick={() => setActiveView('measures')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'measures'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'measures' ? 'text-xl' : 'text-lg'}>🧮</span>
                Measures
              </span>
              {measures && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'measures' ? 'bg-white/20' : 'bg-gray-200'}`}>{measures.length}</span>}
            </button>
          </nav>
        </div>

        {/* Sources Section */}
        <div className="p-6 border-t border-gray-200/80">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
            Sources
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('attributes')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'attributes'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'attributes' ? 'text-xl' : 'text-lg'}>🔷</span>
                Attributes
              </span>
              {attributes && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'attributes' ? 'bg-white/20' : 'bg-gray-200'}`}>{attributes.length}</span>}
            </button>
            <button
              onClick={() => setActiveView('entities')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'entities'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'entities' ? 'text-xl' : 'text-lg'}>🏢</span>
                Entities
              </span>
              {entities && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'entities' ? 'bg-white/20' : 'bg-gray-200'}`}>{entities.length}</span>}
            </button>
            <button
              onClick={() => setActiveView('systems')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'systems'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'systems' ? 'text-xl' : 'text-lg'}>💻</span>
                Systems
              </span>
              {systems && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'systems' ? 'bg-white/20' : 'bg-gray-200'}`}>{systems.length}</span>}
            </button>
          </nav>
        </div>

        {/* Info Panel */}
        <div className="mt-auto p-6 border-t border-gray-200/80 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">💎</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Data Foundation</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tool-agnostic business ontology that represents your core semantics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
        <div className="p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Breadcrumbs
                items={[
                  { label: 'Home', onClick: () => {} },
                  { label: 'Data Foundation', onClick: () => {} },
                  { label: viewMode === 'schema' ? 'Schema View' : getViewLabel(activeView) },
                ]}
              />
              {/* View mode toggle */}
              {activeView !== 'businessQuestions' && (
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('schema')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'schema'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Schema View
                  </button>
                  <button
                    onClick={() => setViewMode('lineage')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'lineage'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Lineage View
                  </button>
                </div>
              )}
            </div>
            {viewMode === 'table' && ['metrics', 'measures', 'attributes'].includes(activeView) && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">Filter:</span>
                <button
                  onClick={() => setPerspectiveFilter(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    perspectiveFilter === null
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPerspectiveFilter('operational')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    perspectiveFilter === 'operational'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  Operational
                </button>
                <button
                  onClick={() => setPerspectiveFilter('management')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    perspectiveFilter === 'management'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  Management
                </button>
                <button
                  onClick={() => setPerspectiveFilter('financial')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    perspectiveFilter === 'financial'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Financial
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {activeView === 'businessQuestions' ? (
            topDownSession ? (
              <TopDownWorkshop
                session={topDownSession}
                onSessionUpdate={handleTopDownSessionUpdate}
              />
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Capture Business Questions</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Start your top-down analysis by capturing the business questions your stakeholders need answered.
                  Each question traces to metrics, measures, and the data attributes needed to calculate them.
                </p>
                <button
                  onClick={handleCreateTopDownSession}
                  disabled={createSession.isPending}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {createSession.isPending ? 'Setting up...' : 'Start Capturing Business Questions'}
                </button>
              </div>
            )
          ) : viewMode === 'lineage' ? (
            <FullGraphView perspective="financial" />
          ) : viewMode === 'schema' ? (
            <OntologyERD
              entities={entities || []}
              attributes={attributes || []}
              measures={measures || []}
              metrics={metrics || []}
              systems={systems || []}
            />
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
