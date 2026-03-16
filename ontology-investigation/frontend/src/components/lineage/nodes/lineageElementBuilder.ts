/**
 * Enhanced Cytoscape element builder for the Lineage view.
 *
 * Supports entity-centric collapsed view where attributes are hidden inside
 * entity nodes by default, with upward data flow directionality
 * (System → Entity → Attribute → Measure → Metric).
 *
 * Data journey cost data is shown on system→attribute edges (or aggregated
 * system→entity edges when entities are collapsed).
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

function buildLabel(entityType: string, item: any, suffix?: string): string {
  const config = entityTypeConfig[entityType];
  const icon = config?.icon ?? '';
  const name = truncate(item.name || item.id, suffix ? 18 : 24);
  return suffix ? `${icon} ${name} ${suffix}` : `${icon} ${name}`;
}

export function buildNodes(items: any[], entityType: string, startIndex: number, extraData?: Record<string, any>): any[] {
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
        ...(extraData || {}),
      },
      position: {
        x: col * GRID_SPACING,
        y: row * GRID_SPACING,
      },
      classes: `${entityType}-node${item.state === 'to-be' ? ' to-be-node' : ''}`,
    };
  });
}


function getCostSeverityClass(manualEffortPct: number): string {
  if (manualEffortPct > 70) return 'cost-high';
  if (manualEffortPct >= 30) return 'cost-medium';
  return 'cost-low';
}

/** Aggregate multiple cost summaries into one. */
function aggregateCosts(costs: CrystallisationCostSummary[]): CrystallisationCostSummary {
  let totalDuration = 0;
  let weightedManualSum = 0;
  let totalWeightedDuration = 0;
  const allWaste = new Set<string>();
  const allProcesses = new Set<string>();
  let totalSwitches = 0;

  const allProcessIds = new Set<string>();

  for (const c of costs) {
    totalDuration += c.total_duration_minutes;
    const dur = c.total_duration_minutes || 1;
    weightedManualSum += c.weighted_manual_effort_pct * dur;
    totalWeightedDuration += dur;
    totalSwitches += c.system_switch_count;
    for (const w of c.waste_categories) allWaste.add(w);
    for (const p of c.process_names) allProcesses.add(p);
    for (const p of (c.process_ids || [])) allProcessIds.add(p);
  }

  return {
    total_duration_minutes: totalDuration,
    weighted_manual_effort_pct: totalWeightedDuration > 0
      ? Math.round(weightedManualSum / totalWeightedDuration)
      : 0,
    system_switch_count: totalSwitches,
    waste_categories: Array.from(allWaste),
    process_names: Array.from(allProcesses),
    process_ids: Array.from(allProcessIds),
  };
}

