import { useState, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LineageView } from './components/lineage';
import { AttributeLibrary } from './components/attribute-library';
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
import { useNavigationStore } from './hooks/useNavigationStore';
import { Table, Database, GitBranch, Upload, AlertTriangle, Plus, Sparkles, ArrowLeft, ChevronDown, BarChart3, Calculator, Columns3, Box, Monitor, Compass } from 'lucide-react';
import { ExcelImportPanel } from './components/ExcelImportPanel';
import { WorkshopAIPanel } from './components/workshop-ai/WorkshopAIPanel';
import { GuidedDiscoveryPanel } from './components/guided-discovery/GuidedDiscoveryPanel';
import { IngestionPanel } from './components/ingestion/IngestionPanel';

function CreateMenu({ modals }: { modals: ReturnType<typeof useAppModals> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    { label: 'New Metric', icon: BarChart3, action: () => modals.openMetricEditor() },
    { label: 'New Measure', icon: Calculator, action: () => modals.openMeasureEditor() },
    { label: 'New Attribute', icon: Columns3, action: () => modals.openAttributeEditor() },
    { label: 'New Entity', icon: Box, action: () => modals.openEntityEditor() },
    { label: 'New System', icon: Monitor, action: () => modals.openSystemEditor() },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const { activeTab, setActiveTab, processDetailContext, closeProcessDetail } = useNavigationStore();
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showDiscoveryPanel, setShowDiscoveryPanel] = useState(false);
  const [showIngestionPanel, setShowIngestionPanel] = useState(false);

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
      {/* Header — Row 1: Branding, Perspectives, Scenario */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-2 flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 leading-tight flex-shrink-0">
            Business Ontology Framework
          </h1>

          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

          {/* Perspective pills */}
          <div className="flex items-center gap-1 min-w-0">
            {perspectives?.map((p) => {
              const dotColor = perspectiveDotColors[p.id] || 'bg-gray-400';
              return (
                <button
                  key={p.id}
                  onClick={() => modals.openPerspectiveEditor(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                  title={p.primary_concern}
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                  <span className="font-medium">{p.name}</span>
                </button>
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

          <div className="flex-1" />

          <ScenarioSelector />
        </div>

        {/* Row 2: Views + Actions */}
        <div className="px-6 flex items-center gap-1">
          {/* View tabs */}
          <div className="flex items-center gap-0.5">
            {([
              { key: 'lineage', label: 'Lineage', icon: GitBranch },
              { key: 'attributeLibrary', label: 'Attributes', icon: Database },
              { key: 'gapsROI', label: 'Gaps & ROI', icon: AlertTriangle },
              { key: 'semanticModel', label: 'Semantic Model', icon: Table },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap text-xs font-medium ${
                  activeTab === key && !processDetailContext
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1 flex-shrink-0" />

          {/* Import & Create */}
          <div className="flex items-center gap-1.5">
            <CreateMenu modals={modals} />
            <OntologyCommandBar
              metrics={metricsData?.map(m => ({ id: m.id, name: m.name })) || []}
              attributes={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
              measures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
              processSteps={processes?.flatMap(p => p.steps.map(s => ({ id: s.id, name: s.name }))) || []}
            />
            <button
              onClick={() => { setShowIngestionPanel(!showIngestionPanel); if (!showIngestionPanel) { setShowAIPanel(false); setShowDiscoveryPanel(false); } }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showIngestionPanel
                  ? 'text-cyan-700 bg-cyan-100 border border-cyan-300'
                  : 'text-cyan-700 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Import Data
            </button>
          </div>

          <div className="flex-1" />

          {/* AI Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setShowDiscoveryPanel(!showDiscoveryPanel); if (!showDiscoveryPanel) { setShowAIPanel(false); setShowIngestionPanel(false); } }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showDiscoveryPanel
                  ? 'text-teal-700 bg-teal-100 border border-teal-300'
                  : 'text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Discovery
            </button>
            <button
              onClick={() => { setShowAIPanel(!showAIPanel); if (!showAIPanel) { setShowDiscoveryPanel(false); setShowIngestionPanel(false); } }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showAIPanel
                  ? 'text-purple-700 bg-purple-100 border border-purple-300'
                  : 'text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Assistant
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 h-[calc(100vh-88px)]">
        {/* Process Detail Overlay (drill-down from Lineage or Attribute Library) */}
        {processDetailContext ? (
          <div className="h-full flex flex-col">
            {/* Context banner */}
            <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-2 flex items-center gap-3">
              <button
                onClick={closeProcessDetail}
                className="flex items-center gap-1.5 text-sm text-indigo-700 hover:text-indigo-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to {activeTab === 'lineage' ? 'Lineage' : activeTab === 'attributeLibrary' ? 'Attribute Library' : 'Lineage'}
              </button>
              <div className="h-4 w-px bg-indigo-200" />
              <span className="text-sm text-indigo-600">
                Crystallisation pathway for <strong>{processDetailContext.attributeName}</strong> in {processDetailContext.processName}
              </span>
            </div>
            {/* Scoped ProcessCanvas */}
            <div className="flex-1">
              <ProcessCanvas
                processId={processDetailContext.processId}
                crystallisationContext={processDetailContext}
              />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'lineage' && (
              <div className="h-full bg-white"><LineageView /></div>
            )}

            {activeTab === 'attributeLibrary' && (
              <div className="h-full bg-white"><AttributeLibrary /></div>
            )}

            {activeTab === 'gapsROI' && (
              <div className="h-full bg-white"><GapsView /></div>
            )}

            {activeTab === 'semanticModel' && (
              <div className="h-full bg-white"><SemanticModelView onImportTmdl={modals.openTmdlImport} /></div>
            )}
          </>
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
        availablePerspectives={perspectives?.map(p => ({ id: p.id, name: p.name })) || []}
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

      {/* Workshop AI Panel */}
      {showAIPanel && (
        <WorkshopAIPanel onClose={() => setShowAIPanel(false)} />
      )}

      {/* Guided Discovery Panel */}
      {showDiscoveryPanel && (
        <GuidedDiscoveryPanel onClose={() => setShowDiscoveryPanel(false)} />
      )}

      {/* Unified Ingestion Panel */}
      {showIngestionPanel && (
        <IngestionPanel onClose={() => setShowIngestionPanel(false)} />
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
