import { useState } from 'react';
import { SemanticModelsTable } from './SemanticModelsTable';
import { GapAnalysisDashboard } from './GapAnalysisDashboard';
import { Breadcrumbs } from './Breadcrumbs';
import { TableSkeletonLoader } from './SkeletonLoader';
import { useSemanticTables, useMappingStatus } from '../hooks/useOntology';

type View = 'tables' | 'gap-analysis';

export function SemanticModelView() {
  const [activeView, setActiveView] = useState<View>('tables');

  // Fetch data
  const { data: semanticTables, isLoading: tablesLoading } = useSemanticTables();
  const { data: mappingStatus, isLoading: mappingLoading } = useMappingStatus();

  const getViewLabel = (view: View): string => {
    switch (view) {
      case 'tables': return 'Tables';
      case 'gap-analysis': return 'Gap Analysis';
      default: return '';
    }
  };

  // Transform semantic tables to match SemanticModelsTable interface
  const transformedTables = semanticTables?.map(table => ({
    ...table,
    columns_count: table.columns?.length || 0,
    measures_count: table.measures?.length || 0,
    has_relationships: false // Would need to check relationships data
  })) || [];

  const renderContent = () => {
    switch (activeView) {
      case 'tables':
        return tablesLoading ? <TableSkeletonLoader /> : <SemanticModelsTable tables={transformedTables} />;
      case 'gap-analysis':
        return mappingLoading ? <TableSkeletonLoader /> : <GapAnalysisDashboard mappingStatus={mappingStatus ? { ...mappingStatus, orphaned_attributes: mappingStatus.orphaned_observations || [], orphaned_measures: [], unmapped_columns: [] } : { orphaned_attributes: [], orphaned_measures: [], unmapped_columns: [] }} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-purple-50 to-white">
      {/* Sidebar */}
      <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-gray-200/80 flex flex-col overflow-y-auto shadow-lg">
        {/* Design Section */}
        <div className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            Design
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('tables')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'tables'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'tables' ? 'text-xl' : 'text-lg'}>🗂️</span>
                Tables
              </span>
              {semanticTables && <span className={`text-xs px-2 py-1 rounded-full ${activeView === 'tables' ? 'bg-white/20' : 'bg-gray-200'}`}>{semanticTables.length}</span>}
            </button>
            <button
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-50 cursor-not-allowed"
              disabled
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                Relationships
                <span className="ml-auto text-xs">(Soon)</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Analysis Section */}
        <div className="p-6 border-t border-gray-200/80">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" />
            Analysis
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('gap-analysis')}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                activeView === 'gap-analysis'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={activeView === 'gap-analysis' ? 'text-xl' : 'text-lg'}>📋</span>
                Gap Analysis
              </span>
              {mappingStatus && mappingStatus.orphaned_observations && mappingStatus.orphaned_observations.length > 0 && (
                <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full shadow-lg animate-pulse">
                  {mappingStatus.orphaned_observations.length}
                </span>
              )}
            </button>
            <button
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-50 cursor-not-allowed"
              disabled
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                Mapping Status
                <span className="ml-auto text-xs">(Soon)</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Info Panel */}
        <div className="mt-auto p-6 border-t border-gray-200/80 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">🎨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Semantic Model</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                BI tool implementation that maps to your business ontology.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 to-white">
        <div className="p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
          <Breadcrumbs
            items={[
              { label: 'Home', onClick: () => {} },
              { label: 'Semantic Model', onClick: () => {} },
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
