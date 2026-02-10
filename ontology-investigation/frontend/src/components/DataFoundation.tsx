import { useState } from 'react';
import { MetricsTable } from './MetricsTable';
import { MeasuresTable } from './MeasuresTable';
import { AttributesTable } from './AttributesTable';
import { EntitiesTable } from './EntitiesTable';
import { SystemsTable } from './SystemsTable';
import { Breadcrumbs } from './Breadcrumbs';
import { TableSkeletonLoader } from './SkeletonLoader';
import { useMetrics, useMeasures, useAttributes, useEntities, useSystems } from '../hooks/useOntology';

type View = 'metrics' | 'measures' | 'attributes' | 'entities' | 'systems';

export function DataFoundation() {
  const [activeView, setActiveView] = useState<View>('metrics');

  // Fetch data
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: measures, isLoading: measuresLoading } = useMeasures();
  const { data: attributes, isLoading: attributesLoading } = useAttributes();
  const { data: entities, isLoading: entitiesLoading } = useEntities();
  const { data: systems, isLoading: systemsLoading } = useSystems();

  const getViewLabel = (view: View): string => {
    switch (view) {
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
        return metricsLoading ? <TableSkeletonLoader /> : <MetricsTable metrics={metrics || []} />;
      case 'measures':
        return measuresLoading ? <TableSkeletonLoader /> : <MeasuresTable measures={measures || []} />;
      case 'attributes':
        return attributesLoading ? <TableSkeletonLoader /> : <AttributesTable attributes={attributes || []} />;
      case 'entities':
        return entitiesLoading ? <TableSkeletonLoader /> : <EntitiesTable entities={entities || []} />;
      case 'systems':
        return systemsLoading ? <TableSkeletonLoader /> : <SystemsTable systems={systems || []} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Sidebar */}
      <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-gray-200/80 flex flex-col overflow-y-auto shadow-lg">
        {/* Insights Section */}
        <div className="p-6">
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
          <Breadcrumbs
            items={[
              { label: 'Home', onClick: () => {} },
              { label: 'Data Foundation', onClick: () => {} },
              { label: getViewLabel(activeView) },
            ]}
          />
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
