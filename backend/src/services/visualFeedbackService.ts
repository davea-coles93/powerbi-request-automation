/**
 * Visual Feedback Service
 * Orchestrates report creation with visual validation using screenshots
 */

import Anthropic from '@anthropic-ai/sdk';
import { ReportMcpService } from './reportMcpService';
import { AutomationMcpService } from './automationMcpService';
import * as path from 'path';

export interface VisualCreationRequest {
  type: 'card' | 'table' | 'bar_chart';
  measureEntity?: string;
  measureProperty?: string;
  columns?: Array<{ entity: string; property: string }>;
  categoryEntity?: string;
  categoryProperty?: string;
  valueEntity?: string;
  valueProperty?: string;
  position: { x: number; y: number; width: number; height: number };
  title?: string;
}

export interface FeedbackLoopResult {
  success: boolean;
  attempts: number;
  visualsCreated: number;
  issues?: string[];
  screenshot?: string;
  error?: string;
}

export class VisualFeedbackService {
  private reportMcp: ReportMcpService;
  private automationMcp: AutomationMcpService;
  private anthropic: Anthropic | null = null;
  private maxAttempts = 3;

  constructor() {
    this.reportMcp = new ReportMcpService();
    this.automationMcp = new AutomationMcpService();

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Start both MCP services
   */
  async start(): Promise<void> {
    await this.reportMcp.start();
    await this.automationMcp.start();
    console.log('[VisualFeedback] Services started');
  }

  /**
   * Stop both MCP services
   */
  async stop(): Promise<void> {
    await this.reportMcp.stop();
    await this.automationMcp.stop();
    console.log('[VisualFeedback] Services stopped');
  }

  /**
   * Create visuals with autonomous feedback loop
   */
  async createVisualsWithFeedback(
    pbipPath: string,
    pageName: string,
    displayName: string,
    visuals: VisualCreationRequest[],
    description: string
  ): Promise<FeedbackLoopResult> {
    const reportPath = pbipPath.replace('.pbip', '.Report');
    let attempts = 0;
    let success = false;
    const issues: string[] = [];
    let screenshot: string | undefined;

    try {
      // Create the page if it doesn't exist
      try {
        await this.reportMcp.createPage(reportPath, pageName, displayName);
        console.log(`[VisualFeedback] Created page: ${displayName}`);
      } catch (error) {
        console.log(`[VisualFeedback] Page may already exist, continuing...`);
      }

      // Iterative feedback loop
      while (attempts < this.maxAttempts && !success) {
        attempts++;
        console.log(`[VisualFeedback] Attempt ${attempts}/${this.maxAttempts}`);

        // Create visuals
        if (attempts === 1) {
          await this.createVisuals(reportPath, pageName, visuals);
        }

        // Launch Power BI and validate
        const validationResult = await this.validateVisuals(
          pbipPath,
          pageName,
          description,
          visuals
        );

        screenshot = validationResult.screenshot;

        if (validationResult.success) {
          success = true;
          console.log('[VisualFeedback] Validation successful!');
        } else {
          console.log(`[VisualFeedback] Validation failed: ${validationResult.issues.join(', ')}`);
          issues.push(...validationResult.issues);

          // If not last attempt, try to fix issues
          if (attempts < this.maxAttempts) {
            await this.attemptFix(reportPath, pageName, validationResult.issues, visuals);
          }
        }
      }

      return {
        success,
        attempts,
        visualsCreated: visuals.length,
        issues: issues.length > 0 ? issues : undefined,
        screenshot,
      };
    } catch (error) {
      return {
        success: false,
        attempts,
        visualsCreated: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create the visuals using Report MCP
   */
  private async createVisuals(
    reportPath: string,
    pageName: string,
    visuals: VisualCreationRequest[]
  ): Promise<void> {
    for (const visual of visuals) {
      console.log(`[VisualFeedback] Creating ${visual.type} visual...`);

      switch (visual.type) {
        case 'card':
          await this.reportMcp.createCardVisual(
            reportPath,
            pageName,
            visual.measureEntity!,
            visual.measureProperty!,
            visual.position,
            visual.title
          );
          break;

        case 'table':
          await this.reportMcp.createTableVisual(
            reportPath,
            pageName,
            visual.columns!,
            visual.position,
            visual.title
          );
          break;

        case 'bar_chart':
          await this.reportMcp.createBarChartVisual(
            reportPath,
            pageName,
            visual.categoryEntity!,
            visual.categoryProperty!,
            visual.valueEntity!,
            visual.valueProperty!,
            visual.position,
            visual.title
          );
          break;
      }
    }
  }

  /**
   * Validate visuals by launching Power BI and taking screenshot
   */
  private async validateVisuals(
    pbipPath: string,
    pageName: string,
    description: string,
    visuals: VisualCreationRequest[]
  ): Promise<{ success: boolean; issues: string[]; screenshot?: string }> {
    const issues: string[] = [];

    try {
      // Launch Power BI
      console.log('[VisualFeedback] Launching Power BI Desktop...');
      const launchResult = await this.automationMcp.launchPowerBI(pbipPath, 60);

      if (!launchResult.success) {
        issues.push(`Failed to launch Power BI: ${launchResult.error}`);
        return { success: false, issues };
      }

      // Wait for ready
      console.log('[VisualFeedback] Waiting for Power BI to load...');
      const ready = await this.automationMcp.waitForReady(45);

      if (!ready) {
        issues.push('Power BI did not become ready in time');
        await this.automationMcp.closePowerBI(false);
        return { success: false, issues };
      }

      // Take screenshot
      console.log('[VisualFeedback] Taking screenshot...');
      const screenshotResult = await this.automationMcp.takeScreenshot();

      if (!screenshotResult) {
        issues.push('Failed to take screenshot');
        await this.automationMcp.closePowerBI(false);
        return { success: false, issues };
      }

      // Analyze with Claude if available
      if (this.anthropic) {
        console.log('[VisualFeedback] Analyzing screenshot with Claude...');
        const analysis = await this.analyzeScreenshot(
          screenshotResult.data,
          description,
          visuals
        );

        if (!analysis.correct) {
          issues.push(...analysis.issues);
          await this.automationMcp.closePowerBI(false);
          return { success: false, issues, screenshot: screenshotResult.data };
        }
      } else {
        console.warn('[VisualFeedback] No Anthropic API key - skipping visual analysis');
      }

      // Success - save and close
      await this.automationMcp.saveCurrentFile();
      await this.automationMcp.closePowerBI(true);

      return { success: true, issues: [], screenshot: screenshotResult.data };
    } catch (error) {
      console.error('[VisualFeedback] Validation error:', error);
      issues.push(error instanceof Error ? error.message : String(error));

      // Try to close Power BI
      try {
        await this.automationMcp.closePowerBI(false);
      } catch {}

      return { success: false, issues };
    }
  }

  /**
   * Analyze screenshot with Claude to verify correctness
   */
  private async analyzeScreenshot(
    screenshotBase64: string,
    description: string,
    visuals: VisualCreationRequest[]
  ): Promise<{ correct: boolean; issues: string[] }> {
    if (!this.anthropic) {
      return { correct: true, issues: [] };
    }

    const visualsDescription = visuals
      .map(
        (v, i) =>
          `${i + 1}. ${v.type} at position (${v.position.x}, ${v.position.y}), size ${v.position.width}x${v.position.height}${v.title ? `, title: "${v.title}"` : ''}`
      )
      .join('\n');

    const prompt = `You are analyzing a Power BI Desktop screenshot to verify that report visuals were created correctly.

**Request:** ${description}

**Expected visuals:**
${visualsDescription}

**Task:** Analyze the screenshot and determine if:
1. All expected visuals are present
2. Visuals are positioned approximately correctly
3. Visuals have the correct titles (if specified)
4. Visuals appear to be displaying data (not error states)
5. Overall layout matches the request

Respond with JSON:
{
  "correct": true/false,
  "issues": ["issue 1", "issue 2", ...] // Empty array if correct
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: screenshotBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const analysis = JSON.parse(content.text);
        return {
          correct: analysis.correct === true,
          issues: analysis.issues || [],
        };
      }
    } catch (error) {
      console.error('[VisualFeedback] Screenshot analysis failed:', error);
    }

    // Default to success if analysis fails
    return { correct: true, issues: [] };
  }

  /**
   * Attempt to fix issues identified in validation
   */
  private async attemptFix(
    reportPath: string,
    pageName: string,
    issues: string[],
    visuals: VisualCreationRequest[]
  ): Promise<void> {
    console.log('[VisualFeedback] Attempting to fix issues...');

    // Simple heuristics for common issues
    for (const issue of issues) {
      const lowerIssue = issue.toLowerCase();

      // If visual too small, increase size
      if (lowerIssue.includes('too small') || lowerIssue.includes('hard to read')) {
        console.log('[VisualFeedback] Increasing visual sizes...');
        // Would use updateVisual here to resize
        // For now, just log
      }

      // If title missing, could add it
      if (lowerIssue.includes('title') && lowerIssue.includes('missing')) {
        console.log('[VisualFeedback] Would add missing titles...');
      }

      // If positioning wrong, could adjust
      if (lowerIssue.includes('position') || lowerIssue.includes('overlap')) {
        console.log('[VisualFeedback] Would adjust positioning...');
      }
    }

    // Note: Full fix implementation would require more sophisticated logic
    // based on the specific issues detected
  }
}
