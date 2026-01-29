/**
 * Report Change Validator
 * Validates proposed changes to Power BI reports
 * Provides preview and safety checks before applying changes
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ChangeProposal {
  type: 'create' | 'update' | 'delete';
  target: 'page' | 'visual' | 'filter';
  path: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  warnings: string[];
  changes?: any;
}

export interface ChangeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  proposals: ChangeProposal[];
  requiresApproval: boolean;
}

export class ReportChangeValidator {
  /**
   * Validate a proposed change before execution
   */
  async validateChange(
    reportPath: string,
    changeType: 'create_page' | 'delete_page' | 'create_visual' | 'delete_visual' | 'update_visual',
    params: any
  ): Promise<ChangeValidationResult> {
    const result: ChangeValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      proposals: [],
      requiresApproval: false,
    };

    switch (changeType) {
      case 'create_page':
        await this.validateCreatePage(reportPath, params, result);
        break;
      case 'delete_page':
        await this.validateDeletePage(reportPath, params, result);
        break;
      case 'create_visual':
        await this.validateCreateVisual(reportPath, params, result);
        break;
      case 'delete_visual':
        await this.validateDeleteVisual(reportPath, params, result);
        break;
      case 'update_visual':
        await this.validateUpdateVisual(reportPath, params, result);
        break;
    }

    return result;
  }

  /**
   * Validate creating a new page
   */
  private async validateCreatePage(
    reportPath: string,
    params: any,
    result: ChangeValidationResult
  ): Promise<void> {
    const { pageName, displayName } = params;

    // Check if page already exists
    const pagePath = path.join(reportPath, 'definition', 'pages', pageName);
    if (fs.existsSync(pagePath)) {
      result.isValid = false;
      result.errors.push(`Page '${pageName}' already exists`);
      return;
    }

    // Count existing pages
    const pagesPath = path.join(reportPath, 'definition', 'pages');
    const existingPages = fs.readdirSync(pagesPath).filter(f => {
      const stat = fs.statSync(path.join(pagesPath, f));
      return stat.isDirectory();
    });

    // Warn if too many pages
    if (existingPages.length >= 10) {
      result.warnings.push(
        `Report already has ${existingPages.length} pages. Consider if a new page is necessary.`
      );
    }

    result.proposals.push({
      type: 'create',
      target: 'page',
      path: pagePath,
      description: `Create new page: ${displayName}`,
      impact: 'low',
      warnings: [],
    });
  }

  /**
   * Validate deleting a page
   */
  private async validateDeletePage(
    reportPath: string,
    params: any,
    result: ChangeValidationResult
  ): Promise<void> {
    const { pageName } = params;

    const pagePath = path.join(reportPath, 'definition', 'pages', pageName);
    if (!fs.existsSync(pagePath)) {
      result.isValid = false;
      result.errors.push(`Page '${pageName}' does not exist`);
      return;
    }

    // Count visuals on the page
    const visualsPath = path.join(pagePath, 'visuals');
    let visualCount = 0;
    if (fs.existsSync(visualsPath)) {
      visualCount = fs.readdirSync(visualsPath).length;
    }

    // High impact if page has visuals
    const impact = visualCount > 0 ? 'high' : 'low';
    const warnings: string[] = [];

    if (visualCount > 0) {
      warnings.push(`This page contains ${visualCount} visuals that will be permanently deleted`);
      result.requiresApproval = true;
    }

    result.proposals.push({
      type: 'delete',
      target: 'page',
      path: pagePath,
      description: `Delete page: ${pageName} (${visualCount} visuals)`,
      impact,
      warnings,
    });

    result.warnings.push(
      `⚠️  DESTRUCTIVE: Deleting page '${pageName}' will remove ${visualCount} visuals. This cannot be easily undone.`
    );
  }

  /**
   * Validate creating a visual
   */
  private async validateCreateVisual(
    reportPath: string,
    params: any,
    result: ChangeValidationResult
  ): Promise<void> {
    const { pageName } = params;

    const pagePath = path.join(reportPath, 'definition', 'pages', pageName);
    if (!fs.existsSync(pagePath)) {
      result.isValid = false;
      result.errors.push(`Page '${pageName}' does not exist`);
      return;
    }

    // Count existing visuals
    const visualsPath = path.join(pagePath, 'visuals');
    let visualCount = 0;
    if (fs.existsSync(visualsPath)) {
      visualCount = fs.readdirSync(visualsPath).length;
    }

    // Warn if too many visuals (best practice: 6-12)
    if (visualCount >= 12) {
      result.warnings.push(
        `⚠️  Page already has ${visualCount} visuals. Best practice: 6-12 visuals per page. Consider creating a new page.`
      );
    }

    result.proposals.push({
      type: 'create',
      target: 'visual',
      path: visualsPath,
      description: `Create new visual on page: ${pageName} (current: ${visualCount} visuals)`,
      impact: 'low',
      warnings: visualCount >= 12 ? ['Page may be too cluttered'] : [],
    });
  }

  /**
   * Validate deleting a visual
   */
  private async validateDeleteVisual(
    reportPath: string,
    params: any,
    result: ChangeValidationResult
  ): Promise<void> {
    const { pageName, containerName } = params;

    const visualPath = path.join(
      reportPath,
      'definition',
      'pages',
      pageName,
      'visuals',
      containerName
    );

    if (!fs.existsSync(visualPath)) {
      result.isValid = false;
      result.errors.push(`Visual '${containerName}' does not exist on page '${pageName}'`);
      return;
    }

    // Read visual to get details
    const visualJsonPath = path.join(visualPath, 'visual.json');
    let visualType = 'unknown';
    let visualTitle = containerName;

    if (fs.existsSync(visualJsonPath)) {
      try {
        const visualJson = JSON.parse(fs.readFileSync(visualJsonPath, 'utf-8'));
        visualType = visualJson.visual?.visualType || 'unknown';
        visualTitle = visualJson.visual?.visualContainerObjects?.title?.[0]?.properties?.text?.expr?.Literal?.Value || containerName;
      } catch (e) {
        // Ignore parsing errors
      }
    }

    result.proposals.push({
      type: 'delete',
      target: 'visual',
      path: visualPath,
      description: `Delete visual: ${visualTitle} (${visualType})`,
      impact: 'medium',
      warnings: ['Visual will be permanently deleted'],
    });

    result.warnings.push(`Deleting visual: ${visualTitle}`);
  }

  /**
   * Validate updating a visual
   */
  private async validateUpdateVisual(
    reportPath: string,
    params: any,
    result: ChangeValidationResult
  ): Promise<void> {
    const { pageName, containerName } = params;

    const visualPath = path.join(
      reportPath,
      'definition',
      'pages',
      pageName,
      'visuals',
      containerName
    );

    if (!fs.existsSync(visualPath)) {
      result.isValid = false;
      result.errors.push(`Visual '${containerName}' does not exist on page '${pageName}'`);
      return;
    }

    // Check for external modifications
    const visualJsonPath = path.join(visualPath, 'visual.json');
    if (fs.existsSync(visualJsonPath)) {
      const stats = fs.statSync(visualJsonPath);
      const modifiedRecently = Date.now() - stats.mtimeMs < 60000; // Modified in last minute

      if (modifiedRecently) {
        result.warnings.push(
          '⚠️  This visual was recently modified. Ensure you\'re not overwriting recent changes.'
        );
      }
    }

    result.proposals.push({
      type: 'update',
      target: 'visual',
      path: visualPath,
      description: `Update visual: ${containerName}`,
      impact: 'medium',
      warnings: [],
    });
  }

  /**
   * Generate a preview of what will change
   */
  generateChangePreview(validation: ChangeValidationResult): string {
    let preview = '📋 Proposed Changes:\n\n';

    validation.proposals.forEach((proposal, index) => {
      const icon = proposal.type === 'create' ? '➕' : proposal.type === 'delete' ? '🗑️' : '✏️';
      const impactColor = proposal.impact === 'high' ? '🔴' : proposal.impact === 'medium' ? '🟡' : '🟢';

      preview += `${index + 1}. ${icon} ${proposal.description}\n`;
      preview += `   Impact: ${impactColor} ${proposal.impact.toUpperCase()}\n`;

      if (proposal.warnings.length > 0) {
        preview += `   Warnings:\n`;
        proposal.warnings.forEach(w => {
          preview += `   - ⚠️  ${w}\n`;
        });
      }
      preview += '\n';
    });

    if (validation.errors.length > 0) {
      preview += '\n❌ Errors:\n';
      validation.errors.forEach(e => preview += `- ${e}\n`);
    }

    if (validation.warnings.length > 0) {
      preview += '\n⚠️  Warnings:\n';
      validation.warnings.forEach(w => preview += `- ${w}\n`);
    }

    if (validation.requiresApproval) {
      preview += '\n🔒 This change requires explicit approval due to high impact.\n';
    }

    return preview;
  }
}

export const reportChangeValidator = new ReportChangeValidator();
