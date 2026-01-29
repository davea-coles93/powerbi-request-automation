/**
 * Tools for managing visuals in Power BI reports
 */

import { ReportParser } from '../parsers/report-parser.js';
import {
  VisualContainer,
  VisualPosition,
  VisualType,
  VisualQuery,
  FieldExpression,
  QueryProjection,
} from '../types/index.js';

const parser = new ReportParser();

export async function listVisuals(reportPath: string, pageName: string) {
  const visuals = await parser.getPageVisuals(reportPath, pageName);

  return {
    pageName,
    totalVisuals: visuals.length,
    visuals: visuals.map(v => ({
      containerName: v.name,
      visualType: v.visual.visualType,
      position: v.position,
      hasQuery: !!v.visual.query,
      hasTitle: !!v.visual.visualContainerObjects?.title,
    })),
  };
}

export async function getVisual(reportPath: string, pageName: string, containerName: string) {
  const visual = await parser.getVisual(reportPath, pageName, containerName);

  if (!visual) {
    throw new Error(`Visual ${containerName} not found on page ${pageName}`);
  }

  return visual;
}

export async function createVisual(
  reportPath: string,
  pageName: string,
  visualType: VisualType,
  position: VisualPosition,
  query?: Partial<VisualQuery>,
  title?: string,
  containerName?: string
) {
  // Get next container name if not provided
  if (!containerName) {
    containerName = await parser.getNextContainerName(reportPath, pageName);
  }

  const visual: VisualContainer = {
    $schema:
      'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.5.0/schema.json',
    name: containerName,
    position: {
      ...position,
      tabOrder: position.tabOrder || 0,
    },
    visual: {
      visualType,
      ...(query && { query }),
      objects: {},
      visualContainerObjects: {},
    },
  };

  // Add title if provided
  if (title) {
    visual.visual.visualContainerObjects!.title = [
      {
        properties: {
          show: {
            expr: {
              Literal: {
                Value: 'true',
              },
            },
          },
          text: {
            expr: {
              Literal: {
                Value: `'${title}'`,
              },
            },
          },
        },
      },
    ];
  }

  await parser.saveVisual(reportPath, pageName, containerName, visual);

  return {
    success: true,
    pageName,
    containerName,
    visualType,
    position,
  };
}

export async function updateVisual(
  reportPath: string,
  pageName: string,
  containerName: string,
  updates: {
    position?: VisualPosition;
    query?: Partial<VisualQuery>;
    objects?: Record<string, any[]>;
    title?: string;
  }
) {
  const visual = await parser.getVisual(reportPath, pageName, containerName);

  if (!visual) {
    throw new Error(`Visual ${containerName} not found on page ${pageName}`);
  }

  // Update position
  if (updates.position) {
    visual.position = { ...visual.position, ...updates.position };
  }

  // Update query
  if (updates.query) {
    visual.visual.query = { ...visual.visual.query, ...updates.query };
  }

  // Update objects
  if (updates.objects) {
    visual.visual.objects = { ...visual.visual.objects, ...updates.objects };
  }

  // Update title
  if (updates.title !== undefined) {
    if (!visual.visual.visualContainerObjects) {
      visual.visual.visualContainerObjects = {};
    }
    visual.visual.visualContainerObjects.title = [
      {
        properties: {
          show: {
            expr: {
              Literal: {
                Value: 'true',
              },
            },
          },
          text: {
            expr: {
              Literal: {
                Value: `'${updates.title}'`,
              },
            },
          },
        },
      },
    ];
  }

  await parser.saveVisual(reportPath, pageName, containerName, visual);

  return {
    success: true,
    containerName,
    updated: Object.keys(updates),
  };
}

export async function deleteVisual(reportPath: string, pageName: string, containerName: string) {
  const visual = await parser.getVisual(reportPath, pageName, containerName);

  if (!visual) {
    throw new Error(`Visual ${containerName} not found on page ${pageName}`);
  }

  await parser.deleteVisual(reportPath, pageName, containerName);

  return {
    success: true,
    deletedVisual: containerName,
    pageName,
  };
}

export async function moveVisual(
  reportPath: string,
  pageName: string,
  containerName: string,
  x: number,
  y: number,
  width?: number,
  height?: number
) {
  const visual = await parser.getVisual(reportPath, pageName, containerName);

  if (!visual) {
    throw new Error(`Visual ${containerName} not found on page ${pageName}`);
  }

  visual.position.x = x;
  visual.position.y = y;
  if (width !== undefined) visual.position.width = width;
  if (height !== undefined) visual.position.height = height;

  await parser.saveVisual(reportPath, pageName, containerName, visual);

  return {
    success: true,
    containerName,
    position: visual.position,
  };
}

// Helper function to create field expression
export function createFieldExpression(entity: string, property: string): FieldExpression {
  return {
    Column: {
      Expression: {
        SourceRef: {
          Entity: entity,
        },
      },
      Property: property,
    },
  };
}

// Helper function to create query projection
export function createQueryProjection(
  entity: string,
  property: string,
  role: string,
  aggregation?: number
): QueryProjection {
  if (aggregation !== undefined) {
    // Map aggregation function numbers to names
    const aggFunctions = ['Sum', 'Avg', 'Min', 'Max', 'Count', 'CountNonNull', 'StandardDeviation', 'Variance'];
    const aggName = aggFunctions[aggregation] || 'Sum';

    return {
      field: {
        Aggregation: {
          Expression: createFieldExpression(entity, property),
          Function: aggregation,
        },
      },
      queryRef: `${aggName}(${entity}.${property})`,
    };
  }

  return {
    field: createFieldExpression(entity, property),
    queryRef: `${entity}.${property}`,
  };
}

// Create common visual types with proper query structure
export async function createCardVisual(
  reportPath: string,
  pageName: string,
  measureEntity: string,
  measureProperty: string,
  position: VisualPosition,
  title?: string
) {
  const query: Partial<VisualQuery> = {
    queryState: {
      Values: {
        projections: [createQueryProjection(measureEntity, measureProperty, 'Values', 0)], // 0 = Sum
      },
    },
  };

  return createVisual(reportPath, pageName, 'card', position, query, title);
}

export async function createTableVisual(
  reportPath: string,
  pageName: string,
  columns: Array<{ entity: string; property: string }>,
  position: VisualPosition,
  title?: string
) {
  const query: Partial<VisualQuery> = {
    queryState: {
      Values: {
        projections: columns.map(col => createQueryProjection(col.entity, col.property, 'Values')),
      },
    },
  };

  return createVisual(reportPath, pageName, 'table', position, query, title);
}

export async function createBarChartVisual(
  reportPath: string,
  pageName: string,
  categoryEntity: string,
  categoryProperty: string,
  valueEntity: string,
  valueProperty: string,
  position: VisualPosition,
  aggregation: number = 0, // 0 = Sum
  title?: string
) {
  const query: Partial<VisualQuery> = {
    queryState: {
      Category: {
        projections: [createQueryProjection(categoryEntity, categoryProperty, 'Category')],
      },
      Y: {
        projections: [createQueryProjection(valueEntity, valueProperty, 'Y', aggregation)],
      },
    },
  };

  return createVisual(reportPath, pageName, 'barChart', position, query, title);
}
