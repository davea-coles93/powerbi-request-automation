import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import * as api from './services/api';
import { PerspectiveNav } from './components/PerspectiveNav';
import { DataFoundation } from './components/DataFoundation';
import { SemanticModelView } from './components/SemanticModelView';
import { MetricDetail } from './components/MetricDetail';
import { FullGraphView } from './components/FullGraphView';
import { ProcessMapEditor } from './components/ProcessMapEditor';
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
import {
  usePerspectives,
  usePerspectiveView,
  useProcesses,
  useMeasures,
  useAttributes,
  useEntities,
  useSystems,
  useMetrics,
  useMappingStatus
} from './hooks/useOntology';
import { GitBranch, Table, Database, Edit3, Activity, Upload, Search, FileSpreadsheet, Users } from 'lucide-react';
import { ProcessEfficiencyDashboard } from './components/ProcessEfficiencyDashboard';
import { PerspectiveFlowHeader } from './components/PerspectiveFlowHeader';
import { ExcelImportPanel } from './components/ExcelImportPanel';
import { WorkshopSessionPanel } from './components/WorkshopSession';

type ViewMode = 'processBuilder' | 'dataFoundation' | 'semanticModel' | 'dataLineage' | 'processEfficiency' | 'discovery';

function App() {
  const queryClient = useQueryClient();
  const [selectedPerspective, setSelectedPerspective] = useState('financial');
  const [detailMetricId, setDetailMetricId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dataFoundation');

  // Modal states
  const [isEntityEditorOpen, setIsEntityEditorOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isSystemEditorOpen, setIsSystemEditorOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<any | null>(null);
  const [isAttributeEditorOpen, setIsAttributeEditorOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<any | null>(null);
  const [isMeasureEditorOpen, setIsMeasureEditorOpen] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<any | null>(null);
  const [isMeasureUsageOpen, setIsMeasureUsageOpen] = useState(false);
  const [measureUsageData, setMeasureUsageData] = useState<any | null>(null);
  const [isMetricEditorOpen, setIsMetricEditorOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any | null>(null);

  // Perspective modal states
  const [isPerspectiveEditorOpen, setIsPerspectiveEditorOpen] = useState(false);
  const [selectedPerspectiveForEdit, setSelectedPerspectiveForEdit] = useState<any | null>(null);

  // TMDL import modal state
  const [isTmdlImportOpen, setIsTmdlImportOpen] = useState(false);

  // Discovery modal states
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);

  const { data: perspectives } = usePerspectives();
  usePerspectiveView(selectedPerspective);
  const { data: processes } = useProcesses();
  const { data: measures } = useMeasures();
  const { data: metricsData } = useMetrics();
  const { data: attributes } = useAttributes();
  const { data: entities } = useEntities();
  const { data: systems } = useSystems();
  useMappingStatus();

  // Handler functions
  const handleSaveEntity = async (entityData: any) => {
    try {
      if (selectedEntity) {
        await api.updateEntity(entityData.id, entityData);
      } else {
        await api.createEntity(entityData);
      }
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success(selectedEntity ? 'Entity updated' : 'Entity created');
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error('Failed to save entity. Please try again.');
    }
  };

  const handleSaveSystem = async (systemData: any) => {
    try {
      if (selectedSystem) {
        // Update existing system
        await api.updateSystem(systemData.id, systemData);
      } else {
        // Create new system
        await api.createSystem(systemData);
      }
      // Invalidate and refetch systems
      queryClient.invalidateQueries({ queryKey: ['systems'] });
    } catch (error) {
      console.error('Error saving system:', error);
      toast.error('Failed to save system. Please try again.');
    }
  };

  const handleSaveAttribute = async (attributeData: any) => {
    try {
      if (selectedAttribute) {
        await api.updateAttribute(attributeData.id, attributeData);
      } else {
        await api.createAttribute(attributeData);
      }
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success(selectedAttribute ? 'Attribute updated' : 'Attribute created');
    } catch (error) {
      console.error('Error saving attribute:', error);
      toast.error('Failed to save attribute. Please try again.');
    }
  };

  const handleSaveMeasure = async (measureData: any) => {
    try {
      if (selectedMeasure) {
        await api.updateMeasure(measureData.id, measureData);
      } else {
        await api.createMeasure(measureData);
      }
      queryClient.invalidateQueries({ queryKey: ['measures'] });
      toast.success(selectedMeasure ? 'Measure updated' : 'Measure created');
    } catch (error) {
      console.error('Error saving measure:', error);
      toast.error('Failed to save measure. Please try again.');
    }
  };

  const handleSaveMetric = async (metricData: any) => {
    try {
      if (selectedMetric) {
        await api.updateMetric(metricData.id, metricData);
      } else {
        await api.createMetric(metricData);
      }
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success(selectedMetric ? 'Metric updated' : 'Metric created');
    } catch (error) {
      console.error('Error saving metric:', error);
      toast.error('Failed to save metric. Please try again.');
    }
  };

  // Delete handlers
  const handleDeleteSystem = async (system: any) => {
    try {
      await api.deleteSystem(system.id);
      queryClient.invalidateQueries({ queryKey: ['systems'] });
      toast.success(`System "${system.name}" deleted`);
    } catch (error) {
      console.error('Error deleting system:', error);
      toast.error('Failed to delete system.');
    }
  };

  const handleDeleteEntity = async (entity: any) => {
    try {
      await api.deleteEntity(entity.id);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success(`Entity "${entity.name}" deleted`);
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast.error('Failed to delete entity.');
    }
  };

  const handleDeleteAttribute = async (attribute: any) => {
    try {
      await api.deleteAttribute(attribute.id);
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success(`Attribute "${attribute.name}" deleted`);
    } catch (error) {
      console.error('Error deleting attribute:', error);
      toast.error('Failed to delete attribute.');
    }
  };

  const handleDeleteMeasure = async (measure: any) => {
    try {
      await api.deleteMeasure(measure.id);
      queryClient.invalidateQueries({ queryKey: ['measures'] });
      toast.success(`Measure "${measure.name}" deleted`);
    } catch (error) {
      console.error('Error deleting measure:', error);
      toast.error('Failed to delete measure.');
    }
  };

  const handleDeleteMetric = async (metric: any) => {
    try {
      await api.deleteMetric(metric.id);
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success(`Metric "${metric.name}" deleted`);
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast.error('Failed to delete metric.');
    }
  };

  const handleSavePerspective = async (perspectiveData: any) => {
    try {
      if (selectedPerspectiveForEdit) {
        await api.updatePerspective(perspectiveData.id, perspectiveData);
      } else {
        await api.createPerspective(perspectiveData);
      }
      queryClient.invalidateQueries({ queryKey: ['perspectives'] });
      toast.success(selectedPerspectiveForEdit ? 'Perspective updated' : 'Perspective created');
    } catch (error) {
      console.error('Error saving perspective:', error);
      toast.error('Failed to save perspective.');
    }
  };

  const handleDeletePerspective = async (perspective: any) => {
    try {
      await api.deletePerspective(perspective.id);
      queryClient.invalidateQueries({ queryKey: ['perspectives'] });
      toast.success(`Perspective "${perspective.name}" deleted`);
    } catch (error) {
      console.error('Error deleting perspective:', error);
      toast.error('Failed to delete perspective.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Business Ontology Framework
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Power BI-Friendly Semantic Model Design & Process Mapping
            </p>
          </div>
          <div className="flex items-center gap-4">
            <OntologyCommandBar
              metrics={metricsData?.map(m => ({ id: m.id, name: m.name })) || []}
              attributes={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
              measures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
              processSteps={processes?.flatMap(p => p.steps.map(s => ({ id: s.id, name: s.name }))) || []}
            />
            <button
              onClick={() => setIsTmdlImportOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import from Power BI
            </button>
            <ScenarioSelector />
          </div>
        </div>
      </header>

      {/* Perspective Navigation - Flow header for Process Builder, filter nav for other views */}
      {viewMode === 'processBuilder' || viewMode === 'processEfficiency' ? (
        <PerspectiveFlowHeader />
      ) : (
        <PerspectiveNav
          selectedId={selectedPerspective}
          onSelect={(id) => {
            setSelectedPerspective(id);
          }}
          onEditPerspective={(perspective) => {
            setSelectedPerspectiveForEdit(perspective);
            setIsPerspectiveEditorOpen(true);
          }}
          onDeletePerspective={handleDeletePerspective}
          onNewPerspective={() => {
            setSelectedPerspectiveForEdit(null);
            setIsPerspectiveEditorOpen(true);
          }}
        />
      )}

      {/* View Mode Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setViewMode('processBuilder')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'processBuilder'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Process Builder
          </button>
          <button
            onClick={() => setViewMode('dataFoundation')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'dataFoundation'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Data Foundation
          </button>
          <button
            onClick={() => setViewMode('semanticModel')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'semanticModel'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table className="w-4 h-4" />
            Semantic Model
          </button>
          <button
            onClick={() => setViewMode('dataLineage')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'dataLineage'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Data Lineage
          </button>
          <button
            onClick={() => setViewMode('processEfficiency')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'processEfficiency'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Process Efficiency
          </button>
          <button
            onClick={() => setViewMode('discovery')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'discovery'
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="w-4 h-4" />
            Discovery
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-gray-50 h-[calc(100vh-180px)]">
        {viewMode === 'processBuilder' && processes && processes.length > 0 && (
          <div className="h-full">
            <ProcessMapEditor
              processId={processes[0].id}
            />
          </div>
        )}

        {viewMode === 'dataFoundation' && (
          <div className="h-full bg-white">
            <DataFoundation
              onEditMetric={(metric) => {
                setSelectedMetric(metric);
                setIsMetricEditorOpen(true);
              }}
              onDeleteMetric={handleDeleteMetric}
              onNewMetric={() => {
                setSelectedMetric(null);
                setIsMetricEditorOpen(true);
              }}
              onViewLineage={(metricId) => {
                setDetailMetricId(metricId);
              }}
              onEditMeasure={(measure) => {
                setSelectedMeasure(measure);
                setIsMeasureEditorOpen(true);
              }}
              onDeleteMeasure={handleDeleteMeasure}
              onNewMeasure={() => {
                setSelectedMeasure(null);
                setIsMeasureEditorOpen(true);
              }}
              onViewMeasureUsage={(measure) => {
                setMeasureUsageData(measure);
                setIsMeasureUsageOpen(true);
              }}
              onEditAttribute={(attribute) => {
                setSelectedAttribute(attribute);
                setIsAttributeEditorOpen(true);
              }}
              onDeleteAttribute={handleDeleteAttribute}
              onNewAttribute={() => {
                setSelectedAttribute(null);
                setIsAttributeEditorOpen(true);
              }}
              onEditEntity={(entity) => {
                setSelectedEntity(entity);
                setIsEntityEditorOpen(true);
              }}
              onDeleteEntity={handleDeleteEntity}
              onNewEntity={() => {
                setSelectedEntity(null);
                setIsEntityEditorOpen(true);
              }}
              onEditSystem={(system) => {
                setSelectedSystem(system);
                setIsSystemEditorOpen(true);
              }}
              onDeleteSystem={handleDeleteSystem}
              onNewSystem={() => {
                setSelectedSystem(null);
                setIsSystemEditorOpen(true);
              }}
            />
          </div>
        )}

        {viewMode === 'semanticModel' && (
          <div className="h-full bg-white">
            <SemanticModelView />
          </div>
        )}

        {viewMode === 'dataLineage' && (
          <div className="p-6">
            <FullGraphView perspective={selectedPerspective} />
          </div>
        )}

        {viewMode === 'processEfficiency' && (
          <div className="h-full bg-white">
            <ProcessEfficiencyDashboard />
          </div>
        )}

        {viewMode === 'discovery' && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Discovery & Data Collection</h2>
              <p className="text-sm text-gray-600">Import data from external sources and capture workshop findings to build your ontology.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Import Data Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Import Data</h3>
                    <p className="text-sm text-gray-500">Upload Excel or CSV files</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Import systems, entities, attributes, measures, and metrics from spreadsheets.
                  Data is added incrementally to the existing ontology.
                </p>
                <button
                  onClick={() => setIsExcelImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Import from Spreadsheet
                </button>
              </div>

              {/* Workshop Sessions Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Workshop Sessions</h3>
                    <p className="text-sm text-gray-500">Capture workshop findings</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Record top-down, bottom-up, and gap analysis workshops. Capture findings like
                  missing data supply, shadow systems, and manual effort pain points.
                </p>
                <button
                  onClick={() => setIsWorkshopOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Users className="w-4 h-4" />
                  Open Workshop Capture
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Ontology</h3>
              <div className="grid grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{perspectives?.length || 0}</div>
                  <div className="text-xs text-gray-500">Perspectives</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{systems?.length || 0}</div>
                  <div className="text-xs text-gray-500">Systems</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{entities?.length || 0}</div>
                  <div className="text-xs text-gray-500">Entities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{attributes?.length || 0}</div>
                  <div className="text-xs text-gray-500">Attributes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{measures?.length || 0}</div>
                  <div className="text-xs text-gray-500">Measures</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{metricsData?.length || 0}</div>
                  <div className="text-xs text-gray-500">Metrics</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Metric Detail Modal */}
      {detailMetricId && (
        <MetricDetail
          metricId={detailMetricId}
          onClose={() => setDetailMetricId(null)}
        />
      )}

      {/* Entity Editor Modal */}
      <EntityEditorModal
        isOpen={isEntityEditorOpen}
        onClose={() => {
          setIsEntityEditorOpen(false);
          setSelectedEntity(null);
        }}
        entity={selectedEntity}
        onSave={handleSaveEntity}
      />

      {/* System Editor Modal */}
      <SystemEditorModal
        isOpen={isSystemEditorOpen}
        onClose={() => {
          setIsSystemEditorOpen(false);
          setSelectedSystem(null);
        }}
        system={selectedSystem}
        onSave={handleSaveSystem}
      />

      {/* Attribute Editor Modal */}
      <AttributeEditorModal
        isOpen={isAttributeEditorOpen}
        onClose={() => {
          setIsAttributeEditorOpen(false);
          setSelectedAttribute(null);
        }}
        attribute={selectedAttribute}
        onSave={handleSaveAttribute}
        availableEntities={entities?.map(e => ({ id: e.id, name: e.name })) || []}
        availableSystems={systems?.map(s => ({ id: s.id, name: s.name })) || []}
      />

      {/* Measure Editor Modal */}
      <MeasureEditorModal
        isOpen={isMeasureEditorOpen}
        onClose={() => {
          setIsMeasureEditorOpen(false);
          setSelectedMeasure(null);
        }}
        measure={selectedMeasure}
        onSave={handleSaveMeasure}
        availableAttributes={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
      />

      {/* Measure Usage Modal */}
      <MeasureUsageModal
        isOpen={isMeasureUsageOpen}
        onClose={() => {
          setIsMeasureUsageOpen(false);
          setMeasureUsageData(null);
        }}
        usageData={measureUsageData}
      />

      {/* Metric Editor Modal */}
      <MetricEditorModal
        isOpen={isMetricEditorOpen}
        onClose={() => {
          setIsMetricEditorOpen(false);
          setSelectedMetric(null);
        }}
        metric={selectedMetric}
        onSave={handleSaveMetric}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name })) || []}
      />

      {/* Perspective Editor Modal */}
      <PerspectiveEditorModal
        isOpen={isPerspectiveEditorOpen}
        onClose={() => {
          setIsPerspectiveEditorOpen(false);
          setSelectedPerspectiveForEdit(null);
        }}
        perspective={selectedPerspectiveForEdit}
        onSave={handleSavePerspective}
        existingPerspectiveIds={perspectives?.map(p => p.id) || []}
      />

      {/* TMDL Import Modal */}
      <TmdlImportModal
        isOpen={isTmdlImportOpen}
        onClose={() => setIsTmdlImportOpen(false)}
      />

      {/* Excel/CSV Import Panel */}
      {isExcelImportOpen && (
        <ExcelImportPanel
          onClose={() => setIsExcelImportOpen(false)}
          onImported={() => {
            queryClient.invalidateQueries();
            toast.success('Data imported successfully');
          }}
        />
      )}

      {/* Workshop Session Panel */}
      {isWorkshopOpen && (
        <WorkshopSessionPanel
          onClose={() => setIsWorkshopOpen(false)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
