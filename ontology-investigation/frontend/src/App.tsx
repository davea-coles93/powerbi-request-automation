import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { DataFoundation } from './components/data-foundation';
import { SemanticModelView } from './components/SemanticModelView';
import { MetricDetail } from './components/MetricDetail';
import { ProcessCanvas } from './components/process-canvas';
import { ScenarioSelector } from './components/ScenarioSelector';
import { EntityEditorModal } from './components/EntityEditorModal';
import { SystemEditorModal } from './components/SystemEditorModal';
import { AttributeEditorModal } from './components/AttributeEditorModal';
import { MeasureEditorModal } from './components/MeasureEditorModal';
import { MeasureUsageModal } from './components/MeasureUsageModal';
import { MetricEditorModal } from './components/MetricEditorModal';
import { PerspectiveEditorModal } from './components/PerspectiveEditorModal';
import { OntologyCommandBar } from './components/OntologyCommandBar';
import { TmdlImportModal } from './components/TmdlImportModal';
import { GapsView } from './components/gaps';
import {
  usePerspectives,
  useProcesses,
  useMeasures,
  useAttributes,
  useEntities,
  useSystems,
  useMetrics,
  useMappingStatus
} from './hooks/useOntology';
import { useAppModals } from './hooks/useAppModals';
import { Table, Database, Edit3, Upload, AlertTriangle, FileSpreadsheet, Plus } from 'lucide-react';
import { ExcelImportPanel } from './components/ExcelImportPanel';