export function buildLineageElements(
  data: LineageData,
  crystallisationCosts?: Record<string, CrystallisationCostSummary>,
  expandedEntities?: Set<string>,
  measureCosts?: Record<string, CrystallisationCostSummary>,
  metricCosts?: Record<string, CrystallisationCostSummary>,
): any[] {
  const elements: any[] = [];

  // Build lookup: entityId → attributes belonging to it
  const entityAttrMap = new Map<string, any[]>();
  for (const attr of data.attributes) {
    const eid = attr.entity_id || attr.entity;
    if (eid) {
      if (!entityAttrMap.has(eid)) entityAttrMap.set(eid, []);
      entityAttrMap.get(eid)!.push(attr);
    }
  }

  // Orphan attributes (no entity)
  const orphanAttrs = data.attributes.filter((a) => {
    const eid = a.entity_id || a.entity;
    return !eid;
  });

  // --- Nodes ---
  let offset = 0;

  // Metrics & Measures — always shown
  elements.push(...buildNodes(data.metrics, 'metric', offset));
  offset += data.metrics.length;
  elements.push(...buildNodes(data.measures, 'measure', offset));
  offset += data.measures.length;

  // Orphan attributes — always shown as standalone
  elements.push(...buildNodes(orphanAttrs, 'attribute', offset));
  offset += orphanAttrs.length;

  // Entity nodes — always shown (with collapsed/expanded state)
  for (const entity of data.entities) {
    const isExpanded = expandedEntities?.has(entity.id) ?? false;
    const attrCount = entityAttrMap.get(entity.id)?.length ?? 0;
    const suffix = !isExpanded && attrCount > 0 ? `(${attrCount})` : '';
    const globalIdx = offset;
    const col = globalIdx % GRID_COLS;
    const row = Math.floor(globalIdx / GRID_COLS);

    elements.push({
      data: {
        id: entity.id,
        name: entity.name || entity.id,
        label: buildLabel('entity', entity, suffix || undefined),
        entityType: 'entity',
        width: isExpanded ? NODE_WIDTH + 40 : NODE_WIDTH,
        height: isExpanded ? NODE_HEIGHT + 20 : NODE_HEIGHT,
        isExpanded,
        attrCount,
        attributeRefs: (entityAttrMap.get(entity.id) || []).map((a) => ({ id: a.id, name: a.name || a.id })),
        ...entity,
      },
      position: { x: col * GRID_SPACING, y: row * GRID_SPACING },
      classes: `entity-node ${isExpanded ? 'entity-node-expanded' : 'entity-node-collapsed'}${entity.state === 'to-be' ? ' to-be-node' : ''}`,
    });
    offset++;

    // Expanded: emit child attribute nodes with parent
    if (isExpanded) {
      const attrs = entityAttrMap.get(entity.id) || [];
      for (const attr of attrs) {
        const aIdx = offset;
        const aCol = aIdx % GRID_COLS;
        const aRow = Math.floor(aIdx / GRID_COLS);
        elements.push({
          data: {
            id: attr.id,
            name: attr.name || attr.id,
            label: buildLabel('attribute', attr),
            entityType: 'attribute',
            width: NODE_WIDTH - 20,
            height: NODE_HEIGHT - 4,
            parent: entity.id,
            ...attr,
          },
          position: { x: aCol * GRID_SPACING, y: aRow * GRID_SPACING },
          classes: `attribute-node${attr.state === 'to-be' ? ' to-be-node' : ''}`,
        });
        offset++;
      }
    }
  }

  // Systems — always shown
  elements.push(...buildNodes(data.systems, 'system', offset));

  // Build lookup sets for fast existence checks
  const nodeIds = new Set(elements.map((el: any) => el.data.id));

  // Track which entities are expanded for edge routing
  const expandedSet = expandedEntities ?? new Set<string>();

  // --- Edges (data flows upward: System → Entity → Attribute → Measure → Metric) ---

  // Measure → Metric (data flows up) — with optional analysis cost
  for (const metric of data.metrics) {
    const measureIds: string[] = metric.calculated_by_measure_ids || [];
    for (const mId of measureIds) {
      if (nodeIds.has(mId)) {
        const costData = metricCosts?.[metric.id];
        const edgeClasses = ['edge-metric-measure'];
        const edgeData: any = {
          id: `e-${mId}-${metric.id}`,
          source: mId,
          target: metric.id,
          edgeType: 'metric-measure',
          costType: 'analysis',
          label: 'feeds',
        };

        if (costData) {
          edgeClasses.push('crystallisation-edge');
          edgeClasses.push(getCostSeverityClass(costData.weighted_manual_effort_pct));
          edgeData.total_duration_minutes = costData.total_duration_minutes;
          edgeData.weighted_manual_effort_pct = costData.weighted_manual_effort_pct;
          edgeData.system_switch_count = costData.system_switch_count;
          edgeData.waste_categories = costData.waste_categories;
          edgeData.process_names = costData.process_names;
          edgeData.process_ids = costData.process_ids || [];
          edgeData.metricId = metric.id;
          edgeData.label = `${formatDurationCompact(costData.total_duration_minutes)} | ${Math.round(costData.weighted_manual_effort_pct)}% manual`;
        }

        elements.push({ data: edgeData, classes: edgeClasses.join(' ') });
      }
    }
  }

  // Attribute/Entity → Measure (data flows up)
  // When entity collapsed: aggregate to entity→measure edges
  // When expanded: individual attribute→measure edges
  const emittedEntityMeasureEdges = new Set<string>();

  for (const measure of data.measures) {
    const attrIds: string[] = measure.input_attribute_ids || [];
    for (const aId of attrIds) {
      // Find the entity this attribute belongs to
      const attr = data.attributes.find((a) => a.id === aId);
      const entityId = attr ? (attr.entity_id || attr.entity) : null;

      if (entityId && !expandedSet.has(entityId)) {
        // Collapsed: route edge to entity
        if (nodeIds.has(entityId)) {
          const edgeKey = `${entityId}-${measure.id}`;
          if (!emittedEntityMeasureEdges.has(edgeKey)) {
            emittedEntityMeasureEdges.add(edgeKey);
            const costData = measureCosts?.[measure.id];
            const edgeClasses = ['edge-measure-attribute'];
            const edgeData: any = {
              id: `e-${entityId}-${measure.id}`,
              source: entityId,
              target: measure.id,
              edgeType: 'measure-entity',
              costType: 'measurement',
              label: 'feeds',
            };

            if (costData) {
              edgeClasses.push('crystallisation-edge');
              edgeClasses.push(getCostSeverityClass(costData.weighted_manual_effort_pct));
              edgeData.total_duration_minutes = costData.total_duration_minutes;
              edgeData.weighted_manual_effort_pct = costData.weighted_manual_effort_pct;
              edgeData.system_switch_count = costData.system_switch_count;
              edgeData.waste_categories = costData.waste_categories;
              edgeData.process_names = costData.process_names;
              edgeData.process_ids = costData.process_ids || [];
              edgeData.measureId = measure.id;
              edgeData.label = `${formatDurationCompact(costData.total_duration_minutes)} | ${Math.round(costData.weighted_manual_effort_pct)}% manual`;
            }

            elements.push({ data: edgeData, classes: edgeClasses.join(' ') });
          }
        }
      } else {
        // Expanded or orphan: route edge to attribute directly
        if (nodeIds.has(aId)) {
          const costData = measureCosts?.[measure.id];
          const edgeClasses = ['edge-measure-attribute'];
          const edgeData: any = {
            id: `e-${aId}-${measure.id}`,
            source: aId,
            target: measure.id,
            edgeType: 'measure-attribute',
            costType: 'measurement',
            label: 'feeds',
          };

          if (costData) {
            edgeClasses.push('crystallisation-edge');
            edgeClasses.push(getCostSeverityClass(costData.weighted_manual_effort_pct));
            edgeData.total_duration_minutes = costData.total_duration_minutes;
            edgeData.weighted_manual_effort_pct = costData.weighted_manual_effort_pct;
            edgeData.system_switch_count = costData.system_switch_count;
            edgeData.waste_categories = costData.waste_categories;
            edgeData.process_names = costData.process_names;
            edgeData.process_ids = costData.process_ids || [];
            edgeData.measureId = measure.id;
            edgeData.label = `${formatDurationCompact(costData.total_duration_minutes)} | ${Math.round(costData.weighted_manual_effort_pct)}% manual`;
          }

          elements.push({ data: edgeData, classes: edgeClasses.join(' ') });
        }
      }
    }
  }

  // System → Attribute/Entity (data flows up, with cost enrichment)
  // When entity collapsed: aggregate to system→entity edges with rolled-up costs
  // When expanded: individual system→attribute edges
  const entitySystemCosts = new Map<string, { costs: CrystallisationCostSummary[]; attrIds: string[] }>();

  for (const attr of data.attributes) {
    const sysId = attr.source_system_id || attr.system_id;
    if (!sysId || !nodeIds.has(sysId)) continue;

    const entityId = attr.entity_id || attr.entity;
    const isExpanded = entityId ? expandedSet.has(entityId) : true;

    if (!isExpanded && entityId && nodeIds.has(entityId)) {
      // Collapsed: accumulate costs for system→entity aggregated edge
      const key = `${sysId}-${entityId}`;
      if (!entitySystemCosts.has(key)) {
        entitySystemCosts.set(key, { costs: [], attrIds: [] });
      }
      const entry = entitySystemCosts.get(key)!;
      entry.attrIds.push(attr.id);
      const costData = crystallisationCosts?.[attr.id];
      if (costData) entry.costs.push(costData);
    } else {
      // Expanded or orphan: emit individual system→attribute edge
      const costData = crystallisationCosts?.[attr.id];
      const edgeClasses = ['edge-attribute-system'];
      const edgeData: any = {
        id: `e-${sysId}-${attr.id}`,
        source: sysId,
        target: attr.id,
        edgeType: 'attribute-system',
        costType: 'capture',
        label: 'provides',
      };

      if (costData) {
        edgeClasses.push('crystallisation-edge');
        edgeClasses.push(getCostSeverityClass(costData.weighted_manual_effort_pct));
        edgeData.total_duration_minutes = costData.total_duration_minutes;
        edgeData.weighted_manual_effort_pct = costData.weighted_manual_effort_pct;
        edgeData.system_switch_count = costData.system_switch_count;
        edgeData.waste_categories = costData.waste_categories;
        edgeData.process_names = costData.process_names;
        edgeData.process_ids = costData.process_ids || [];
        edgeData.attributeId = attr.id;
        edgeData.label = `${formatDurationCompact(costData.total_duration_minutes)} | ${Math.round(costData.weighted_manual_effort_pct)}% manual`;
      }

      if (nodeIds.has(attr.id)) {
        elements.push({ data: edgeData, classes: edgeClasses.join(' ') });
      }
    }
  }

  // Emit aggregated system→entity edges
  for (const [key, { costs, attrIds }] of entitySystemCosts) {
    const [sysId, entityId] = key.split('-');
    const edgeClasses = ['edge-attribute-system'];
    const edgeData: any = {
      id: `e-${key}`,
      source: sysId,
      target: entityId,
      edgeType: 'system-entity',
      costType: 'capture',
      label: 'provides',
      aggregatedAttrIds: attrIds,
    };

    if (costs.length > 0) {
      const agg = aggregateCosts(costs);
      edgeClasses.push('crystallisation-edge');
      edgeClasses.push(getCostSeverityClass(agg.weighted_manual_effort_pct));
      edgeData.total_duration_minutes = agg.total_duration_minutes;
      edgeData.weighted_manual_effort_pct = agg.weighted_manual_effort_pct;
      edgeData.system_switch_count = agg.system_switch_count;
      edgeData.waste_categories = agg.waste_categories;
      edgeData.process_names = agg.process_names;
      edgeData.process_ids = agg.process_ids || [];
      edgeData.label = `${formatDurationCompact(agg.total_duration_minutes)} | ${Math.round(agg.weighted_manual_effort_pct)}% manual`;
    }

    elements.push({ data: edgeData, classes: edgeClasses.join(' ') });
  }

  return elements;
}
