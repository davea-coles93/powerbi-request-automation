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
import { TableEditorModal } from './components/TableEditorModal';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { RelationshipDesigner } from './components/RelationshipDesigner';
import { EntityEditorModal } from './components/EntityEditorModal';
import { SystemEditorModal } from './components/SystemEditorModal';
import { ObservationEditorModal } from './components/ObservationEditorModal';
import { MeasureEditorModal } from './components/MeasureEditorModal';
import { MeasureUsageModal } from './components/MeasureUsageModal';
import { MetricEditorModal } from './components/MetricEditorModal';
import { ProcessStepDataModal } from './components/ProcessStepDataModal';
import { ProcessStepMappingModal } from './components/ProcessStepMappingModal';
import {
  usePerspectiveView,
  useProcesses,
  useMeasures,
  useAttributes,
  useEntities,
  useSystems,
  useSemanticTables,
  useMappingStatus
} from './hooks/useOntology';
import { GitBranch, Table, Database, Edit3 } from 'lucide-react';

type ViewMode = 'processBuilder' | 'dataFoundation' | 'semanticModel' | 'dataLineage';

function App() {
  const queryClient = useQueryClient();
  const [selectedPerspective, setSelectedPerspective] = useState('financial');
  const [detailMetricId, setDetailMetricId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dataFoundation');

  // Modal states
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState(false);
  const [columnMapperTable, setColumnMapperTable] = useState<string | null>(null);
  const [isRelationshipDesignerOpen, setIsRelationshipDesignerOpen] = useState(false);

  // New modal states
  const [isEntityEditorOpen, setIsEntityEditorOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isSystemEditorOpen, setIsSystemEditorOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<any | null>(null);
  const [isObservationEditorOpen, setIsObservationEditorOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<any | null>(null);
  const [isMeasureEditorOpen, setIsMeasureEditorOpen] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<any | null>(null);
  const [isMeasureUsageOpen, setIsMeasureUsageOpen] = useState(false);
  const [measureUsageData, setMeasureUsageData] = useState<any | null>(null);
  const [isMetricEditorOpen, setIsMetricEditorOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any | null>(null);

  // Process step modal states
  const [isStepDataModalOpen, setIsStepDataModalOpen] = useState(false);
  const [stepDataModalData, setStepDataModalData] = useState<any | null>(null);
  const [isStepMappingModalOpen, setIsStepMappingModalOpen] = useState(false);
  const [stepMappingModalData, setStepMappingModalData] = useState<any | null>(null);

  usePerspectiveView(selectedPerspective);
  const { data: processes } = useProcesses();
  const { data: measures } = useMeasures();
  const { data: attributes } = useAttributes();
  const { data: entities } = useEntities();
  const { data: systems } = useSystems();
  const { data: semanticTables } = useSemanticTables();
  useMappingStatus();

  // Handler functions
  const handleSaveTable = (tableData: any) => {
    console.log('Saving table:', tableData);
    // In a real app, this would call an API
  };

  const handleSaveMappings = (mappings: any) => {
    console.log('Saving mappings:', mappings);
    // In a real app, this would call an API
  };

  const handleSaveRelationships = (relationships: any) => {
    console.log('Saving relationships:', relationships);
    // In a real app, this would call an API
  };

  // New handler functions
  const handleSaveEntity = (entityData: any) => {
    console.log('Saving entity:', entityData);
    // In a real app, this would call an API
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

  const handleSaveAttribute = (attributeData: any) => {
    console.log('Saving attribute:', attributeData);
    // In a real app, this would call an API
  };

  const handleSaveMeasure = (measureData: any) => {
    console.log('Saving measure:', measureData);
    // In a real app, this would call an API
  };

  const handleSaveMetric = (metricData: any) => {
    console.log('Saving metric:', metricData);
    // In a real app, this would call an API
  };

  // Note: handleViewStepData and handleMapStepToModel removed as Process Flow component was consolidated into Process Builder

  const handleSaveStepMappings = (mappings: any) => {
    console.log('Saving step mappings:', mappings);
    // In a real app, this would call an API
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
          <ScenarioSelector />
        </div>
      </header>

      {/* Perspective Navigation */}
      <PerspectiveNav
        selectedId={selectedPerspective}
        onSelect={(id) => {
          setSelectedPerspective(id);
        }}
      />

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
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-gray-50 h-[calc(100vh-180px)]">
        {viewMode === 'processBuilder' && processes && processes.length > 0 && (
          <div className="h-full">
            <ProcessMapEditor
              processId={processes[0].id}
              perspectiveLevel={selectedPerspective}
            />
          </div>
        )}

        {viewMode === 'dataFoundation' && (
          <div className="h-full bg-white">
            <DataFoundation />
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
      </main>

      {/* Metric Detail Modal */}
      {detailMetricId && (
        <MetricDetail
          metricId={detailMetricId}
          onClose={() => setDetailMetricId(null)}
        />
      )}

      {/* Table Editor Modal */}
      <TableEditorModal
        isOpen={isTableEditorOpen}
        onClose={() => {
          setIsTableEditorOpen(false);
          setSelectedTable(null);
        }}
        table={selectedTable}
        onSave={handleSaveTable}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name, logic: m.logic, formula: m.formula })) || []}
      />

      {/* Column Mapper Modal */}
      {columnMapperTable && (
        <ColumnMapperModal
          isOpen={isColumnMapperOpen}
          onClose={() => {
            setIsColumnMapperOpen(false);
            setColumnMapperTable(null);
          }}
          tableId={columnMapperTable}
          tableName={semanticTables?.find(t => t.id === columnMapperTable)?.name || ''}
          columns={semanticTables?.find(t => t.id === columnMapperTable)?.columns || []}
          availableObservations={attributes?.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            entity_id: a.entity_id,
            isMapped: false
          })) || []}
          existingMappings={[]}
          onSave={handleSaveMappings}
        />
      )}

      {/* Relationship Designer Modal */}
      <RelationshipDesigner
        isOpen={isRelationshipDesignerOpen}
        onClose={() => setIsRelationshipDesignerOpen(false)}
        tables={semanticTables || []}
        relationships={[]}
        onSave={handleSaveRelationships}
      />

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
      <ObservationEditorModal
        isOpen={isObservationEditorOpen}
        onClose={() => {
          setIsObservationEditorOpen(false);
          setSelectedObservation(null);
        }}
        observation={selectedObservation}
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
        availableObservations={attributes?.map(a => ({ id: a.id, name: a.name })) || []}
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

      {/* Process Step Data Modal */}
      <ProcessStepDataModal
        isOpen={isStepDataModalOpen}
        onClose={() => {
          setIsStepDataModalOpen(false);
          setStepDataModalData(null);
        }}
        stepData={stepDataModalData}
      />

      {/* Process Step Mapping Modal */}
      <ProcessStepMappingModal
        isOpen={isStepMappingModalOpen}
        onClose={() => {
          setIsStepMappingModalOpen(false);
          setStepMappingModalData(null);
        }}
        stepData={stepMappingModalData}
        availableTables={semanticTables || []}
        availableMeasures={measures?.map(m => ({ id: m.id, name: m.name, description: m.description })) || []}
        onSave={handleSaveStepMappings}
      />

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
