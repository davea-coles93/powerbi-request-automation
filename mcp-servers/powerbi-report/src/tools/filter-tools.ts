/**
 * Tools for managing filters in Power BI reports
 */

import { ReportParser } from '../parsers/report-parser.js';
import { FieldExpression, Filter } from '../types/index.js';

const parser = new ReportParser();

export async function getPageFilters(reportPath: string, pageName: string) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(pageName);

  if (!pageDef) {
    throw new Error(`Page ${pageName} not found`);
  }

  return {
    pageName,
    filterCount: pageDef.filterConfig?.filters.length || 0,
    filters: pageDef.filterConfig?.filters || [],
  };
}

export async function addPageFilter(
  reportPath: string,
  pageName: string,
  entity: string,
  property: string,
  filterType: string = 'Categorical'
) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(pageName);

  if (!pageDef) {
    throw new Error(`Page ${pageName} not found`);
  }

  // Ensure filterConfig exists
  if (!pageDef.filterConfig) {
    pageDef.filterConfig = { filters: [] };
  }

  // Get next filter name
  const existingFilters = pageDef.filterConfig.filters;
  const filterNumbers = existingFilters
    .map(f => {
      const match = f.name.match(/Filter(\d+)?/);
      return match ? (match[1] ? parseInt(match[1]) : 0) : -1;
    })
    .filter(n => n >= 0);

  const nextNum = filterNumbers.length > 0 ? Math.max(...filterNumbers) + 1 : 0;
  const filterName = nextNum === 0 ? 'Filter' : `Filter${nextNum}`;

  const newFilter: Filter = {
    name: filterName,
    field: {
      Column: {
        Expression: {
          SourceRef: {
            Entity: entity,
          },
        },
        Property: property,
      },
    },
    type: filterType,
    howCreated: 'User',
  };

  pageDef.filterConfig.filters.push(newFilter);

  await parser.savePage(reportPath, pageName, pageDef);

  return {
    success: true,
    pageName,
    filterName,
    entity,
    property,
    filterType,
  };
}

export async function removePageFilter(reportPath: string, pageName: string, filterName: string) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(pageName);

  if (!pageDef) {
    throw new Error(`Page ${pageName} not found`);
  }

  if (!pageDef.filterConfig) {
    throw new Error(`No filters found on page ${pageName}`);
  }

  const index = pageDef.filterConfig.filters.findIndex(f => f.name === filterName);
  if (index === -1) {
    throw new Error(`Filter ${filterName} not found on page ${pageName}`);
  }

  pageDef.filterConfig.filters.splice(index, 1);

  await parser.savePage(reportPath, pageName, pageDef);

  return {
    success: true,
    pageName,
    removedFilter: filterName,
  };
}

export async function clearPageFilters(reportPath: string, pageName: string) {
  const project = await parser.loadReport(reportPath);
  const pageDef = project.pageDefinitions.get(pageName);

  if (!pageDef) {
    throw new Error(`Page ${pageName} not found`);
  }

  const filterCount = pageDef.filterConfig?.filters.length || 0;

  if (pageDef.filterConfig) {
    pageDef.filterConfig.filters = [];
  }

  await parser.savePage(reportPath, pageName, pageDef);

  return {
    success: true,
    pageName,
    removedFilterCount: filterCount,
  };
}
