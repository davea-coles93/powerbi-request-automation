/**
 * Enhanced TMDL Table Parser
 * Parses all table metadata including hierarchies, annotations, etc.
 */

import {
  TmdlTable,
  TmdlMeasure,
  TmdlColumn,
  TmdlHierarchy,
  TmdlHierarchyLevel,
  TmdlAnnotation,
  TmdlColumnVariation,
} from '../types.js';

export async function parseTableFile(content: string): Promise<TmdlTable | null> {
  const lines = content.split('\n');

  let tableName = '';
  let tableLineageTag = '';
  let tableIsHidden = false;
  const measures: TmdlMeasure[] = [];
  const columns: TmdlColumn[] = [];
  const hierarchies: TmdlHierarchy[] = [];
  const tableAnnotations: TmdlAnnotation[] = [];

  let currentMeasure: Partial<TmdlMeasure> | null = null;
  let currentColumn: Partial<TmdlColumn> | null = null;
  let currentHierarchy: Partial<TmdlHierarchy> | null = null;
  let currentHierarchyLevel: Partial<TmdlHierarchyLevel> | null = null;

  let inMultilineExpression = false;
  let expressionLines: string[] = [];
  let indentLevel = 0;
  let inVariation = false;
  let currentVariation: Partial<TmdlColumnVariation> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Calculate indent level
    const currentIndent = line.match(/^\t*/)?.[0].length || 0;

    // Table declaration
    if (trimmed.startsWith('table ')) {
      const quotedMatch = trimmed.match(/table\s+'([^']+)'/);
      const unquotedMatch = trimmed.match(/table\s+(\S+)/);
      if (quotedMatch) {
        tableName = quotedMatch[1];
      } else if (unquotedMatch) {
        tableName = unquotedMatch[1];
      }
      indentLevel = currentIndent;
      continue;
    }

    // Table-level properties
    if (currentIndent === indentLevel + 1 && !currentMeasure && !currentColumn && !currentHierarchy) {
      if (trimmed.startsWith('lineageTag:')) {
        tableLineageTag = trimmed.replace('lineageTag:', '').trim();
        continue;
      }
      if (trimmed === 'isHidden') {
        tableIsHidden = true;
        continue;
      }
      if (trimmed.startsWith('annotation ')) {
        const annMatch = trimmed.match(/annotation\s+(\S+)\s*=\s*(.+)/);
        if (annMatch) {
          tableAnnotations.push({ name: annMatch[1], value: annMatch[2] });
        }
        continue;
      }
    }

    // Measure declaration
    if (trimmed.startsWith('measure ')) {
      // Save previous measure
      if (currentMeasure && currentMeasure.name) {
        if (inMultilineExpression) {
          currentMeasure.expression = expressionLines.join('\n').trim();
        }
        measures.push(currentMeasure as TmdlMeasure);
      }

      const measureMatch = trimmed.match(/measure\s+'([^']+)'\s*=\s*(.*)/);
      if (measureMatch) {
        const expression = measureMatch[2].trim();

        if (expression.startsWith('```')) {
          currentMeasure = {
            name: measureMatch[1],
            expression: '',
            lineageTag: '',
            annotations: [],
          };
          inMultilineExpression = true;
          expressionLines = [];
        } else {
          currentMeasure = {
            name: measureMatch[1],
            expression: expression,
            lineageTag: '',
            annotations: [],
          };
          inMultilineExpression = false;
        }
      }
      continue;
    }

    // Inside multiline expression
    if (inMultilineExpression && currentMeasure) {
      if (trimmed === '```') {
        inMultilineExpression = false;
        currentMeasure.expression = expressionLines.join('\n').trim();
      } else {
        expressionLines.push(line.replace(/^\t+/, ''));
      }
      continue;
    }

    // Measure properties
    if (currentMeasure && !inMultilineExpression) {
      if (trimmed.startsWith('lineageTag:')) {
        currentMeasure.lineageTag = trimmed.replace('lineageTag:', '').trim();
      } else if (trimmed.startsWith('formatString:')) {
        currentMeasure.formatString = trimmed.replace('formatString:', '').trim().replace(/^"|"$/g, '');
      } else if (trimmed.startsWith('displayFolder:')) {
        currentMeasure.displayFolder = trimmed.replace('displayFolder:', '').trim().replace(/^"|"$/g, '');
      } else if (trimmed.startsWith('dataCategory:')) {
        currentMeasure.dataCategory = trimmed.replace('dataCategory:', '').trim();
      } else if (trimmed === 'isHidden') {
        currentMeasure.isHidden = true;
      } else if (trimmed.startsWith('/// ')) {
        currentMeasure.description = trimmed.replace('///', '').trim();
      } else if (trimmed.startsWith('annotation ')) {
        const annMatch = trimmed.match(/annotation\s+(\S+)\s*=\s*(.+)/);
        if (annMatch && currentMeasure.annotations) {
          currentMeasure.annotations.push({ name: annMatch[1], value: annMatch[2] });
        }
      }
      continue;
    }

    // Column declaration
    if (trimmed.startsWith('column ')) {
      // Save previous column
      if (currentColumn && currentColumn.name) {
        if (inVariation && Object.keys(currentVariation).length > 0) {
          currentColumn.variation = currentVariation as TmdlColumnVariation;
        }
        columns.push(currentColumn as TmdlColumn);
      }

      const columnMatch = trimmed.match(/column\s+'?([^'\s]+)'?/);
      if (columnMatch) {
        currentColumn = {
          name: columnMatch[1],
          dataType: 'string',
          lineageTag: '',
          annotations: [],
        };
        inVariation = false;
        currentVariation = {};
      }
      continue;
    }

    // Column properties
    if (currentColumn) {
      if (trimmed.startsWith('dataType:')) {
        currentColumn.dataType = trimmed.replace('dataType:', '').trim();
      } else if (trimmed.startsWith('sourceColumn:')) {
        currentColumn.sourceColumn = trimmed.replace('sourceColumn:', '').trim();
      } else if (trimmed === 'isHidden') {
        currentColumn.isHidden = true;
      } else if (trimmed.startsWith('formatString:')) {
        currentColumn.formatString = trimmed.replace('formatString:', '').trim();
      } else if (trimmed.startsWith('dataCategory:')) {
        currentColumn.dataCategory = trimmed.replace('dataCategory:', '').trim();
      } else if (trimmed.startsWith('summarizeBy:')) {
        currentColumn.summarizeBy = trimmed.replace('summarizeBy:', '').trim();
      } else if (trimmed.startsWith('sortByColumn:')) {
        currentColumn.sortByColumn = trimmed.replace('sortByColumn:', '').trim();
      } else if (trimmed.startsWith('displayFolder:')) {
        currentColumn.displayFolder = trimmed.replace('displayFolder:', '').trim().replace(/^"|"$/g, '');
      } else if (trimmed.startsWith('lineageTag:')) {
        currentColumn.lineageTag = trimmed.replace('lineageTag:', '').trim();
      } else if (trimmed.startsWith('annotation ')) {
        const annMatch = trimmed.match(/annotation\s+(\S+)\s*=\s*(.+)/);
        if (annMatch && currentColumn.annotations) {
          currentColumn.annotations.push({ name: annMatch[1], value: annMatch[2] });
        }
      } else if (trimmed.startsWith('variation ')) {
        inVariation = true;
      } else if (inVariation) {
        if (trimmed === 'isDefault') {
          currentVariation.isDefault = true;
        } else if (trimmed.startsWith('relationship:')) {
          currentVariation.relationship = trimmed.replace('relationship:', '').trim();
        } else if (trimmed.startsWith('defaultHierarchy:')) {
          const hierMatch = trimmed.match(/defaultHierarchy:\s*(.+)/);
          if (hierMatch) {
            currentVariation.defaultHierarchy = hierMatch[1].trim().replace(/^'|'$/g, '');
          }
        }
      }
      continue;
    }

    // Hierarchy declaration
    if (trimmed.startsWith('hierarchy ')) {
      // Save previous hierarchy
      if (currentHierarchy && currentHierarchy.name) {
        hierarchies.push(currentHierarchy as TmdlHierarchy);
      }

      const hierMatch = trimmed.match(/hierarchy\s+'([^']+)'/);
      if (hierMatch) {
        currentHierarchy = {
          name: hierMatch[1],
          lineageTag: '',
          levels: [],
        };
        currentHierarchyLevel = null;
      }
      continue;
    }

    // Hierarchy properties
    if (currentHierarchy) {
      if (trimmed.startsWith('lineageTag:')) {
        currentHierarchy.lineageTag = trimmed.replace('lineageTag:', '').trim();
      } else if (trimmed === 'isHidden') {
        currentHierarchy.isHidden = true;
      } else if (trimmed.startsWith('displayFolder:')) {
        currentHierarchy.displayFolder = trimmed.replace('displayFolder:', '').trim().replace(/^"|"$/g, '');
      } else if (trimmed.startsWith('level ')) {
        // Save previous level
        if (currentHierarchyLevel && currentHierarchyLevel.name && currentHierarchy.levels) {
          currentHierarchy.levels.push(currentHierarchyLevel as TmdlHierarchyLevel);
        }

        const levelMatch = trimmed.match(/level\s+(.+)/);
        if (levelMatch) {
          currentHierarchyLevel = {
            name: levelMatch[1].trim(),
            column: '',
            lineageTag: '',
          };
        }
      } else if (currentHierarchyLevel) {
        if (trimmed.startsWith('column:')) {
          currentHierarchyLevel.column = trimmed.replace('column:', '').trim();
        } else if (trimmed.startsWith('lineageTag:')) {
          currentHierarchyLevel.lineageTag = trimmed.replace('lineageTag:', '').trim();
        } else if (trimmed.startsWith('ordinal:')) {
          currentHierarchyLevel.ordinal = parseInt(trimmed.replace('ordinal:', '').trim());
        }
      }
      continue;
    }
  }

  // Save last measure
  if (currentMeasure && currentMeasure.name) {
    if (inMultilineExpression) {
      currentMeasure.expression = expressionLines.join('\n').trim();
    }
    measures.push(currentMeasure as TmdlMeasure);
  }

  // Save last column
  if (currentColumn && currentColumn.name) {
    if (inVariation && Object.keys(currentVariation).length > 0) {
      currentColumn.variation = currentVariation as TmdlColumnVariation;
    }
    columns.push(currentColumn as TmdlColumn);
  }

  // Save last hierarchy level
  if (currentHierarchyLevel && currentHierarchyLevel.name && currentHierarchy && currentHierarchy.levels) {
    currentHierarchy.levels.push(currentHierarchyLevel as TmdlHierarchyLevel);
  }

  // Save last hierarchy
  if (currentHierarchy && currentHierarchy.name) {
    hierarchies.push(currentHierarchy as TmdlHierarchy);
  }

  if (!tableName) return null;

  return {
    name: tableName,
    lineageTag: tableLineageTag,
    isHidden: tableIsHidden,
    measures,
    columns,
    hierarchies,
    annotations: tableAnnotations,
  };
}
