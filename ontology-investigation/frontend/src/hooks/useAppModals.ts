import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as api from '../services/api';
import { useModalStore } from './useModalStore';

/**
 * Combines the global modal store (open/close state) with CRUD handlers
 * that need React's QueryClient.
 *
 * App.tsx uses this hook for the full interface (state + handlers).
 * Components that only need to OPEN a modal can use useModalStore directly.
 */
export function useAppModals() {
  const queryClient = useQueryClient();
  const store = useModalStore();

  // --- CRUD handlers ---

  const handleSaveEntity = async (entityData: any) => {
    try {
      if (store.selectedEntity) {
        await api.updateEntity(entityData.id, entityData);
      } else {
        await api.createEntity(entityData);
      }
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success(store.selectedEntity ? 'Entity updated' : 'Entity created');
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error('Failed to save entity. Please try again.');
    }
  };

  const handleSaveSystem = async (systemData: any) => {
    try {
      if (store.selectedSystem) {
        await api.updateSystem(systemData.id, systemData);
      } else {
        await api.createSystem(systemData);
      }
      queryClient.invalidateQueries({ queryKey: ['systems'] });
    } catch (error) {
      console.error('Error saving system:', error);
      toast.error('Failed to save system. Please try again.');
    }
  };

  const handleSaveAttribute = async (attributeData: any) => {
    try {
      if (store.selectedAttribute) {
        await api.updateAttribute(attributeData.id, attributeData);
      } else {
        await api.createAttribute(attributeData);
      }
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success(store.selectedAttribute ? 'Attribute updated' : 'Attribute created');
    } catch (error) {
      console.error('Error saving attribute:', error);
      toast.error('Failed to save attribute. Please try again.');
    }
  };

  const handleSaveMeasure = async (measureData: any) => {
    try {
      if (store.selectedMeasure) {
        await api.updateMeasure(measureData.id, measureData);
      } else {
        await api.createMeasure(measureData);
      }
      queryClient.invalidateQueries({ queryKey: ['measures'] });
      toast.success(store.selectedMeasure ? 'Measure updated' : 'Measure created');
    } catch (error) {
      console.error('Error saving measure:', error);
      toast.error('Failed to save measure. Please try again.');
    }
  };

  const handleSaveMetric = async (metricData: any) => {
    try {
      if (store.selectedMetric) {
        await api.updateMetric(metricData.id, metricData);
      } else {
        await api.createMetric(metricData);
      }
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success(store.selectedMetric ? 'Metric updated' : 'Metric created');
    } catch (error) {
      console.error('Error saving metric:', error);
      toast.error('Failed to save metric. Please try again.');
    }
  };

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
      if (store.selectedPerspectiveForEdit) {
        await api.updatePerspective(perspectiveData.id, perspectiveData);
      } else {
        await api.createPerspective(perspectiveData);
      }
      queryClient.invalidateQueries({ queryKey: ['perspectives'] });
      toast.success(store.selectedPerspectiveForEdit ? 'Perspective updated' : 'Perspective created');
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

  const handleImported = () => {
    queryClient.invalidateQueries();
    toast.success('Data imported successfully');
  };

  const handleInlineCreateEntity = async (data: { name: string; description: string }) => {
    const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const entity = { id, name: data.name, description: data.description, core_attributes: [], lenses: [] };
    await api.createEntity(entity);
    queryClient.invalidateQueries({ queryKey: ['entities'] });
    toast.success(`Entity "${data.name}" created`);
    return { id, name: data.name };
  };

  const handleInlineCreateSystem = async (data: { name: string; description: string }) => {
    const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const system = { id, name: data.name, description: data.description, type: 'Other' as const };
    await api.createSystem(system);
    queryClient.invalidateQueries({ queryKey: ['systems'] });
    toast.success(`System "${data.name}" created`);
    return { id, name: data.name };
  };

  return {
    // Modal states (for rendering modals)
    entityEditor: {
      isOpen: store.isEntityEditorOpen,
      selected: store.selectedEntity,
      onSave: handleSaveEntity,
      onClose: store.closeEntityEditor,
    },
    systemEditor: {
      isOpen: store.isSystemEditorOpen,
      selected: store.selectedSystem,
      onSave: handleSaveSystem,
      onClose: store.closeSystemEditor,
    },
    attributeEditor: {
      isOpen: store.isAttributeEditorOpen,
      selected: store.selectedAttribute,
      onSave: handleSaveAttribute,
      onClose: store.closeAttributeEditor,
    },
    measureEditor: {
      isOpen: store.isMeasureEditorOpen,
      selected: store.selectedMeasure,
      onSave: handleSaveMeasure,
      onClose: store.closeMeasureEditor,
    },
    measureUsage: {
      isOpen: store.isMeasureUsageOpen,
      data: store.measureUsageData,
      onClose: store.closeMeasureUsage,
    },
    metricEditor: {
      isOpen: store.isMetricEditorOpen,
      selected: store.selectedMetric,
      onSave: handleSaveMetric,
      onClose: store.closeMetricEditor,
    },
    perspectiveEditor: {
      isOpen: store.isPerspectiveEditorOpen,
      selected: store.selectedPerspectiveForEdit,
      onSave: handleSavePerspective,
      onClose: store.closePerspectiveEditor,
    },
    tmdlImport: {
      isOpen: store.isTmdlImportOpen,
      onClose: store.closeTmdlImport,
    },
    excelImport: {
      isOpen: store.isExcelImportOpen,
      onClose: store.closeExcelImport,
      onImported: handleImported,
    },
    metricDetail: {
      metricId: store.detailMetricId,
      onClose: store.closeMetricDetail,
    },

    // Open actions (for passing to child components as callbacks)
    openEntityEditor: store.openEntityEditor,
    openSystemEditor: store.openSystemEditor,
    openAttributeEditor: store.openAttributeEditor,
    openMeasureEditor: store.openMeasureEditor,
    openMeasureUsage: store.openMeasureUsage,
    openMetricEditor: store.openMetricEditor,
    openMetricDetail: store.openMetricDetail,
    openPerspectiveEditor: store.openPerspectiveEditor,
    openTmdlImport: store.openTmdlImport,
    openExcelImport: store.openExcelImport,

    // Delete handlers (for passing to child components)
    handleDeleteSystem,
    handleDeleteEntity,
    handleDeleteAttribute,
    handleDeleteMeasure,
    handleDeleteMetric,
    handleDeletePerspective,

    // Inline creation handlers (for use within editor modals)
    handleInlineCreateEntity,
    handleInlineCreateSystem,
  };
}
