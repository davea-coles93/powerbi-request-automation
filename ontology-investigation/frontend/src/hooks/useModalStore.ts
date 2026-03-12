import { create } from 'zustand';

/**
 * Global Zustand store for modal open/close state and selected items.
 *
 * Components that only need to OPEN a modal (e.g. AttributeDetailPanel,
 * LineageInspectorPanel) use this store directly. App.tsx combines this
 * with CRUD handlers via useAppModals().
 */

interface ModalStore {
  // Entity Editor
  isEntityEditorOpen: boolean;
  selectedEntity: any | null;
  openEntityEditor: (entity?: any) => void;
  closeEntityEditor: () => void;

  // System Editor
  isSystemEditorOpen: boolean;
  selectedSystem: any | null;
  openSystemEditor: (system?: any) => void;
  closeSystemEditor: () => void;

  // Attribute Editor
  isAttributeEditorOpen: boolean;
  selectedAttribute: any | null;
  openAttributeEditor: (attribute?: any) => void;
  closeAttributeEditor: () => void;

  // Measure Editor
  isMeasureEditorOpen: boolean;
  selectedMeasure: any | null;
  openMeasureEditor: (measure?: any) => void;
  closeMeasureEditor: () => void;

  // Measure Usage
  isMeasureUsageOpen: boolean;
  measureUsageData: any | null;
  openMeasureUsage: (measure: any) => void;
  closeMeasureUsage: () => void;

  // Metric Editor
  isMetricEditorOpen: boolean;
  selectedMetric: any | null;
  openMetricEditor: (metric?: any) => void;
  closeMetricEditor: () => void;

  // Perspective Editor
  isPerspectiveEditorOpen: boolean;
  selectedPerspectiveForEdit: any | null;
  openPerspectiveEditor: (perspective?: any) => void;
  closePerspectiveEditor: () => void;

  // TMDL Import
  isTmdlImportOpen: boolean;
  openTmdlImport: () => void;
  closeTmdlImport: () => void;

  // Excel Import
  isExcelImportOpen: boolean;
  openExcelImport: () => void;
  closeExcelImport: () => void;

  // Metric Detail
  detailMetricId: string | null;
  openMetricDetail: (metricId: string) => void;
  closeMetricDetail: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  // Entity Editor
  isEntityEditorOpen: false,
  selectedEntity: null,
  openEntityEditor: (entity) => set({ isEntityEditorOpen: true, selectedEntity: entity ?? null }),
  closeEntityEditor: () => set({ isEntityEditorOpen: false, selectedEntity: null }),

  // System Editor
  isSystemEditorOpen: false,
  selectedSystem: null,
  openSystemEditor: (system) => set({ isSystemEditorOpen: true, selectedSystem: system ?? null }),
  closeSystemEditor: () => set({ isSystemEditorOpen: false, selectedSystem: null }),

  // Attribute Editor
  isAttributeEditorOpen: false,
  selectedAttribute: null,
  openAttributeEditor: (attribute) => set({ isAttributeEditorOpen: true, selectedAttribute: attribute ?? null }),
  closeAttributeEditor: () => set({ isAttributeEditorOpen: false, selectedAttribute: null }),

  // Measure Editor
  isMeasureEditorOpen: false,
  selectedMeasure: null,
  openMeasureEditor: (measure) => set({ isMeasureEditorOpen: true, selectedMeasure: measure ?? null }),
  closeMeasureEditor: () => set({ isMeasureEditorOpen: false, selectedMeasure: null }),

  // Measure Usage
  isMeasureUsageOpen: false,
  measureUsageData: null,
  openMeasureUsage: (measure) => set({ isMeasureUsageOpen: true, measureUsageData: measure }),
  closeMeasureUsage: () => set({ isMeasureUsageOpen: false, measureUsageData: null }),

  // Metric Editor
  isMetricEditorOpen: false,
  selectedMetric: null,
  openMetricEditor: (metric) => set({ isMetricEditorOpen: true, selectedMetric: metric ?? null }),
  closeMetricEditor: () => set({ isMetricEditorOpen: false, selectedMetric: null }),

  // Perspective Editor
  isPerspectiveEditorOpen: false,
  selectedPerspectiveForEdit: null,
  openPerspectiveEditor: (perspective) => set({ isPerspectiveEditorOpen: true, selectedPerspectiveForEdit: perspective ?? null }),
  closePerspectiveEditor: () => set({ isPerspectiveEditorOpen: false, selectedPerspectiveForEdit: null }),

  // TMDL Import
  isTmdlImportOpen: false,
  openTmdlImport: () => set({ isTmdlImportOpen: true }),
  closeTmdlImport: () => set({ isTmdlImportOpen: false }),

  // Excel Import
  isExcelImportOpen: false,
  openExcelImport: () => set({ isExcelImportOpen: true }),
  closeExcelImport: () => set({ isExcelImportOpen: false }),

  // Metric Detail
  detailMetricId: null,
  openMetricDetail: (metricId) => set({ detailMetricId: metricId }),
  closeMetricDetail: () => set({ detailMetricId: null }),
}));
