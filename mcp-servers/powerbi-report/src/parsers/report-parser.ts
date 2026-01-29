/**
 * Parser for Power BI Report JSON files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ReportProject,
  ReportDefinition,
  PagesMetadata,
  PageDefinition,
  VisualContainer,
} from '../types/index.js';

export class ReportParser {
  /**
   * Load a complete report project
   */
  async loadReport(reportPath: string): Promise<ReportProject> {
    const definitionPath = path.join(reportPath, 'definition');

    // Load report.json
    const reportJsonPath = path.join(definitionPath, 'report.json');
    const reportContent = await fs.readFile(reportJsonPath, 'utf-8');
    const report: ReportDefinition = JSON.parse(reportContent);

    // Load pages.json
    const pagesJsonPath = path.join(definitionPath, 'pages', 'pages.json');
    const pagesContent = await fs.readFile(pagesJsonPath, 'utf-8');
    const pages: PagesMetadata = JSON.parse(pagesContent);

    // Load all page definitions
    const pageDefinitions = new Map<string, PageDefinition>();
    for (const pageName of pages.pageOrder) {
      const pageDefPath = path.join(definitionPath, 'pages', pageName, 'page.json');
      try {
        const pageContent = await fs.readFile(pageDefPath, 'utf-8');
        const pageDef: PageDefinition = JSON.parse(pageContent);
        pageDefinitions.set(pageName, pageDef);
      } catch (error) {
        console.warn(`Warning: Could not load page ${pageName}:`, error);
      }
    }

    return {
      reportPath,
      report,
      pages,
      pageDefinitions,
    };
  }

  /**
   * Get all visuals for a specific page
   */
  async getPageVisuals(reportPath: string, pageName: string): Promise<VisualContainer[]> {
    const visualsPath = path.join(reportPath, 'definition', 'pages', pageName, 'visuals');

    try {
      const containers = await fs.readdir(visualsPath);
      const visuals: VisualContainer[] = [];

      for (const containerName of containers) {
        const visualJsonPath = path.join(visualsPath, containerName, 'visual.json');
        try {
          const visualContent = await fs.readFile(visualJsonPath, 'utf-8');
          const visual: VisualContainer = JSON.parse(visualContent);
          visuals.push(visual);
        } catch (error) {
          console.warn(`Warning: Could not load visual ${containerName}:`, error);
        }
      }

      return visuals;
    } catch (error) {
      // Page has no visuals directory
      return [];
    }
  }

  /**
   * Get a specific visual
   */
  async getVisual(
    reportPath: string,
    pageName: string,
    containerName: string
  ): Promise<VisualContainer | null> {
    const visualJsonPath = path.join(
      reportPath,
      'definition',
      'pages',
      pageName,
      'visuals',
      containerName,
      'visual.json'
    );

    try {
      const visualContent = await fs.readFile(visualJsonPath, 'utf-8');
      return JSON.parse(visualContent);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save report.json
   */
  async saveReport(reportPath: string, report: ReportDefinition): Promise<void> {
    const reportJsonPath = path.join(reportPath, 'definition', 'report.json');
    await fs.writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Save pages.json
   */
  async savePages(reportPath: string, pages: PagesMetadata): Promise<void> {
    const pagesJsonPath = path.join(reportPath, 'definition', 'pages', 'pages.json');
    await fs.writeFile(pagesJsonPath, JSON.stringify(pages, null, 2), 'utf-8');
  }

  /**
   * Save page.json
   */
  async savePage(reportPath: string, pageName: string, page: PageDefinition): Promise<void> {
    const pageJsonPath = path.join(reportPath, 'definition', 'pages', pageName, 'page.json');

    // Ensure directory exists
    const pageDir = path.dirname(pageJsonPath);
    await fs.mkdir(pageDir, { recursive: true });

    await fs.writeFile(pageJsonPath, JSON.stringify(page, null, 2), 'utf-8');
  }

  /**
   * Save visual.json
   */
  async saveVisual(
    reportPath: string,
    pageName: string,
    containerName: string,
    visual: VisualContainer
  ): Promise<void> {
    const visualJsonPath = path.join(
      reportPath,
      'definition',
      'pages',
      pageName,
      'visuals',
      containerName,
      'visual.json'
    );

    // Ensure directory exists
    const visualDir = path.dirname(visualJsonPath);
    await fs.mkdir(visualDir, { recursive: true });

    await fs.writeFile(visualJsonPath, JSON.stringify(visual, null, 2), 'utf-8');
  }

  /**
   * Delete a page and all its files
   */
  async deletePage(reportPath: string, pageName: string): Promise<void> {
    const pageDir = path.join(reportPath, 'definition', 'pages', pageName);
    await fs.rm(pageDir, { recursive: true, force: true });
  }

  /**
   * Delete a visual
   */
  async deleteVisual(reportPath: string, pageName: string, containerName: string): Promise<void> {
    const visualDir = path.join(reportPath, 'definition', 'pages', pageName, 'visuals', containerName);
    await fs.rm(visualDir, { recursive: true, force: true });
  }

  /**
   * Check if report path is valid
   */
  async isValidReportPath(reportPath: string): Promise<boolean> {
    try {
      const reportJsonPath = path.join(reportPath, 'definition', 'report.json');
      await fs.access(reportJsonPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get next available container name
   */
  async getNextContainerName(reportPath: string, pageName: string): Promise<string> {
    const visualsPath = path.join(reportPath, 'definition', 'pages', pageName, 'visuals');

    try {
      const containers = await fs.readdir(visualsPath);
      const numbers = containers
        .filter(c => c.startsWith('VisualContainer'))
        .map(c => {
          const match = c.match(/VisualContainer(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => !isNaN(n));

      if (numbers.length === 0) {
        return 'VisualContainer1';
      }

      const maxNum = Math.max(...numbers);
      return `VisualContainer${maxNum + 1}`;
    } catch {
      // No visuals directory yet
      return 'VisualContainer';
    }
  }
}
