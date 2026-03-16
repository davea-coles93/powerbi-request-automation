/**
 * Build Cytoscape elements for the Schema view.
 *
 * Nodes are arranged in horizontal layers by entity type with fixed Y positions
 * so the graph can use the 'preset' layout. Each layer gets a floating label
 * node. Nodes include multi-line labels with type indicator, name, and subtitle.
 * Edges are typed and labeled to show relationship semantics.
 */

import { entityTypeConfig } from './entityTypeConfig';

interface SchemaData {
  metrics: any[];
  measures: any[];
  attributes: any[];
  entities: any[];
  systems: any[];
}

const LAYER_Y: Record<string, number> = {
  metric: 0,
  measure: 400,
  entity: 800,
  system: 1200,
  attribute: 1600,
};

const H_SPACING = 340;
const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/**
 * Build a rich multi-line label for a node.
 * Format:  [TYPE ICON]  Name
 *          subtitle info
 */
function buildLabel(entityType: string, item: any): string {
  const config = entityTypeConfig[entityType];
  const icon = config?.icon ?? '';
  const name = item.name || item.id;

  let subtitle = '';
  switch (entityType) {
    case 'metric':
      if (item.business_question) subtitle = truncate(item.business_question, 50);
      else if (item.description) subtitle = truncate(item.description, 50);
      break;
    case 'measure':
      if (item.formula) subtitle = truncate(item.formula, 50);
      else if (item.description) subtitle = truncate(item.description, 50);
      break;
    case 'attribute':
      if (item.data_type) subtitle = `Type: ${item.data_type}`;
      else if (item.description) subtitle = truncate(item.description, 50);
      break;
    case 'entity':
      if (item.description) subtitle = truncate(item.description, 50);
      break;
    case 'system':
      if (item.system_type) subtitle = item.system_type;
      else if (item.vendor) subtitle = item.vendor;
      break;
  }

  const lines = [`${icon}  ${name}`];
  if (subtitle) lines.push(subtitle);
  return lines.join('\n');
}

/** Per-type shapes for the Schema view to differentiate from Lineage's uniform roundrectangles. */
const SCHEMA_SHAPES: Record<string, string> = {
  metric: 'diamond',
  measure: 'hexagon',
  attribute: 'roundrectangle',
  entity: 'barrel',
  system: 'octagon',
};

function buildLayerNodes(
  items: any[],
  entityType: string,
): any[] {
  const y = LAYER_Y[entityType];
  const shape = SCHEMA_SHAPES[entityType] || 'roundrectangle';
  return items.map((item, idx) => ({
    data: {
      id: item.id,
      name: item.name || item.id,
      label: buildLabel(entityType, item),
      entityType,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      schemaShape: shape,
      ...item,
    },
    position: {
      x: idx * H_SPACING,
      y,
    },
    classes: `${entityType}-node schema-node schema-${entityType}`,
  }));
}

/** Floating label node positioned to the left of each layer. */
function buildLayerLabel(entityType: string, count: number): any {
  const config = entityTypeConfig[entityType];
  const y = LAYER_Y[entityType];
  return {
    data: {
      id: `__layer-${entityType}`,
      label: `${config?.icon ?? ''} ${config?.label ?? entityType} (${count})`,
      entityType: '__label',
      layerColor: config?.border ?? '#d1d5db',
    },
    position: { x: -250, y },
    classes: 'layer-label',
    selectable: false,
    grabbable: false,
  };
}

export function buildSchemaElements(data: SchemaData): any[] {
  const elements: any[] = [];

  // --- Layer label nodes (top-to-bottom: Metrics → Measures → Entities → Systems → Attributes) ---
  if (data.metrics.length > 0) elements.push(buildLayerLabel('metric', data.metrics.length));
  if (data.measures.length > 0) elements.push(buildLayerLabel('measure', data.measures.length));
  if (data.entities.length > 0) elements.push(buildLayerLabel('entity', data.entities.length));
  if (data.systems.length > 0) elements.push(buildLayerLabel('system', data.systems.length));
  if (data.attributes.length > 0) elements.push(buildLayerLabel('attribute', data.attributes.length));

  // --- Nodes ---
  elements.push(...buildLayerNodes(data.metrics, 'metric'));
  elements.push(...buildLayerNodes(data.measures, 'measure'));
  elements.push(...buildLayerNodes(data.entities, 'entity'));
  elements.push(...buildLayerNodes(data.systems, 'system'));
  elements.push(...buildLayerNodes(data.attributes, 'attribute'));

  // Build lookup sets for fast existence checks
  const nodeIds = new Set(elements.map((el: any) => el.data.id));

  // --- Edges ---

  // Metric -> Measures (via calculated_by_measure_ids)
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
          classes: 'edge-metric-measure schema-edge',
        });
      }
    }
  }

  // Measure -> Attributes (via input_attribute_ids)
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
          classes: 'edge-measure-attribute schema-edge',
        });
      }
    }
  }

  // Attribute -> Entity (via entity_id)
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
        classes: 'edge-attribute-entity schema-edge',
      });
    }
  }

  // Attribute -> System (via source_system_id)
  for (const attr of data.attributes) {
    const sysId = attr.source_system_id || attr.system_id;
    if (sysId && nodeIds.has(sysId)) {
      elements.push({
        data: {
          id: `e-${attr.id}-${sysId}`,
          source: attr.id,
          target: sysId,
          edgeType: 'attribute-system',
          label: 'sourced from',
        },
        classes: 'edge-attribute-system schema-edge',
      });
    }
  }

  return elements;
}
