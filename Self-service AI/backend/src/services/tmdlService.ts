/**
 * TMDL (Tabular Model Definition Language) Service
 *
 * Reads and writes TMDL files for PowerBI Projects (.pbip)
 * This enables git-based version control of PowerBI models.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { validatePath } from '../utils/validation';

// Generate UUID v4
function uuidv4(): string {
  return crypto.randomUUID();
}

export interface TmdlMeasure {
  name: string;
  expression: string;
  formatString?: string;
  description?: string;
  lineageTag: string;
  annotations?: Record<string, string>;
}

export interface TmdlTable {
  name: string;
  lineageTag: string;
  measures: TmdlMeasure[];
  columns?: string[];
}

export interface TmdlModel {
  name: string;
  tables: TmdlTable[];
  relationships?: unknown[];
}

export interface TmdlProject {
  projectPath: string;
  semanticModelPath: string;
  reportPath: string;
  model: TmdlModel;
}

export class TmdlService {
  private basePath: string;

  constructor(basePath?: string) {
    // Set base path for validation (models directory)
    this.basePath = basePath || path.join(__dirname, '../../models');
  }

  /**
   * Load a PBIP project
   */
  async loadProject(pbipPath: string): Promise<TmdlProject> {
    // Validate path to prevent traversal
    const safePath = validatePath(this.basePath, pbipPath);

    const projectDir = path.dirname(safePath);
    const projectName = path.basename(safePath, '.pbip');

    const semanticModelPath = path.join(projectDir, `${projectName}.SemanticModel`);
    const reportPath = path.join(projectDir, `${projectName}.Report`);

    if (!fs.existsSync(semanticModelPath)) {
      throw new Error('Semantic model not found');
    }

    const model = await this.loadModel(semanticModelPath);

    return {
      projectPath: safePath,
      semanticModelPath,
      reportPath,
      model,
    };
  }

  /**
   * Load the semantic model from TMDL files
   */
  async loadModel(semanticModelPath: string): Promise<TmdlModel> {
    const definitionPath = path.join(semanticModelPath, 'definition');
    const tablesPath = path.join(definitionPath, 'tables');

    // Read model.tmdl for model name
    const modelTmdlPath = path.join(definitionPath, 'model.tmdl');
    let modelName = 'Model';
    if (fs.existsSync(modelTmdlPath)) {
      const content = await fs.promises.readFile(modelTmdlPath, 'utf-8');
      const match = content.match(/model\s+(\S+)/);
      if (match) modelName = match[1];
    }

    // Load all tables
    const tables: TmdlTable[] = [];
    if (fs.existsSync(tablesPath)) {
      const tableFiles = await fs.promises.readdir(tablesPath);
      for (const file of tableFiles) {
        if (file.endsWith('.tmdl')) {
          const tablePath = path.join(tablesPath, file);
          const table = await this.parseTableFile(tablePath);
          if (table) {
            tables.push(table);
          }
        }
      }
    }

    return {
      name: modelName,
      tables,
    };
  }

  /**
   * Parse a table TMDL file
   */
  async parseTableFile(filePath: string): Promise<TmdlTable | null> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let tableName = '';
    let tableLineageTag = '';
    const measures: TmdlMeasure[] = [];

    let currentMeasure: Partial<TmdlMeasure> | null = null;
    let inMultilineExpression = false;
    let expressionLines: string[] = [];
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table declaration
      if (trimmed.startsWith('table ')) {
        // Handle both quoted and unquoted table names
        const quotedMatch = trimmed.match(/table\s+'([^']+)'/);
        const unquotedMatch = trimmed.match(/table\s+(\S+)/);
        if (quotedMatch) {
          tableName = quotedMatch[1];
        } else if (unquotedMatch) {
          tableName = unquotedMatch[1];
        }
        continue;
      }

      // Table lineage tag
      if (trimmed.startsWith('lineageTag:') && !currentMeasure) {
        tableLineageTag = trimmed.replace('lineageTag:', '').trim();
        continue;
      }

      // Measure declaration
      if (trimmed.startsWith('measure ')) {
        // Save previous measure if exists
        if (currentMeasure && currentMeasure.name) {
          if (inMultilineExpression) {
            currentMeasure.expression = expressionLines.join('\n');
          }
          measures.push(currentMeasure as TmdlMeasure);
        }

        // Parse new measure
        const measureMatch = trimmed.match(/measure\s+'([^']+)'\s*=\s*(.*)/);
        if (measureMatch) {
          currentMeasure = {
            name: measureMatch[1],
            expression: measureMatch[2] || '',
            lineageTag: '',
            annotations: {},
          };

          // Check if expression continues on next lines
          if (!measureMatch[2] || measureMatch[2].trim() === '') {
            inMultilineExpression = true;
            expressionLines = [];
            indentLevel = line.search(/\S/);
          } else {
            inMultilineExpression = false;
          }
        }
        continue;
      }

      // Inside a measure definition
      if (currentMeasure) {
        // Multiline expression content
        if (inMultilineExpression && !trimmed.startsWith('formatString:') &&
            !trimmed.startsWith('lineageTag:') && !trimmed.startsWith('annotation') &&
            !trimmed.startsWith('measure ') && !trimmed.startsWith('partition ') &&
            !trimmed.startsWith('///')) {
          if (trimmed) {
            expressionLines.push(line.replace(/^\t\t/, ''));
          }
          continue;
        }

        // Description (/// comment before measure properties)
        if (trimmed.startsWith('///')) {
          // This is handled at measure declaration
          continue;
        }

        // Format string
        if (trimmed.startsWith('formatString:')) {
          if (inMultilineExpression && expressionLines.length > 0) {
            currentMeasure.expression = expressionLines.join('\n').trim();
            inMultilineExpression = false;
          }
          currentMeasure.formatString = trimmed.replace('formatString:', '').trim();
          continue;
        }

        // Lineage tag for measure
        if (trimmed.startsWith('lineageTag:')) {
          if (inMultilineExpression && expressionLines.length > 0) {
            currentMeasure.expression = expressionLines.join('\n').trim();
            inMultilineExpression = false;
          }
          currentMeasure.lineageTag = trimmed.replace('lineageTag:', '').trim();
          continue;
        }

        // Annotation
        if (trimmed.startsWith('annotation ')) {
          const annotMatch = trimmed.match(/annotation\s+(\S+)\s*=\s*(.*)/);
          if (annotMatch && currentMeasure.annotations) {
            currentMeasure.annotations[annotMatch[1]] = annotMatch[2];
          }
          continue;
        }

        // End of measure (partition or new table element)
        if (trimmed.startsWith('partition ') || trimmed.startsWith('column ')) {
          if (currentMeasure.name) {
            if (inMultilineExpression) {
              currentMeasure.expression = expressionLines.join('\n').trim();
            }
            measures.push(currentMeasure as TmdlMeasure);
          }
          currentMeasure = null;
          inMultilineExpression = false;
        }
      }
    }

    // Don't forget the last measure
    if (currentMeasure && currentMeasure.name) {
      if (inMultilineExpression) {
        currentMeasure.expression = expressionLines.join('\n').trim();
      }
      measures.push(currentMeasure as TmdlMeasure);
    }

    if (!tableName) return null;

    return {
      name: tableName,
      lineageTag: tableLineageTag,
      measures,
    };
  }

  /**
   * Get all measures from a project
   */
  getMeasures(project: TmdlProject): TmdlMeasure[] {
    const measures: TmdlMeasure[] = [];
    for (const table of project.model.tables) {
      for (const measure of table.measures) {
        measures.push({
          ...measure,
          // Add table context
        });
      }
    }
    return measures;
  }

  /**
   * Find a measure by name
   */
  findMeasure(project: TmdlProject, measureName: string): { table: TmdlTable; measure: TmdlMeasure } | null {
    for (const table of project.model.tables) {
      const measure = table.measures.find(m => m.name === measureName);
      if (measure) {
        return { table, measure };
      }
    }
    return null;
  }

  /**
   * Add a new measure to a table
   */
  async addMeasure(
    project: TmdlProject,
    tableName: string,
    measure: Omit<TmdlMeasure, 'lineageTag'>
  ): Promise<{ success: boolean; error?: string }> {
    const table = project.model.tables.find(t => t.name === tableName);
    if (!table) {
      return { success: false, error: `Table '${tableName}' not found` };
    }

    // Check if measure already exists
    if (table.measures.some(m => m.name === measure.name)) {
      return { success: false, error: `Measure '${measure.name}' already exists in table '${tableName}'` };
    }

    // Generate lineage tag
    const newMeasure: TmdlMeasure = {
      ...measure,
      lineageTag: uuidv4(),
    };

    // Add to model
    table.measures.push(newMeasure);

    // Write back to file
    await this.writeTableFile(project, tableName);

    return { success: true };
  }

  /**
   * Update an existing measure
   */
  async updateMeasure(
    project: TmdlProject,
    measureName: string,
    updates: Partial<Omit<TmdlMeasure, 'lineageTag' | 'name'>>
  ): Promise<{ success: boolean; error?: string }> {
    const found = this.findMeasure(project, measureName);
    if (!found) {
      return { success: false, error: `Measure '${measureName}' not found` };
    }

    // Update measure
    if (updates.expression !== undefined) found.measure.expression = updates.expression;
    if (updates.formatString !== undefined) found.measure.formatString = updates.formatString;
    if (updates.description !== undefined) found.measure.description = updates.description;

    // Write back to file
    await this.writeTableFile(project, found.table.name);

    return { success: true };
  }

  /**
   * Delete a measure
   */
  async deleteMeasure(
    project: TmdlProject,
    measureName: string
  ): Promise<{ success: boolean; error?: string }> {
    for (const table of project.model.tables) {
      const index = table.measures.findIndex(m => m.name === measureName);
      if (index !== -1) {
        table.measures.splice(index, 1);
        await this.writeTableFile(project, table.name);
        return { success: true };
      }
    }
    return { success: false, error: `Measure '${measureName}' not found` };
  }

  /**
   * Write a table TMDL file
   */
  async writeTableFile(project: TmdlProject, tableName: string): Promise<void> {
    const table = project.model.tables.find(t => t.name === tableName);
    if (!table) throw new Error(`Table '${tableName}' not found`);

    const tablesPath = path.join(project.semanticModelPath, 'definition', 'tables');
    const filePath = path.join(tablesPath, `${tableName}.tmdl`);

    // Read existing file to preserve structure
    if (!fs.existsSync(filePath)) {
      throw new Error(`Table file not found: ${filePath}`);
    }

    const existingContent = await fs.promises.readFile(filePath, 'utf-8');
    const lines = existingContent.split('\n');

    // Find where measures section starts and ends
    let measureStartIdx = -1;
    let measureEndIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // First measure definition starts
      if (measureStartIdx === -1 && trimmed.startsWith('measure ')) {
        measureStartIdx = i;
      }

      // Last measure ends when we hit a column, partition, or end of file
      if (measureStartIdx !== -1 && measureEndIdx === -1) {
        if (trimmed.startsWith('column ') ||
            trimmed.startsWith('partition ') ||
            trimmed.startsWith('hierarchy ')) {
          measureEndIdx = i;
          break;
        }
      }
    }

    // If no measures found, insert after lineageTag
    if (measureStartIdx === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('lineageTag:')) {
          measureStartIdx = i + 1;
          measureEndIdx = i + 1;
          break;
        }
      }
    }

    // If still not found, something is wrong
    if (measureStartIdx === -1) {
      throw new Error(`Could not find insertion point in ${filePath}`);
    }

    // If measureEndIdx not set, measures go to end of file
    if (measureEndIdx === -1) {
      measureEndIdx = lines.length;
    }

    // Build measures content
    const measureLines: string[] = [];
    if (table.measures.length > 0) {
      measureLines.push(''); // Blank line before measures

      for (const measure of table.measures) {
        // Add description as comment if present
        if (measure.description) {
          measureLines.push(`\t/// ${measure.description}`);
        }

        // Check if expression is multiline
        const isMultiline = measure.expression.includes('\n');

        if (isMultiline) {
          measureLines.push(`\tmeasure '${measure.name}' =`);
          const exprLines = measure.expression.split('\n');
          for (const exprLine of exprLines) {
            measureLines.push(`\t\t${exprLine}`);
          }
        } else {
          measureLines.push(`\tmeasure '${measure.name}' = ${measure.expression}`);
        }

        if (measure.formatString) {
          measureLines.push(`\t\tformatString: ${measure.formatString}`);
        }
        measureLines.push(`\t\tlineageTag: ${measure.lineageTag}`);

        // Add annotations
        if (measure.annotations) {
          for (const [key, value] of Object.entries(measure.annotations)) {
            measureLines.push(`\t\tannotation ${key} = ${value}`);
          }
        }

        measureLines.push(''); // Blank line after each measure
      }
    }

    // Reconstruct file: before measures + new measures + after measures
    const newLines = [
      ...lines.slice(0, measureStartIdx),
      ...measureLines,
      ...lines.slice(measureEndIdx)
    ];

    await fs.promises.writeFile(filePath, newLines.join('\n'), 'utf-8');
  }

  /**
   * Get tables that contain measures (for DAX)
   */
  getMeasureTables(project: TmdlProject): string[] {
    return project.model.tables
      .filter(t => t.measures.length > 0)
      .map(t => t.name);
  }
}

// No longer using singleton - instantiate with base path for security
