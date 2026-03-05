import { useState, useCallback } from 'react';
import { useDataFoundationStore } from '../hooks/useDataFoundationStore';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useWorkshopSessions, useCreateWorkshopSession, useUpdateWorkshopSession } from '../../../hooks/useOntology';
import { MetricsTable } from '../../MetricsTable';
import { MeasuresTable } from '../../MeasuresTable';
import { AttributesTable } from '../../AttributesTable';
import { EntitiesTable } from '../../EntitiesTable';
import { SystemsTable } from '../../SystemsTable';
import { TableSkeletonLoader } from '../../SkeletonLoader';
import { TopDownWorkshop } from '../../workshop/TopDownWorkshop';
import type { WorkshopSession } from '../../../types/ontology';

interface TableViewProps {
  onEditMetric?: (metric: any) => void;
  onDeleteMetric?: (metric: any) => void;
  onNewMetric?: () => void;
  onViewLineage?: (metricId: string) => void;
  onEditMeasure?: (measure: any) => void;
  onDeleteMeasure?: (measure: any) => void;
  onNewMeasure?: () => void;
  onViewMeasureUsage?: (measure: any) => void;
  onEditAttribute?: (attribute: any) => void;
  onDeleteAttribute?: (attribute: any) => void;
  onNewAttribute?: () => void;
  onEditEntity?: (entity: any) => void;
  onDeleteEntity?: (entity: any) => void;
  onNewEntity?: () => void;
  onEditSystem?: (system: any) => void;
  onDeleteSystem?: (system: any) => void;
  onNewSystem?: () => void;
}

export function TableView(props: TableViewProps) {
  const activeView = useDataFoundationStore((s) => s.activeView);
  const selectNode = useDataFoundationStore((s) => s.selectNode);

  const {
    metrics,
    measures,
    attributes,
    entities,
    systems,
    isLoading,
  } = useDataFoundationData();

  // Workshop session management for businessQuestions view
  const { data: workshopSessions = [] } = useWorkshopSessions();
  const createSessionMutation = useCreateWorkshopSession();
  const updateSessionMutation = useUpdateWorkshopSession();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const topDownSessions = workshopSessions.filter(
    (s: WorkshopSession) => s.session_type === 'top_down',
  );

  const activeSession = topDownSessions.find(
    (s: WorkshopSession) => s.id === activeSessionId,
  ) ?? topDownSessions[0] ?? null;

  const handleCreateSession = useCallback(() => {
    createSessionMutation.mutate(
      {
        name: `Top-Down Session ${new Date().toLocaleDateString()}`,
        session_type: 'top_down',
        participants: [],
      },
      {
        onSuccess: (newSession: WorkshopSession) => {
          setActiveSessionId(newSession.id);
        },
      },
    );
  }, [createSessionMutation]);

  const handleSessionUpdate = useCallback(
    (updated: WorkshopSession) => {
      updateSessionMutation.mutate({ id: updated.id, data: updated });
    },
    [updateSessionMutation],
  );

  // Row click handlers that open the inspector panel
  const handleMetricClick = useCallback(
    (metric: any) => {
      selectNode({ id: metric.id, type: 'metric', data: metric });
    },
    [selectNode],
  );

  const handleMeasureClick = useCallback(
    (measure: any) => {
      selectNode({ id: measure.id, type: 'measure', data: measure });
    },
    [selectNode],
  );

  const handleAttributeClick = useCallback(
    (attribute: any) => {
      selectNode({ id: attribute.id, type: 'attribute', data: attribute });
    },
    [selectNode],
  );

  const handleEntityClick = useCallback(
    (entity: any) => {
      selectNode({ id: entity.id, type: 'entity', data: entity });
    },
    [selectNode],
  );

  const handleSystemClick = useCallback(
    (system: any) => {
      selectNode({ id: system.id, type: 'system', data: system });
    },
    [selectNode],
  );

  if (isLoading) {
    return <TableSkeletonLoader rows={8} />;
  }

  switch (activeView) {
    case 'businessQuestions':
      if (!activeSession) {
        return (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-lg font-medium mb-2">No Top-Down sessions yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Create a workshop session to capture business questions and trace them to metrics.
            </p>
            <button
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {createSessionMutation.isPending ? 'Creating...' : 'New Top-Down Session'}
            </button>
          </div>
        );
      }
      return (
        <div className="h-full overflow-auto">
          {topDownSessions.length > 1 && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <label className="text-xs text-gray-500">Session:</label>
              <select
                value={activeSession.id}
                onChange={(e) => setActiveSessionId(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {topDownSessions.map((s: WorkshopSession) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <TopDownWorkshop
            session={activeSession}
            onSessionUpdate={handleSessionUpdate}
          />
        </div>
      );

    case 'metrics':
      return (
        <MetricsTable
          metrics={metrics}
          measures={measures}
          onEditMetric={props.onEditMetric ?? handleMetricClick}
          onDeleteMetric={props.onDeleteMetric}
          onNewMetric={props.onNewMetric}
          onViewLineage={props.onViewLineage}
        />
      );

    case 'measures':
      return (
        <MeasuresTable
          measures={measures}
          attributes={attributes}
          onMeasureClick={props.onEditMeasure ?? handleMeasureClick}
          onDeleteMeasure={props.onDeleteMeasure}
          onNewMeasure={props.onNewMeasure}
          onViewUsage={props.onViewMeasureUsage}
        />
      );

    case 'attributes':
      return (
        <AttributesTable
          attributes={attributes}
          systems={systems}
          entities={entities}
          measures={measures}
          metrics={metrics}
          onAttributeClick={props.onEditAttribute ?? handleAttributeClick}
          onDeleteAttribute={props.onDeleteAttribute}
          onNewAttribute={props.onNewAttribute}
        />
      );

    case 'entities':
      return (
        <EntitiesTable
          entities={entities}
          onEditEntity={props.onEditEntity ?? handleEntityClick}
          onDeleteEntity={props.onDeleteEntity}
          onNewEntity={props.onNewEntity}
        />
      );

    case 'systems':
      return (
        <SystemsTable
          systems={systems}
          onEditSystem={props.onEditSystem ?? handleSystemClick}
          onDeleteSystem={props.onDeleteSystem}
          onNewSystem={props.onNewSystem}
        />
      );

    default:
      return null;
  }
}
