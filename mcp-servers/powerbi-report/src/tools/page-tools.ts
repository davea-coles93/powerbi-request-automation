/**
 * Tools for managing pages in Power BI reports
 */

import { ReportParser } from '../parsers/report-parser.js';
import { PageDefinition } from '../types/index.js';

const parser = new ReportParser();

export async function listPages(reportPath: string) {
  const project = await parser.loadReport(reportPath);

  const pageDetails = [];
  for (const [pageName, pageDef] of project.pageDefinitions) {
    const visuals = await parser.getPageVisuals(reportPath, pageName);

    pageDetails.push({
      name: pageName,
      displayName: pageDef.displayName,
      filterCount: pageDef.filterConfig?.filters.length || 0,
      visualCount: visuals.length,
      isActive: project.pages.activePageName === pageName,
    });
  }

  return {
    totalPages: project.pages.pageOrder.length,
    activePageName: project.pages.activePageName,
    pageOrder: project.pages.pageOrder,
    pages: pageDetails,
  };
}

export async function getPage(reportPath: string, pageName: string) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(pageName);

  if (!pageDef) {
    throw new Error(`Page ${pageName} not found`);
  }

  const visuals = await parser.getPageVisuals(reportPath, pageName);

  return {
    ...pageDef,
    visualCount: visuals.length,
    isActive: project.pages.activePageName === pageName,
  };
}

export async function createPage(
  reportPath: string,
  pageName: string,
  displayName: string,
  width: number = 1280,
  height: number = 720,
  insertAtIndex?: number
) {
  const project = await parser.loadReport(reportPath);

  // Check if page already exists
  if (project.pageDefinitions.has(pageName)) {
    throw new Error(`Page ${pageName} already exists`);
  }

  // Create new page definition
  const newPage: PageDefinition = {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json',
    name: pageName,
    displayName: displayName,
    displayOption: 'FitToPage',
    width,
    height,
  };

  // Add to page order
  if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= project.pages.pageOrder.length) {
    project.pages.pageOrder.splice(insertAtIndex, 0, pageName);
  } else {
    project.pages.pageOrder.push(pageName);
  }

  // Save page definition and updated pages.json
  await parser.savePage(reportPath, pageName, newPage);
  await parser.savePages(reportPath, project.pages);

  return {
    success: true,
    pageName,
    displayName,
    index: project.pages.pageOrder.indexOf(pageName),
  };
}

export async function deletePage(reportPath: string, pageName: string) {
  const project = await parser.loadReport(reportPath);

  // Check if page exists
  if (!project.pageDefinitions.has(pageName)) {
    throw new Error(`Page ${pageName} not found`);
  }

  // Remove from page order
  const index = project.pages.pageOrder.indexOf(pageName);
  if (index > -1) {
    project.pages.pageOrder.splice(index, 1);
  }

  // If this was the active page, set a new active page
  if (project.pages.activePageName === pageName) {
    project.pages.activePageName = project.pages.pageOrder[0] || '';
  }

  // Delete page files
  await parser.deletePage(reportPath, pageName);

  // Save updated pages.json
  await parser.savePages(reportPath, project.pages);

  return {
    success: true,
    deletedPage: pageName,
    newActivePage: project.pages.activePageName,
  };
}

export async function renamePage(reportPath: string, oldName: string, newName: string, newDisplayName?: string) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(oldName);

  if (!pageDef) {
    throw new Error(`Page ${oldName} not found`);
  }

  // Update page definition
  pageDef.name = newName;
  if (newDisplayName) {
    pageDef.displayName = newDisplayName;
  }

  // Get visuals before deleting old page
  const visuals = await parser.getPageVisuals(reportPath, oldName);

  // Save page with new name
  await parser.savePage(reportPath, newName, pageDef);

  // Copy visuals to new page
  for (const visual of visuals) {
    await parser.saveVisual(reportPath, newName, visual.name, visual);
  }

  // Update pages.json
  const index = project.pages.pageOrder.indexOf(oldName);
  if (index > -1) {
    project.pages.pageOrder[index] = newName;
  }

  if (project.pages.activePageName === oldName) {
    project.pages.activePageName = newName;
  }

  await parser.savePages(reportPath, project.pages);

  // Delete old page
  await parser.deletePage(reportPath, oldName);

  return {
    success: true,
    oldName,
    newName,
    displayName: pageDef.displayName,
  };
}

export async function setActivePage(reportPath: string, pageName: string) {
  const project = await parser.loadReport(reportPath);

  if (!project.pageDefinitions.has(pageName)) {
    throw new Error(`Page ${pageName} not found`);
  }

  project.pages.activePageName = pageName;
  await parser.savePages(reportPath, project.pages);

  return {
    success: true,
    activePageName: pageName,
  };
}
