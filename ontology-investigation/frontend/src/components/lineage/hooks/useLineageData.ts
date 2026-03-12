import { useState, useMemo, useCallback } from 'react';
import { useLineageWithCosts } from '../../../hooks/useOntology';

/**
 * Data hook for the enhanced Lineage view.
 *
 * Wraps the lineage-with-costs API query and provides perspective filtering,
 * search state, and computed statistics.
 */
export function useLineageData() {
  const { data, isLoading } = useLineageWithCosts();

  const [perspectiveFilter, setPerspectiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = data?.metrics ?? [];
  const measures = data?.measures ?? [];
  const attributes = data?.attributes ?? [];
  const entities = data?.entities ?? [];
  const systems = data?.systems ?? [];
  const crystallisationCosts = data?.crystallisation_costs ?? {};

  // Apply perspective filter
  const filteredData = useMemo(() => {
    if (perspectiveFilter === 'all') {
      return { metrics, measures, attributes, entities, systems };
    }

    const filterByPerspective = (items: any[]) =>
      items.filter((item) => {
        const perspectiveIds: string[] = item.perspective_ids || item.perspective_id
          ? [item.perspective_id]
          : [];
        // Include items that have no perspective (shared) or match the filter
        if (perspectiveIds.length === 0 && !item.perspective_id) return true;
        const allIds = item.perspective_ids || (item.perspective_id ? [item.perspective_id] : []);
        return allIds.some((pid: string) =>
          pid.toLowerCase().includes(perspectiveFilter.toLowerCase()),
        );
      });

    return {
      metrics: filterByPerspective(metrics),
      measures: filterByPerspective(measures),
      attributes: filterByPerspective(attributes),
      entities: filterByPerspective(entities),
      systems: filterByPerspective(systems),
    };
  }, [perspectiveFilter, metrics, measures, attributes, entities, systems]);

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

  return {
    metrics: filteredData.metrics,
    measures: filteredData.measures,
    attributes: filteredData.attributes,
    entities: filteredData.entities,
    systems: filteredData.systems,
    crystallisationCosts,
    isLoading,
    perspectiveFilter,
    setPerspectiveFilter: handlePerspectiveChange,
    searchQuery,
    setSearchQuery: handleSearchChange,
    totalCrystallisationMinutes,
  };
}