type ViewMode = 'processBuilder' | 'dataFoundation' | 'gaps' | 'semanticModel';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('dataFoundation');

  const { data: perspectives } = usePerspectives();
  const { data: processes } = useProcesses();
  const { data: measures } = useMeasures();
  const { data: metricsData } = useMetrics();
  const { data: attributes } = useAttributes();
  const { data: entities } = useEntities();
  const { data: systems } = useSystems();
  useMappingStatus();

  const modals = useAppModals();

  const perspectiveDotColors: Record<string, string> = {
    operational: 'bg-emerald-500',
    management: 'bg-amber-500',
    financial: 'bg-blue-500',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-3 flex items-center gap-6">
          {/* Title */}
          <div className="mr-auto">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Business Ontology Framework
            </h1>
          </div>

          {/* Perspective pills */}
          <div className="flex items-center gap-1">
            {perspectives?.map((p) => {
              const dotColor = perspectiveDotColors[p.id] || 'bg-gray-400';
              return (
                <div key={p.id} className="relative group">
                  <button
                    onClick={() => modals.openPerspectiveEditor(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    title={p.primary_concern}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                    <span className="font-medium">{p.name}</span>
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => modals.openPerspectiveEditor()}
              className="p-1 rounded-md text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Add perspective"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Actions */}
          <OntologyCommandBar
            metrics={metricsData?.map(m => ({ id: m.id, name: m.name })) || []}
            attributes={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
            measures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
            processSteps={processes?.flatMap(p => p.steps.map(s => ({ id: s.id, name: s.name }))) || []}
          />
          <button
            onClick={modals.openExcelImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Spreadsheet
          </button>
          <button
            onClick={modals.openTmdlImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Power BI
          </button>
          <ScenarioSelector />
        </div>
      </header>

      {/* View Mode Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { key: 'processBuilder', label: 'Process Builder', icon: Edit3 },
            { key: 'dataFoundation', label: 'Data Foundation', icon: Database },
            { key: 'gaps', label: 'Gaps', icon: AlertTriangle },
            { key: 'semanticModel', label: 'Semantic Model', icon: Table },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap text-sm ${
                viewMode === key
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-gray-50 h-[calc(100vh-100px)]">
        {viewMode === 'processBuilder' && (
          <div className="h-full"><ProcessCanvas /></div>
        )}

        {viewMode === 'dataFoundation' && (
          <div className="h-full bg-white">
            <DataFoundation
              onEditMetric={(m) => modals.openMetricEditor(m)}
              onDeleteMetric={modals.handleDeleteMetric}
              onNewMetric={() => modals.openMetricEditor()}
              onViewLineage={modals.openMetricDetail}
              onEditMeasure={(m) => modals.openMeasureEditor(m)}
              onDeleteMeasure={modals.handleDeleteMeasure}
              onNewMeasure={() => modals.openMeasureEditor()}
              onViewMeasureUsage={modals.openMeasureUsage}
              onEditAttribute={(a) => modals.openAttributeEditor(a)}
              onDeleteAttribute={modals.handleDeleteAttribute}
              onNewAttribute={() => modals.openAttributeEditor()}
              onEditEntity={(e) => modals.openEntityEditor(e)}
              onDeleteEntity={modals.handleDeleteEntity}
              onNewEntity={() => modals.openEntityEditor()}
              onEditSystem={(s) => modals.openSystemEditor(s)}
              onDeleteSystem={modals.handleDeleteSystem}
              onNewSystem={() => modals.openSystemEditor()}
            />
          </div>
        )}

        {viewMode === 'gaps' && (
          <div className="h-full bg-white"><GapsView /></div>
        )}

        {viewMode === 'semanticModel' && (
          <div className="h-full bg-white"><SemanticModelView onImportTmdl={modals.openTmdlImport} /></div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────── */}

      {modals.metricDetail.metricId && (
        <MetricDetail
          metricId={modals.metricDetail.metricId}
          onClose={modals.metricDetail.onClose}
        />
      )}

      <EntityEditorModal
        isOpen={modals.entityEditor.isOpen}
        onClose={modals.entityEditor.onClose}
        entity={modals.entityEditor.selected}
        onSave={modals.entityEditor.onSave}
      />

      <SystemEditorModal
        isOpen={modals.systemEditor.isOpen}
        onClose={modals.systemEditor.onClose}
        system={modals.systemEditor.selected}
        onSave={modals.systemEditor.onSave}
      />

      <AttributeEditorModal
        isOpen={modals.attributeEditor.isOpen}
        onClose={modals.attributeEditor.onClose}
        attribute={modals.attributeEditor.selected}
        onSave={modals.attributeEditor.onSave}
        availableEntities={entities?.map(e => ({ id: e.id, name: e.name })) || []}
        availableSystems={systems?.map(s => ({ id: s.id, name: s.name })) || []}
        onCreateEntity={modals.handleInlineCreateEntity}
        onCreateSystem={modals.handleInlineCreateSystem}
      />

      <MeasureEditorModal
        isOpen={modals.measureEditor.isOpen}
        onClose={modals.measureEditor.onClose}
        measure={modals.measureEditor.selected}
        onSave={modals.measureEditor.onSave}
        availableAttributes={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
      />

      <MeasureUsageModal
        isOpen={modals.measureUsage.isOpen}
        onClose={modals.measureUsage.onClose}
        usageData={modals.measureUsage.data}
      />

      <MetricEditorModal
        isOpen={modals.metricEditor.isOpen}
        onClose={modals.metricEditor.onClose}
        metric={modals.metricEditor.selected}
        onSave={modals.metricEditor.onSave}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
      />

      <PerspectiveEditorModal
        isOpen={modals.perspectiveEditor.isOpen}
        onClose={modals.perspectiveEditor.onClose}
        perspective={modals.perspectiveEditor.selected}
        onSave={modals.perspectiveEditor.onSave}
        existingPerspectiveIds={perspectives?.map(p => p.id) || []}
      />

      <TmdlImportModal
        isOpen={modals.tmdlImport.isOpen}
        onClose={modals.tmdlImport.onClose}
      />

      {modals.excelImport.isOpen && (
        <ExcelImportPanel
          onClose={modals.excelImport.onClose}
          onImported={modals.excelImport.onImported}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}

export default App;
