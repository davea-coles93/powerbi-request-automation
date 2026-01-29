/**
 * TMDL Service for MCP Server
 * Reads and parses TMDL files with enhanced metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseTableFile } from './parsers/table-parser.js';
import { parseRelationshipsFile } from './parsers/relationship-parser.js';
import {
  TmdlTable,
  TmdlRelationship,
  TmdlMeasure,
  TmdlColumn,
  TmdlHierarchy,
  TmdlModel,
  TmdlProject,
} from './types.js';

// Re-export types for backwards compatibility
export type {
  TmdlTable,
  TmdlRelationship,
  TmdlMeasure,
  TmdlColumn,
  TmdlHierarchy,
  TmdlModel,
  TmdlProject,
};

export class TmdlService {
  private modelPath: string;
  private project: TmdlProject | null = null;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
  }

  /**
   * Load the TMDL project
   */
  async loadProject(): Promise<TmdlProject> {
    if (this.project) {
      return this.project;
    }

    const projectDir = path.dirname(this.modelPath);
    const projectName = path.basename(this.modelPath, '.pbip');

    const semanticModelPath = path.join(projectDir, `${projectName}.SemanticModel`);

    if (!fs.existsSync(semanticModelPath)) {
      throw new Error(`Semantic model not found: ${semanticModelPath}`);
    }

    const model = await this.loadModel(semanticModelPath);

    this.project = {
      projectPath: this.modelPath,
      semanticModelPath,
      model,
    };

    return this.project;
  }

  /**
   * Load the semantic model from TMDL files
   */
  private async loadModel(semanticModelPath: string): Promise<TmdlModel> {
    const definitionPath = path.join(semanticModelPath, 'definition');
    const tablesPath = path.join(definitionPath, 'tables');
    const relationshipsPath = path.join(definitionPath, 'relationships.tmdl');

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
          const table = await this.parseTableFileInternal(tablePath);
          if (table) {
            tables.push(table);
          }
        }
      }
    }

    // Load relationships
    const relationships: TmdlRelationship[] = [];
    if (fs.existsSync(relationshipsPath)) {
      const rels = await this.parseRelationshipsFileInternal(relationshipsPath);
      relationships.push(...rels);
    }

    return {
      name: modelName,
      tables,
      relationships,
      calculationGroups: [],  // TODO: Parse calculation groups
      perspectives: [],  // TODO: Parse perspectives
      roles: [],  // TODO: Parse roles
      cultures: [],  // TODO: Parse cultures
      annotations: [],  // TODO: Parse model-level annotations
    };
  }

  /**
   * Parse a table TMDL file using enhanced parser
   */
  private async parseTableFileInternal(filePath: string): Promise<TmdlTable | null> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return parseTableFile(content);
  }

  /**
   * Parse relationships file using enhanced parser
   */
  private async parseRelationshipsFileInternal(filePath: string): Promise<TmdlRelationship[]> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return parseRelationshipsFile(content);
  }

  /**
   * Get all measures from the model
   */
  getMeasures(): { table: string; measure: TmdlMeasure }[] {
    if (!this.project) return [];

    const result: { table: string; measure: TmdlMeasure }[] = [];
    for (const table of this.project.model.tables) {
      for (const measure of table.measures) {
        result.push({ table: table.name, measure });
      }
    }
    return result;
  }

  /**
   * Find tables that have measures
   */
  getMeasureTables(): string[] {
    if (!this.project) return [];

    return this.project.model.tables
      .filter(t => t.measures.length > 0)
      .map(t => t.name);
  }

  /**
   * Get project (load if not loaded)
   */
  async getProject(): Promise<TmdlProject> {
    if (!this.project) {
      await this.loadProject();
    }
    return this.project!;
  }

  /**
   * Get all hierarchies from a table
   */
  getTableHierarchies(tableName: string): TmdlHierarchy[] {
    if (!this.project) return [];

    const table = this.project.model.tables.find(t => t.name === tableName);
    return table?.hierarchies || [];
  }

  /**
   * Get detailed column information
   */
  getColumnDetails(tableName: string, columnName: string): TmdlColumn | null {
    if (!this.project) return null;

    const table = this.project.model.tables.find(t => t.name === tableName);
    if (!table) return null;

    return table.columns.find(c => c.name === columnName) || null;
  }

  /**
   * Get all relationships with full details
   */
  getDetailedRelationships(): TmdlRelationship[] {
    if (!this.project) return [];
    return this.project.model.relationships;
  }

  /**
   * Get all tables with hierarchy information
   */
  getTablesWithHierarchies(): Array<{ table: string; hierarchies: TmdlHierarchy[] }> {
    if (!this.project) return [];

    return this.project.model.tables
      .filter(t => t.hierarchies && t.hierarchies.length > 0)
      .map(t => ({
        table: t.name,
        hierarchies: t.hierarchies,
      }));
  }
}
