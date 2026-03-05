import { useMemo } from 'react';
import { useMetrics, useMeasures, useAttributes, useEntities, useSystems, useProcesses } from '../../../hooks/useOntology';
import { useDataFoundationStore } from './useDataFoundationStore';

export const useDataFoundationData = () => {
  const perspectiveFilter = useDataFoundationStore((s) => s.perspectiveFilter);

  const { data: metrics = [], isLoading: metricsLoading } = useMetrics();
  const { data: measures = [], isLoading: measuresLoading } = useMeasures();
  const { data: attributes = [], isLoading: attributesLoading } = useAttributes();
  const { data: entities = [], isLoading: entitiesLoading } = useEntities();
  const { data: systems = [], isLoading: systemsLoading } = useSystems();
  const { data: processes = [], isLoading: processesLoading } = useProcesses();

  const isLoading = metricsLoading || measuresLoading || attributesLoading || entitiesLoading || systemsLoading || processesLoading;

  const filteredMetrics = useMemo(() => {
    if (!perspectiveFilter) return metrics;
    return metrics.filter((m: any) =>
      m.perspective_ids?.includes(perspectiveFilter)
    );
  }, [metrics, perspectiveFilter]);

  const filteredMeasures = useMemo(() => {
    if (!perspectiveFilter) return measures;
    return measures.filter((m: any) =>
      m.perspective_ids?.includes(perspectiveFilter)
    );
  }, [measures, perspectiveFilter]);

  const filteredAttributes = useMemo(() => {
    if (!perspectiveFilter) return attributes;
    return attributes.filter((a: any) =>
      a.perspective_ids?.includes(perspectiveFilter)
    );
  }, [attributes, perspectiveFilter]);

  return {
    metrics,
    measures,
    attributes,
    entities,
    systems,
    processes,
    filteredMetrics,
    filteredMeasures,
    filteredAttributes,
    isLoading,
  };
};
