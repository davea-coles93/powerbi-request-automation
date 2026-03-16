import { useRef, useMemo, useEffect, useState } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { Workflow, Info } from 'lucide-react';
import { useProcessInterconnections } from '../../hooks/useOntology';
import { useNavigationStore } from '../../hooks/useNavigationStore';
import { CytoscapeContainer } from '../shared/canvas/CytoscapeContainer';
import { ZoomControls } from '../shared/canvas/ZoomControls';
import { Minimap } from '../shared/canvas/Minimap';

cytoscape.use(cytoscapeDagre);

const NODE_BASE_WIDTH = 180;
const NODE_BASE_HEIGHT = 60;

function buildProcessMapElements(data: { processes: any[]; connections: any[] }) {
  const elements: any[] = [];

  for (const proc of data.processes) {
    elements.push({
      data: {
        id: proc.id,
        name: proc.name,
        label: `${proc.name}\n${proc.step_count} steps`,
        description: proc.description || '',
        stepCount: proc.step_count,
        entityType: 'process',
        width: NODE_BASE_WIDTH,
        height: NODE_BASE_HEIGHT,
      },
      classes: 'process-node',
    });
  }

  for (const conn of data.connections) {
    const attrNames = conn.shared_attributes.map((a: any) => a.name).join(', ');
    const attrCount = conn.shared_attributes.length;
    elements.push({
      data: {
        id: `e-${conn.from_id}-${conn.to_id}`,
        source: conn.from_id,
        target: conn.to_id,
        label: attrCount <= 2 ? attrNames : `${attrCount} shared attributes`,
        sharedAttributes: conn.shared_attributes,
        attrCount,
        width: Math.min(6, 1 + attrCount),
      },
      classes: 'connection-edge',
    });
  }

  return elements;
}

const stylesheet: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: 'node.process-node',
    style: {
      'shape': 'round-rectangle',
      'width': 'data(width)',
      'height': 'data(height)',
      'background-color': '#EEF2FF',
      'border-color': '#6366F1',
      'border-width': 2,
      'label': 'data(label)',
      'text-wrap': 'wrap' as any,
      'text-valign': 'center' as any,
      'text-halign': 'center' as any,
      'font-size': 11,
      'color': '#312E81',
      'font-weight': 600,
      'text-max-width': '160px',
    },
  },
  {
    selector: 'node.process-node:selected',
    style: {
      'border-color': '#4F46E5',
      'border-width': 3,
      'background-color': '#C7D2FE',
    },
  },
  {
    selector: 'edge.connection-edge',
    style: {
      'width': 'data(width)',
      'line-color': '#A5B4FC',
      'target-arrow-color': '#A5B4FC',
      'target-arrow-shape': 'triangle' as any,
      'curve-style': 'bezier' as any,
      'label': 'data(label)',
      'font-size': 9,
      'color': '#6366F1',
      'text-rotation': 'autorotate' as any,
      'text-margin-y': -10,
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.9,
      'text-background-padding': 3 as any,
    },
  },
  {
    selector: 'edge.connection-edge:selected',
    style: {
      'line-color': '#4F46E5',
      'target-arrow-color': '#4F46E5',
      'width': 4,
    },
  },
  {
    selector: '.hover-dimmed',
    style: { opacity: 0.2 },
  },
];

export function ProcessMapView() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { data, isLoading } = useProcessInterconnections();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [cyReady, setCyReady] = useState(false);

  const elements = useMemo(() => {
    if (!data) return [];
    return buildProcessMapElements(data);
  }, [data]);

  const layout = useMemo<cytoscape.LayoutOptions>(() => ({
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 60,
    rankSep: 120,
    edgeSep: 30,
    animate: true,
    animationDuration: 400,
  }), []);

  // Event handlers — depend on cyReady to ensure cy instance exists
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;

    const onNodeTap = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      setSelectedNode(node.data());
      setSelectedEdge(null);
    };

    const onEdgeTap = (evt: cytoscape.EventObject) => {
      const edge = evt.target;
      setSelectedEdge(edge.data());
      setSelectedNode(null);
    };

    const onBgTap = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    };

    const onMouseover = (evt: cytoscape.EventObject) => {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('hover-dimmed');
    };

    const onMouseout = () => {
      cy.elements().removeClass('hover-dimmed');
    };

    cy.on('tap', 'node', onNodeTap);
    cy.on('tap', 'edge', onEdgeTap);
    cy.on('tap', onBgTap);
    cy.on('mouseover', 'node', onMouseover);
    cy.on('mouseout', 'node', onMouseout);

    return () => {
      cy.off('tap', 'node', onNodeTap);
      cy.off('tap', 'edge', onEdgeTap);
      cy.off('tap', onBgTap);
      cy.off('mouseover', 'node', onMouseover);
      cy.off('mouseout', 'node', onMouseout);
    };
  }, [cyReady, elements]);

  const handleOpenProcess = (processId: string, processName: string) => {
    useNavigationStore.getState().openProcessDetail({
      attributeId: '',
      attributeName: '',
      processId,
      processName,
    });
  };

  const handleFocusAttribute = (attrId: string) => {
    useNavigationStore.getState().focusNodeInLineage(attrId);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Loading process interconnections...
      </div>
    );
  }

  if (!data || data.processes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Workflow className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No processes found. Create processes to see interconnections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">Process Map</span>
        </div>
        <span className="text-xs text-gray-500">How do processes connect through shared data?</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">
          {data.processes.length} processes · {data.connections.length} connections
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <CytoscapeContainer
          cyRef={cyRef}
          elements={elements}
          stylesheet={stylesheet}
          layout={layout}
          onReady={() => setCyReady(true)}
        />
        <ZoomControls cyRef={cyRef} />
        <Minimap cyRef={cyRef} />

        {/* Inspector Panel */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute right-4 top-4 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {selectedNode && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                    Process
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">{selectedNode.name}</span>
                </div>
                {selectedNode.description && (
                  <p className="text-xs text-gray-500">{selectedNode.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  {selectedNode.stepCount} steps
                </div>
                <button
                  onClick={() => handleOpenProcess(selectedNode.id, selectedNode.name)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                >
                  Open in Process Canvas
                </button>
              </div>
            )}
            {selectedEdge && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-900">Connection</span>
                </div>
                <div className="text-xs text-gray-500">
                  {selectedEdge.source} → {selectedEdge.target}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Shared Attributes ({selectedEdge.attrCount})</div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedEdge.sharedAttributes || []).map((attr: any) => (
                      <button
                        key={attr.id}
                        onClick={() => handleFocusAttribute(attr.id)}
                        className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                      >
                        {attr.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
