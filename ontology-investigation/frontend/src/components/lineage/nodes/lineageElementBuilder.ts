/**
 * Enhanced Cytoscape element builder for the Lineage view.
 *
 * Extends the base lineage element builder with crystallisation cost data
 * on attribute-to-system edges, showing the operational burden of data
 * crystallisation pathways.
 */

import { entityTypeConfig } from '../../shared/canvas/entityTypeConfig';
import { formatDurationCompact } from '../../../utils/formatters';
import type { CrystallisationCostSummary } from '../../../types/ontology';

interface LineageData {
  metrics: any[];
  measures: any[];
  attributes: any[];
  entities: any[];
  systems: any[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const GRID_COLS = 8;
const GRID_SPACING = 200;

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function buildLabel(entityType: string, item: any): string {
  const config = entityTypeConfig[entityType];
  const icon = config?.icon ?? '';
  const name = truncate(item.name || item.id, 24);
  return `${icon} ${name}`;
}

export function buildNodes(items: any[], entityType: string, startIndex: number): any[] {
  return items.map((item, idx) => {
    const globalIdx = startIndex + idx;
    const col = globalIdx % GRID_COLS;
    const row = Math.floor(globalIdx / GRID_COLS);

    return {
      data: {
        id: item.id,
        name: item.name || item.id,
        label: buildLabel(entityType, item),
        entityType,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        ...item,
      },
      position: {
        x: col * GRID_SPACING,
        y: row * GRID_SPACING,
      },
      classes: `${entityType}-node`,
    };
  });
}


function getCostSeverityClass(manualEffortPct: number): string {
  if (manualEffortPct > 70) return 'cost-high';
  if (manualEffortPct >= 30) return 'cost-medium';
  return 'cost-low';
}

export function buildLineageElements(
  data: LineageData,
  crystallisationCosts?: Record<string, CrystallisationCostSummary>,
): any[] {
  const elements: any[] = [];

  // --- Nodes (flat grid, dagre will reposition) ---
  let offset = 0;
  elements.push(...buildNodes(data.metrics, 'metric', offset));
  offset += data.metrics.length;
  elements.push(...buildNodes(data.measures, 'measure', offset));
  offset += data.measures.length;
  elements.push(...buildNodes(data.attributes, 'attribute', offset));
  offset += data.attributes.length;
  elements.push(...buildNodes(data.entities, 'entity', offset));
  offset += data.entities.length;
  elements.push(...buildNodes(data.systems, 'system', offset));

  // Build lookup sets for fast existence checks
  const nodeIds = new Set(elements.map((el: any) => el.data.id));

  // --- Edges ---

  // Metric -> Measures
  for (const metric of data.metrics) {
    const measureIds: string[] = metric.calculated_by_measure_ids || [];
    for (const mId of measureIds) {
      if (nodeIds.has(mId)) {
        elements.push({
          data: {
            id: `e-${metric.id}-${mId}`,
            source: metric.id,
            target: mId,
            edgeType: 'metric-measure',
            label: 'calculated by',
          },
          classes: 'edge-metric-measure',
        });
      }
    }
  }

  // Measure -> Attributes
  for (const measure of data.measures) {
    const attrIds: string[] = measure.input_attribute_ids || [];
    for (const aId of attrIds) {
      if (nodeIds.has(aId)) {
        elements.push({
          data: {
            id: `e-${measure.id}-${aId}`,
            source: measure.id,
            target: aId,
            edgeType: 'measure-attribute',
            label: 'inputs',
          },
          classes: 'edge-measure-attribute',
        });
      }
    }
  }

  // Attribute -> Entity
  for (const attr of data.attributes) {
    const entityId = attr.entity_id || attr.entity;
    if (entityId && nodeIds.has(entityId)) {
      elements.push({
        data: {
          id: `e-${attr.id}-${entityId}`,
          source: attr.id,
          target: entityId,
          edgeType: 'attribute-entity',
          label: 'belongs to',
        },
        classes: 'edge-attribute-entity',
      });
    }
  }

  // Attribute -> System (with crystallisation cost enrichment)
  for (const attr of data.attributes) {
    const sysId = attr.source_system_id || attr.system_id;
    if (sysId && nodeIds.has(sysId)) {
      const costData = crystallisationCosts?.[attr.id];
      const edgeClasses = ['edge-attribute-system'];
      const edgeData: any = {
        id: `e-${attr.id}-${sysId}`,
        source: attr.id,
        target: sysId,
        edgeType: 'attribute-system',
        label: 'sourced from',
      };

      if (costData) {
        edgeClasses.push('crystallisation-edge');
        edgeClasses.push(getCostSeverityClass(costData.weighted_manual_effort_pct));

        edgeData.total_duration_minutes = costData.total_duration_minutes;
        edgeData.weighted_manual_effort_pct = costData.weighted_manual_effort_pct;
        edgeData.system_switch_count = costData.system_switch_count;
        edgeData.waste_categories = costData.waste_categories;
        edgeData.process_names = costData.process_names;
        edgeData.label = `${formatDurationCompact(costData.total_duration_minutes)} | ${Math.round(costData.weighted_manual_effort_pct)}% manual`;
      }

      elements.push({
        data: edgeData,
        classes: edgeClasses.join(' '),
      });
    }
  }

  return elements;
}
