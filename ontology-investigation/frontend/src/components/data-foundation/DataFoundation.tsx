import { useDataFoundationStore } from './hooks/useDataFoundationStore';
import { useDataFoundationKeyboard } from './hooks/useDataFoundationKeyboard';
import { NavigationSidebar } from './sidebar/NavigationSidebar';
import { ViewModeToggle } from './toolbar/ViewModeToggle';
import { PerspectiveFilter } from './toolbar/PerspectiveFilter';
import { SearchBar } from './toolbar/SearchBar';
import { InspectorPanel } from './panel/InspectorPanel';
import { CommandPalette } from './overlays/CommandPalette';
import { TableView } from './views/TableView';
import { SchemaView } from './views/SchemaView';
import { LineageView } from './views/LineageView';
import { Breadcrumbs } from '../Breadcrumbs';

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

const VIEW_LABELS: Record<string, string> = {
  businessQuestions: 'Business Questions',
  metrics: 'Metrics',
  measures: 'Measures',
  attributes: 'Attributes',
  entities: 'Entities',
  systems: 'Systems',
};

export function DataFoundation(props: DataFoundationProps) {
  const activeView = useDataFoundationStore((s) => s.activeView);
  const viewMode = useDataFoundationStore((s) => s.viewMode);

  // Keyboard shortcuts
  useDataFoundationKeyboard();

  const breadcrumbLabel = viewMode === 'schema'
    ? 'Schema View'
    : viewMode === 'lineage'
      ? 'Lineage View'
      : VIEW_LABELS[activeView] ?? '';

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toolbar */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Breadcrumbs
                items={[
                  { label: 'Home', onClick: () => {} },
                  { label: 'Data Foundation', onClick: () => {} },
                  { label: breadcrumbLabel },
                ]}
              />
              {activeView !== 'businessQuestions' && <ViewModeToggle />}
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'table' && ['metrics', 'measures', 'attributes'].includes(activeView) && (
                <PerspectiveFilter />
              )}
              {(viewMode === 'schema' || viewMode === 'lineage') && (
                <PerspectiveFilter />
              )}
              <SearchBar />
            </div>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'table' && (
            <div className="h-full overflow-y-auto p-6">
              <TableView
                onEditMetric={props.onEditMetric}
                onDeleteMetric={props.onDeleteMetric}
                onNewMetric={props.onNewMetric}
                onViewLineage={props.onViewLineage}
                onEditMeasure={props.onEditMeasure}
                onDeleteMeasure={props.onDeleteMeasure}
                onNewMeasure={props.onNewMeasure}
                onViewMeasureUsage={props.onViewMeasureUsage}
                onEditAttribute={props.onEditAttribute}
                onDeleteAttribute={props.onDeleteAttribute}
                onNewAttribute={props.onNewAttribute}
                onEditEntity={props.onEditEntity}
                onDeleteEntity={props.onDeleteEntity}
                onNewEntity={props.onNewEntity}
                onEditSystem={props.onEditSystem}
                onDeleteSystem={props.onDeleteSystem}
                onNewSystem={props.onNewSystem}
              />
            </div>
          )}

          {viewMode === 'schema' && <SchemaView />}

          {viewMode === 'lineage' && <LineageView />}

          {/* Inspector Panel (slides in from right) */}
          <InspectorPanel />
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
