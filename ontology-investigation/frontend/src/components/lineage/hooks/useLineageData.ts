import { useState, useMemo, useCallback } from 'react';
import { useLineageWithCosts, useProcesses, useProcess } from '../../../hooks/useOntology';
import { useNavigationStore } from '../../../hooks/useNavigationStore';

export type EntityTypeName = 'metric' | 'measure' | 'attribute' | 'entity' | 'system';
export type ViewMode = 'lineage';

/**
 * Data hook for the enhanced Lineage view.
 *
 * Wraps the lineage-with-costs API query and provides perspective filtering,
 * type visibility toggles, search state, and computed statistics.
 */
export function useLineageData() {
  const { data, isLoading } = useLineageWithCosts();

  const [perspectiveFilter, setPerspectiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<EntityTypeName>>(new Set());
  const viewMode: ViewMode = 'lineage';
  const [crystallisationOnly, setCrystallisationOnly] = useState(false);
  const [processFilter, setProcessFilter] = useState<string | null>(null);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  const stateFilter = useNavigationStore((s) => s.stateFilter);
  const { data: allProcesses } = useProcesses();
  const { data: selectedProcess } = useProcess(processFilter || '');

  const metrics = data?.metrics ?? [];
  const measures = data?.measures ?? [];
  const attributes = data?.attributes ?? [];
  const entities = data?.entities ?? [];
  const systems = data?.systems ?? [];
  const crystallisationCosts = data?.crystallisation_costs ?? {};
  const measureCosts = data?.measure_costs ?? {};
  const metricCosts = data?.metric_costs ?? {};

  // Apply perspective filter + crystallisation filter + type visibility
  const filteredData = useMemo(() => {
    let result = { metrics, measures, attributes, entities, systems };

    // Perspective filter
    if (perspectiveFilter !== 'all') {
      const filterByPerspective = (items: any[]) =>
        items.filter((item) => {
          const perspectiveIds: string[] = item.perspective_ids || item.perspective_id
            ? [item.perspective_id]
            : [];
          if (perspectiveIds.length === 0 && !item.perspective_id) return true;
          const allIds = item.perspective_ids || (item.perspective_id ? [item.perspective_id] : []);
          return allIds.some((pid: string) =>
            pid.toLowerCase().includes(perspectiveFilter.toLowerCase()),
          );
        });

      result = {
        metrics: filterByPerspective(metrics),
        measures: filterByPerspective(measures),
        attributes: filterByPerspective(attributes),
        entities: filterByPerspective(entities),
        systems: filterByPerspective(systems),
      };
    }

    // State filter (as-is / to-be / both)
    if (stateFilter !== 'both') {
      const matchesState = (item: any) => {
        const itemState = item.state || 'as-is';
        return itemState === stateFilter || itemState === 'both';
      };
      result = {
        metrics: result.metrics.filter(matchesState),
        measures: result.measures.filter(matchesState),
        attributes: result.attributes.filter(matchesState),
        entities: result.entities.filter(matchesState),
        systems: result.systems.filter(matchesState),
      };
    }

    // Crystallisation pathway filter — keep only elements on cost pathways
    if (crystallisationOnly) {
      const costAttrIds = new Set(Object.keys(crystallisationCosts));
      const keptAttrs = result.attributes.filter((a: any) => costAttrIds.has(a.id));
      const keptAttrIds = new Set(keptAttrs.map((a: any) => a.id));

      // Measures that input at least one cost attribute
      const keptMeasures = result.measures.filter((m: any) =>
        (m.input_attribute_ids || []).some((aid: string) => keptAttrIds.has(aid)),
      );
      const keptMeasureIds = new Set(keptMeasures.map((m: any) => m.id));

      // Metrics that use at least one kept measure
      const keptMetrics = result.metrics.filter((m: any) =>
        (m.calculated_by_measure_ids || []).some((mid: string) => keptMeasureIds.has(mid)),
      );

      // Entities that kept attributes belong to
      const keptEntityIds = new Set(keptAttrs.map((a: any) => a.entity_id || a.entity).filter(Boolean));
      const keptEntities = result.entities.filter((e: any) => keptEntityIds.has(e.id));

      // Systems that kept attributes are sourced from
      const keptSystemIds = new Set(keptAttrs.map((a: any) => a.source_system_id || a.system_id).filter(Boolean));
      const keptSystems = result.systems.filter((s: any) => keptSystemIds.has(s.id));

      result = {
        metrics: keptMetrics,
        measures: keptMeasures,
        attributes: keptAttrs,
        entities: keptEntities,
        systems: keptSystems,
      };
    }

    // Process focus filter — keep only elements touched by the selected process
    if (processFilter && selectedProcess?.steps) {
      const steps = selectedProcess.steps;

      // Collect all element IDs touched by this process's steps
      const touchedAttrIds = new Set<string>();
      const touchedMetricIds = new Set<string>();
      const touchedSystemIds = new Set<string>();

      for (const step of steps) {
        for (const id of step.consumes_attribute_ids || []) touchedAttrIds.add(id);
        for (const id of step.produces_attribute_ids || []) touchedAttrIds.add(id);
        for (const id of step.crystallizes_attribute_ids || []) touchedAttrIds.add(id);
        for (const id of step.uses_metric_ids || []) touchedMetricIds.add(id);
        for (const id of step.systems_used_ids || []) touchedSystemIds.add(id);
      }

      // Keep directly touched attributes
      const keptAttrs = result.attributes.filter((a: any) => touchedAttrIds.has(a.id));
      const keptAttrIds = new Set(keptAttrs.map((a: any) => a.id));

      // Trace up: measures whose inputs overlap with kept attributes
      const keptMeasures = result.measures.filter((m: any) =>
        (m.input_attribute_ids || []).some((aid: string) => keptAttrIds.has(aid)),
      );
      const keptMeasureIds = new Set(keptMeasures.map((m: any) => m.id));

      // Trace up: metrics that use kept measures OR are directly referenced
      const keptMetrics = result.metrics.filter((m: any) =>
        touchedMetricIds.has(m.id) ||
        (m.calculated_by_measure_ids || []).some((mid: string) => keptMeasureIds.has(mid)),
      );

      // Trace down: entities referenced by kept attributes
      const keptEntityIds = new Set(keptAttrs.map((a: any) => a.entity_id || a.entity).filter(Boolean));
      const keptEntities = result.entities.filter((e: any) => keptEntityIds.has(e.id));

      // Trace down: systems referenced by kept attributes OR directly used by steps
      const keptSystemIds = new Set([
        ...keptAttrs.map((a: any) => a.source_system_id || a.system_id).filter(Boolean),
        ...touchedSystemIds,
      ]);
      const keptSystems = result.systems.filter((s: any) => keptSystemIds.has(s.id));

      result = {
        metrics: keptMetrics,
        measures: keptMeasures,
        attributes: keptAttrs,
        entities: keptEntities,
        systems: keptSystems,
      };
    }

    // Type visibility filter
    if (hiddenTypes.size > 0) {
      result = {
        metrics: hiddenTypes.has('metric') ? [] : result.metrics,
        measures: hiddenTypes.has('measure') ? [] : result.measures,
        attributes: hiddenTypes.has('attribute') ? [] : result.attributes,
        entities: hiddenTypes.has('entity') ? [] : result.entities,
        systems: hiddenTypes.has('system') ? [] : result.systems,
      };
    }

    return result;
  }, [perspectiveFilter, stateFilter, hiddenTypes, crystallisationOnly, crystallisationCosts, processFilter, selectedProcess, metrics, measures, attributes, entities, systems]);

  // Compute total crystallisation hours
  const totalCrystallisationMinutes = useMemo(
    () =>
      Object.values(crystallisationCosts).reduce(
        (sum, cost) => sum + cost.total_duration_minutes,
        0,
      ),
    [crystallisationCosts],
  );

  const handlePerspectiveChange = useCallback((value: string) => {
    setPerspectiveFilter(value);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const toggleType = useCallback((type: EntityTypeName) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleEntity = useCallback((entityId: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }, []);

  return {
    metrics: filteredData.metrics,
    measures: filteredData.measures,
    attributes: filteredData.attributes,
    entities: filteredData.entities,
    systems: filteredData.systems,
    crystallisationCosts,
    measureCosts,
    metricCosts,
    isLoading,
    perspectiveFilter,
    setPerspectiveFilter: handlePerspectiveChange,
    searchQuery,
    setSearchQuery: handleSearchChange,
    totalCrystallisationMinutes,
    hiddenTypes,
    toggleType,
    viewMode,
    crystallisationOnly,
    setCrystallisationOnly,
    processFilter,
    setProcessFilter,
    processes: allProcesses,
    expandedEntities,
    toggleEntity,
  };
}
