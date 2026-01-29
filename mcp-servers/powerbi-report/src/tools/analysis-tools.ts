/**
 * Tools for analyzing Power BI reports
 */

import { ReportParser } from '../parsers/report-parser.js';
import { AnalysisResult, PageAnalysis, VisualSummary } from '../types/index.js';

const parser = new ReportParser();

export async function analyzeReport(reportPath: string): Promise<AnalysisResult> {
  const project = await parser.loadReport(reportPath);

  const pages: PageAnalysis[] = [];
  let totalVisuals = 0;
  const visualsByType: Record<string, number> = {};
  let totalFilters = 0;

  for (const [pageName, pageDef] of project.pageDefinitions) {
    const visuals = await parser.getPageVisuals(reportPath, pageName);
    totalVisuals += visuals.length;

    const filterCount = pageDef.filterConfig?.filters.length || 0;
    totalFilters += filterCount;

    const visualSummaries: VisualSummary[] = visuals.map(v => {
      const type = v.visual.visualType;
      visualsByType[type] = (visualsByType[type] || 0) + 1;

      // Extract fields from query
      const fields: string[] = [];
      if (v.visual.query?.queryState) {
        for (const [role, config] of Object.entries(v.visual.query.queryState)) {
          for (const proj of config.projections) {
            fields.push(proj.queryRef);
          }
        }
      }

      // Extract title
      let title: string | undefined;
      if (v.visual.visualContainerObjects?.title) {
        const titleProp = v.visual.visualContainerObjects.title[0]?.properties?.text?.expr?.Literal?.Value;
        if (titleProp) {
          title = titleProp.replace(/^'|'$/g, '');
        }
      }

      return {
        containerName: v.name,
        type: v.visual.visualType,
        position: v.position,
        hasQuery: !!v.visual.query,
        title,
        fields,
      };
    });

    pages.push({
      name: pageName,
      displayName: pageDef.displayName,
      visualCount: visuals.length,
      filterCount,
      visuals: visualSummaries,
    });
  }

  return {
    reportPath,
    totalPages: pages.length,
    pages,
    totalVisuals,
    visualsByType,
    filterCount: totalFilters,
  };
}

export async function findBrokenReferences(reportPath: string, semanticModelPath: string): Promise<string[]> {
  // This would require loading the semantic model to check if entities/properties exist
  // For now, return placeholder
  // TODO: Integrate with semantic model MCP to validate references
  return [];
}

export async function getReportSummary(reportPath: string) {
  const analysis = await analyzeReport(reportPath);

  return {
    totalPages: analysis.totalPages,
    totalVisuals: analysis.totalVisuals,
    totalFilters: analysis.filterCount,
    visualTypes: Object.entries(analysis.visualsByType).map(([type, count]) => ({
      type,
      count,
    })),
    pages: analysis.pages.map(p => ({
      name: p.displayName,
      visualCount: p.visualCount,
      filterCount: p.filterCount,
    })),
  };
}
