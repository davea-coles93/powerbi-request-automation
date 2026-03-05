/**
 * Build Cytoscape elements for the Schema view.
 *
 * Nodes are arranged in horizontal layers by entity type with fixed Y positions
 * so the graph can use the 'preset' layout.
 */

interface SchemaData {
  metrics: any[];
  measures: any[];
  attributes: any[];
  entities: any[];
  systems: any[];
}

const LAYER_Y: Record<string, number> = {
  metric: 0,
  measure: 350,
  attribute: 700,
  entity: 1050,
  system: 1400,
};

const H_SPACING = 320;
const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function buildLayerNodes(
  items: any[],
  entityType: string,
  nameField: string = 'name',
): any[] {
  const y = LAYER_Y[entityType];
  return items.map((item, idx) => {
    const name = item[nameField] || item.id;
    const desc = item.description ? `\n${truncate(item.description, 60)}` : '';
    return {
      data: {
        id: item.id,
        name,
        label: `${name}${desc}`,
        entityType,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        ...item,
      },
      position: {
        x: idx * H_SPACING,
        y,
      },
      classes: `${entityType}-node`,
    };
  });
}

export function buildSchemaElements(data: SchemaData): any[] {
  const elements: any[] = [];

  // --- Nodes ---
  elements.push(...buildLayerNodes(data.metrics, 'metric'));
  elements.push(...buildLayerNodes(data.measures, 'measure'));
  elements.push(...buildLayerNodes(data.attributes, 'attribute'));
  elements.push(...buildLayerNodes(data.entities, 'entity'));
  elements.push(...buildLayerNodes(data.systems, 'system'));

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
          },
          classes: 'schema-edge',
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
          },
          classes: 'schema-edge',
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
        },
        classes: 'schema-edge',
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
        },
        classes: 'schema-edge',
      });
    }
  }

  return elements;
}
