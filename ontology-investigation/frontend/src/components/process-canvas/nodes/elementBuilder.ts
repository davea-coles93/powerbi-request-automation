export interface FlowNode {
  id: string;
  label: string;
  sequence: number;
  perspective_id: string;
  actor?: string;
  has_sub_steps?: boolean;
  estimated_duration_minutes?: number;
  automation_potential?: string;
  waste_category?: string;
  manual_effort_percentage?: number;
  produces_attribute_ids?: string[];
  consumes_attribute_ids?: string[];
  uses_metric_ids?: string[];
  systems_used_ids?: string[];
  crystallizes_attribute_ids?: string[];
}

export interface FlowEdge {
  source: string;
  target: string;
}

export interface ProcessFlow {
  process: { id: string; name: string; description?: string };
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// Perspective lane Y positions for dagre layout initial placement
const laneYPositions: Record<string, number> = {
  operational: 150,
  management: 450,
  financial: 750,
};

export function buildElements(flow: ProcessFlow) {
  const cyElements: any[] = [];
  const horizontalSpacing = 300;
  const xStart = 200;

  // Group nodes by perspective
  const groups: Record<string, FlowNode[]> = {};
  for (const node of flow.nodes) {
    const pid = node.perspective_id || 'operational';
    if (!groups[pid]) groups[pid] = [];
    groups[pid].push(node);
  }

  // Sort each group by sequence
  for (const pid of Object.keys(groups)) {
    groups[pid].sort((a, b) => a.sequence - b.sequence);
  }

  // Create step nodes — NO compound parent nodes (free canvas)
  const perspectiveOrder = ['operational', 'management', 'financial'];
  for (const pid of perspectiveOrder) {
    const laneNodes = groups[pid] || [];
    const laneY = laneYPositions[pid] || 150;

    laneNodes.forEach((node, laneIndex) => {
      // Build rich label
      let labelText = node.label;
      if (node.has_sub_steps) labelText += ' ⤵';

      const badges: string[] = [];
      if (node.estimated_duration_minutes) {
        badges.push(`${node.estimated_duration_minutes}m`);
      }
      if (node.automation_potential) {
        badges.push(node.automation_potential);
      }
      if (node.waste_category) {
        const shortWaste = node.waste_category.split(' ').slice(0, 2).join(' ');
        badges.push(shortWaste);
      }
      if (badges.length > 0) {
        labelText += '\n' + badges.join(' · ');
      }
      if (node.actor) {
        labelText += '\n' + node.actor;
      }

      const classes = [
        'step-node',
        `${pid}-node`,
        node.has_sub_steps ? 'has-sub-steps' : '',
        node.automation_potential === 'High' ? 'automation-high' : '',
        node.automation_potential === 'Medium' ? 'automation-medium' : '',
      ].filter(Boolean).join(' ');

      cyElements.push({
        group: 'nodes',
        data: {
          id: node.id,
          name: node.label,
          label: labelText,
          actor: node.actor,
          sequence: node.sequence,
          perspective_id: pid,
          estimated_duration_minutes: node.estimated_duration_minutes,
          automation_potential: node.automation_potential,
          waste_category: node.waste_category,
          manual_effort_percentage: node.manual_effort_percentage,
          has_sub_steps: !!node.has_sub_steps,
          produces_attribute_ids: node.produces_attribute_ids || [],
          consumes_attribute_ids: node.consumes_attribute_ids || [],
          uses_metric_ids: node.uses_metric_ids || [],
          systems_used_ids: node.systems_used_ids || [],
        },
        position: {
          x: xStart + laneIndex * horizontalSpacing,
          y: laneY,
        },
        classes,
      });
    });
  }

  // Create edges
  const nodeMap = new Map(flow.nodes.map(n => [n.id, n]));
  flow.edges.forEach((edge, index) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    const isCrossPerspective = sourceNode && targetNode &&
      sourceNode.perspective_id !== targetNode.perspective_id;

    cyElements.push({
      group: 'edges',
      data: {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        sourcePerspective: sourceNode?.perspective_id,
        targetPerspective: targetNode?.perspective_id,
        label: isCrossPerspective ? 'handoff' : '',
      },
      classes: isCrossPerspective ? 'handoff-edge' : 'flow-edge',
    });
  });

  return cyElements;
}
