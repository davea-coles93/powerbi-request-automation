import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as api from '../services/api';

/**
 * Manages all modal state (open/close, selected item) and CRUD handlers
 * for the editor modals rendered in App.tsx.
 *
 * Extracts ~160 lines of boilerplate from App into a single hook.
 */
export function useAppModals() {
  const queryClient = useQueryClient();

  // --- Modal open/close state ---
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
  const [isPerspectiveEditorOpen, setIsPerspectiveEditorOpen] = useState(false);
  const [selectedPerspectiveForEdit, setSelectedPerspectiveForEdit] = useState<any | null>(null);
  const [isTmdlImportOpen, setIsTmdlImportOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [detailMetricId, setDetailMetricId] = useState<string | null>(null);

  // --- Open helpers (used as callbacks by child components) ---

  const openEntityEditor = (entity?: any) => {
    setSelectedEntity(entity ?? null);
    setIsEntityEditorOpen(true);
  };
  const closeEntityEditor = () => {
    setIsEntityEditorOpen(false);
    setSelectedEntity(null);
  };

  const openSystemEditor = (system?: any) => {
    setSelectedSystem(system ?? null);
    setIsSystemEditorOpen(true);
  };
  const closeSystemEditor = () => {
    setIsSystemEditorOpen(false);
    setSelectedSystem(null);
  };

  const openAttributeEditor = (attribute?: any) => {
    setSelectedAttribute(attribute ?? null);
    setIsAttributeEditorOpen(true);
  };
  const closeAttributeEditor = () => {
    setIsAttributeEditorOpen(false);
    setSelectedAttribute(null);
  };

  const openMeasureEditor = (measure?: any) => {
    setSelectedMeasure(measure ?? null);
    setIsMeasureEditorOpen(true);
  };
  const closeMeasureEditor = () => {
    setIsMeasureEditorOpen(false);
    setSelectedMeasure(null);
  };

  const openMeasureUsage = (measure: any) => {
    setMeasureUsageData(measure);
    setIsMeasureUsageOpen(true);
  };
  const closeMeasureUsage = () => {
    setIsMeasureUsageOpen(false);
    setMeasureUsageData(null);
  };

  const openMetricEditor = (metric?: any) => {
    setSelectedMetric(metric ?? null);
    setIsMetricEditorOpen(true);
  };
  const closeMetricEditor = () => {
    setIsMetricEditorOpen(false);
    setSelectedMetric(null);
  };

  const openPerspectiveEditor = (perspective?: any) => {
    setSelectedPerspectiveForEdit(perspective ?? null);
    setIsPerspectiveEditorOpen(true);
  };
  const closePerspectiveEditor = () => {
    setIsPerspectiveEditorOpen(false);
    setSelectedPerspectiveForEdit(null);
  };

  const openTmdlImport = () => setIsTmdlImportOpen(true);
  const closeTmdlImport = () => setIsTmdlImportOpen(false);

  const openExcelImport = () => setIsExcelImportOpen(true);
  const closeExcelImport = () => setIsExcelImportOpen(false);

  const openMetricDetail = (metricId: string) => setDetailMetricId(metricId);
  const closeMetricDetail = () => setDetailMetricId(null);

  // --- CRUD handlers ---

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

  const handleImported = () => {
    queryClient.invalidateQueries();
    toast.success('Data imported successfully');
  };

  /** Inline entity creation from within the attribute editor */
  const handleInlineCreateEntity = async (data: { name: string; description: string }) => {
    const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const entity = { id, name: data.name, description: data.description, core_attributes: [], lenses: [] };
    await api.createEntity(entity);
    queryClient.invalidateQueries({ queryKey: ['entities'] });
    toast.success(`Entity "${data.name}" created`);
    return { id, name: data.name };
  };

  /** Inline system creation from within the attribute editor */
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
      isOpen: isEntityEditorOpen,
      selected: selectedEntity,
      onSave: handleSaveEntity,
      onClose: closeEntityEditor,
    },
    systemEditor: {
      isOpen: isSystemEditorOpen,
      selected: selectedSystem,
      onSave: handleSaveSystem,
      onClose: closeSystemEditor,
    },
    attributeEditor: {
      isOpen: isAttributeEditorOpen,
      selected: selectedAttribute,
      onSave: handleSaveAttribute,
      onClose: closeAttributeEditor,
    },
    measureEditor: {
      isOpen: isMeasureEditorOpen,
      selected: selectedMeasure,
      onSave: handleSaveMeasure,
      onClose: closeMeasureEditor,
    },
    measureUsage: {
      isOpen: isMeasureUsageOpen,
      data: measureUsageData,
      onClose: closeMeasureUsage,
    },
    metricEditor: {
      isOpen: isMetricEditorOpen,
      selected: selectedMetric,
      onSave: handleSaveMetric,
      onClose: closeMetricEditor,
    },
    perspectiveEditor: {
      isOpen: isPerspectiveEditorOpen,
      selected: selectedPerspectiveForEdit,
      onSave: handleSavePerspective,
      onClose: closePerspectiveEditor,
    },
    tmdlImport: {
      isOpen: isTmdlImportOpen,
      onClose: closeTmdlImport,
    },
    excelImport: {
      isOpen: isExcelImportOpen,
      onClose: closeExcelImport,
      onImported: handleImported,
    },
    metricDetail: {
      metricId: detailMetricId,
      onClose: closeMetricDetail,
    },

    // Open actions (for passing to child components as callbacks)
    openEntityEditor,
    openSystemEditor,
    openAttributeEditor,
    openMeasureEditor,
    openMeasureUsage,
    openMetricEditor,
    openMetricDetail,
    openPerspectiveEditor,
    openTmdlImport,
    openExcelImport,

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
