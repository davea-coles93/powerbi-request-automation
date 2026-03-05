/**
 * TMDL Execution Service
 *
 * Executes change requests by modifying TMDL files directly.
 * This enables proper git-based version control and PR creation.
 */

import * as path from 'path';
import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, AnalysisReport, TriageAnalysis } from '../types/request';
import { MCPClient } from './mcpClient';

export interface TmdlExecutionResult {
  success: boolean;
  changes: TmdlChange[];
  error?: string;
}

export interface TmdlChange {
  type: 'create' | 'update' | 'delete';
  tableName: string;
  measureName: string;
  expression?: string;
  formatString?: string;
  description?: string;
  previousExpression?: string;
}

export class TmdlExecutionService {
  private anthropic: Anthropic | null = null;
  private modelsPath: string;
  private tmslExecutorPath: string;
  private mcpClient: MCPClient | null = null;

  constructor(modelsPath: string, tmslExecutorPath: string) {
    this.modelsPath = modelsPath;
    this.tmslExecutorPath = tmslExecutorPath;

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }

    // Initialize MCP client - backend will spawn the server as a child process
    const mcpServerPath = '/app/mcp-servers/powerbi-semantic/build/index.js';
    this.mcpClient = new MCPClient(mcpServerPath);
  }

  /**
   * Execute a change request using Claude-powered DAX generation
   */
  async executeRequest(
    request: ChangeRequest,
    pbipPath: string
  ): Promise<TmdlExecutionResult> {
    try {
      const fullPath = path.join(this.modelsPath, pbipPath);
      console.log(`[TMDL] Processing model: ${fullPath}`);

      // Use Claude for intelligent DAX generation, fall back to rule-based
      let changes: TmdlChange[];
      if (this.anthropic) {
        changes = await this.generateChangesWithClaude(request);
      } else {
        changes = this.generateSimpleChanges(request);
      }

      if (!changes || changes.length === 0) {
        return {
          success: false,
          changes: [],
          error: 'No changes generated',
        };
      }

      // Log the generated changes (skip MCP apply in demo mode
      // since we don't have a live PowerBI model connected)
      console.log(`[TMDL] Generated ${changes.length} change(s):`);
      for (const change of changes) {
        console.log(`  ${change.type} ${change.measureName} in ${change.tableName}`);
        if (change.expression) console.log(`    DAX: ${change.expression}`);
      }

      return {
        success: true,
        changes,
      };
    } catch (error) {
      console.error('[TMDL] Execution error:', error);
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze a request with full model context and produce a thorough impact assessment
   */
  async analyzeRequest(
    request: ChangeRequest,
    triageAnalysis: TriageAnalysis
  ): Promise<AnalysisReport> {
    console.log(`[TMDL] Analyzing request: ${request.title}`);

    // Read the full model context for informed analysis
    const modelContext = await this.readModelContext(request.clientId, request.modelName);

    if (this.anthropic) {
      try {
        return await this.analyzeWithClaude(request, triageAnalysis, modelContext);
      } catch (error) {
        console.error('[TMDL] Claude analysis failed, using fallback:', error);
      }
    }

    // Fallback: rule-based analysis
    return this.buildFallbackReport(request, triageAnalysis);
  }

  /**
   * Read all model context: MODEL_CONTEXT.md, tables, measures, relationships
   */
  private async readModelContext(clientId: string, modelName: string): Promise<string> {
    const clientDir = path.join(this.modelsPath, clientId);
    let context = '';

    try {
      // 1. Read MODEL_CONTEXT.md if it exists (client + business context)
      const contextMdPath = path.join(clientDir, 'MODEL_CONTEXT.md');
      if (fs.existsSync(contextMdPath)) {
        context += '=== MODEL CONTEXT (Business Rules & Conventions) ===\n';
        context += fs.readFileSync(contextMdPath, 'utf-8');
        context += '\n\n';
      }

      // 2. Find the SemanticModel directory
      const entries = fs.readdirSync(clientDir);
      const semanticModelDir = entries.find(e => e.endsWith('.SemanticModel'));
      if (!semanticModelDir) {
        context += '⚠ No SemanticModel directory found — model may be in .pbix format (not decomposed).\n';
        return context;
      }

      const definitionPath = path.join(clientDir, semanticModelDir, 'definition');
      if (!fs.existsSync(definitionPath)) {
        return context + '⚠ No definition directory found in SemanticModel.\n';
      }

      // 3. Read relationships
      const relPath = path.join(definitionPath, 'relationships.tmdl');
      if (fs.existsSync(relPath)) {
        context += '=== RELATIONSHIPS ===\n';
        context += fs.readFileSync(relPath, 'utf-8');
        context += '\n\n';
      }

      // 4. Read all table definitions (skip auto-generated LocalDateTable/DateTableTemplate)
      const tablesDir = path.join(definitionPath, 'tables');
      if (fs.existsSync(tablesDir)) {
        const tableFiles = fs.readdirSync(tablesDir)
          .filter(f => f.endsWith('.tmdl'))
          .filter(f => !f.startsWith('LocalDateTable_') && !f.startsWith('DateTableTemplate_'));

        context += '=== TABLES, COLUMNS & MEASURES ===\n';
        for (const tableFile of tableFiles) {
          const tablePath = path.join(tablesDir, tableFile);
          const tableContent = fs.readFileSync(tablePath, 'utf-8');
          context += `\n--- ${tableFile} ---\n`;
          context += tableContent;
          context += '\n';
        }
      }
    } catch (error) {
      console.error('[TMDL] Error reading model context:', error);
      context += `\n⚠ Error reading model files: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
    }

    return context;
  }

  /**
   * Full Claude-powered analysis with model context and impact assessment
   */
  private async analyzeWithClaude(
    request: ChangeRequest,
    triageAnalysis: TriageAnalysis,
    modelContext: string
  ): Promise<AnalysisReport> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized');

    const systemPrompt = `You are a senior PowerBI/DAX consultant performing a thorough impact assessment on a change request. You have full access to the semantic model definition (TMDL files) including all tables, columns, measures, relationships, and business context.

Your job is to:
1. UNDERSTAND the existing model — what tables, columns, measures, and relationships exist
2. ASSESS what the user is asking for and how it fits into the existing model
3. IDENTIFY any risks, dependencies, or naming conflicts
4. PROPOSE exact DAX changes with correct table/column references from the actual model
5. FLAG any concerns the reviewer should know about
6. ADVISE the reviewing engineer on knock-on effects — what else in the model might need attention as a consequence of these changes

You must respond with a JSON object (no markdown, no explanation outside JSON) with this exact structure:
{
  "summary": "1-2 sentence summary of what you recommend and why",
  "reasoning": "Detailed explanation: what exists today, what the user needs, why your approach is correct, what alternatives you considered",
  "proposedChanges": [
    {
      "type": "create" | "update" | "delete",
      "tableName": "exact table name from the model",
      "measureName": "measure name following the model's naming conventions",
      "expression": "DAX expression using ACTUAL column/table names from the model",
      "formatString": "format string matching model conventions",
      "description": "what this measure does and how it fits into the model"
    }
  ],
  "estimatedComplexity": "trivial" | "simple" | "moderate" | "complex",
  "affectedObjects": ["list of existing tables, measures, columns, or relationships that are referenced or impacted"],
  "warnings": ["list of concerns: naming conflicts, missing columns, relationship gaps, breaking changes, performance concerns, etc."],
  "knockOnEffects": [
    {
      "area": "short label for the affected area (e.g. 'Time Intelligence Variants', 'Report Visuals', 'Related Measures')",
      "description": "what downstream impact this change may have",
      "recommendation": "what the engineer should do about it",
      "severity": "info" | "warning" | "action_required"
    }
  ]
}

KNOCK-ON EFFECTS GUIDANCE — Think carefully about downstream consequences:
- **Companion measures**: If the model follows a pattern (e.g. base → SPLY → YoY Var → YoY % Change), flag that the engineer should consider adding matching variants for new measures.
- **Existing reports/visuals**: If the change modifies or replaces an existing measure, flag that any reports or visuals referencing it will be affected.
- **Filter context changes**: If a new measure uses CALCULATE with filter overrides, flag which other measures might behave differently when used alongside it.
- **Relationship dependencies**: If the change relies on a specific relationship, flag whether other measures using the same relationship path could be affected.
- **Display folder organization**: If the model uses display folders, recommend where new measures should be placed.
- **Cross-model consistency**: If MODEL_CONTEXT.md mentions multiple models sharing the same schema, flag that the same change may be needed in sibling models.
- **Performance considerations**: If a measure uses expensive patterns (SUMX over large tables, nested iterators), flag potential query performance impact.
- **Security/RLS implications**: If the model has row-level security, flag whether new measures respect existing RLS filters.

CRITICAL RULES:
- Use ONLY table and column names that exist in the model definition provided. Do NOT guess or assume names.
- If the model doesn't have a column you need, flag it in warnings.
- Check for existing measures with similar names — flag potential duplicates.
- Follow the naming conventions documented in MODEL_CONTEXT.md.
- For time intelligence, verify a Date table exists and check the relationship type (active vs inactive).
- For DIVIDE(), always use it instead of raw division.
- If a measure references another measure, verify that measure exists.
- Consider whether existing measures should be reused as building blocks.
- Flag if inactive relationships need USERELATIONSHIP().`;

    const userPrompt = `## Change Request
Title: ${request.title}
Description: ${request.description}
Client: ${request.clientId}
Model: ${request.modelName}
Change Type: ${request.changeType}
Triage Result: ${triageAnalysis.triageResult} (confidence: ${(triageAnalysis.confidence * 100).toFixed(0)}%)
Triage Reasoning: ${triageAnalysis.reasoning}

## Full Model Definition

${modelContext || '⚠ No model context available — the model may not be in TMDL format. Use reasonable defaults but flag this in warnings.'}

## Your Task
Perform a thorough impact assessment and propose the exact changes needed. Validate every table/column reference against the model definition above. Identify any risks or concerns.`;

    console.log('[TMDL] Running Claude impact assessment with full model context...');
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON, handling potential markdown wrapping
    let text = content.text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const analysis = JSON.parse(text) as AnalysisReport;

    // Validate and ensure all required fields
    return {
      summary: analysis.summary || `Proposed changes for "${request.title}"`,
      reasoning: analysis.reasoning || triageAnalysis.reasoning,
      proposedChanges: (analysis.proposedChanges || []).map(c => ({
        type: c.type,
        tableName: c.tableName,
        measureName: c.measureName,
        expression: c.expression,
        formatString: c.formatString,
        description: c.description,
      })),
      estimatedComplexity: analysis.estimatedComplexity || triageAnalysis.estimatedComplexity,
      affectedObjects: analysis.affectedObjects || [],
      warnings: analysis.warnings || [],
      knockOnEffects: (analysis.knockOnEffects || []).map(e => ({
        area: e.area,
        description: e.description,
        recommendation: e.recommendation,
        severity: e.severity || 'info',
      })),
    };
  }

  /**
   * Fallback report when Claude is unavailable
   */
  private buildFallbackReport(
    request: ChangeRequest,
    triageAnalysis: TriageAnalysis
  ): AnalysisReport {
    const proposedChanges = this.generateSimpleChanges(request);
    const warnings: string[] = [
      'Analysis generated using rule-based fallback (no API key). Results may be limited.',
    ];
    if (proposedChanges.length === 0) {
      warnings.push('No changes could be generated from this request. Consider providing more detail.');
    }

    return {
      summary: `Proposed ${proposedChanges.length} change(s) for "${request.title}"`,
      reasoning: triageAnalysis.suggestedApproach || triageAnalysis.reasoning,
      proposedChanges: proposedChanges.map(c => ({
        type: c.type,
        tableName: c.tableName,
        measureName: c.measureName,
        expression: c.expression,
        formatString: c.formatString,
        description: c.description,
      })),
      estimatedComplexity: triageAnalysis.estimatedComplexity,
      affectedObjects: triageAnalysis.affectedObjects || [],
      warnings,
      knockOnEffects: [],
    };
  }

  /**
   * Use Claude to generate DAX changes from a natural language request
   */
  private async generateChangesWithClaude(request: ChangeRequest): Promise<TmdlChange[]> {
    if (!this.anthropic) return [];

    const prompt = `You are a PowerBI DAX expert. Generate the exact measures needed for this change request.

Request Title: ${request.title}
Request Description: ${request.description}
Change Type: ${request.changeType}

Respond with a JSON array of changes. Each change object has:
- type: "create" | "update" | "delete"
- tableName: the table to add the measure to (use "Sales" as default if unclear)
- measureName: the DAX measure name (use spaces for readability, e.g. "Profit Margin %")
- expression: the DAX expression
- formatString: DAX format string (e.g. "0.00%", "$#,##0", "#,##0")
- description: brief description of what the measure does

IMPORTANT:
- Return ONLY the JSON array, no markdown formatting, no explanation
- Use standard DAX functions
- For percentage/ratio measures, use DIVIDE() to avoid division by zero
- Use descriptive measure names
- Assume common table/column names if not specified`;

    try {
      console.log('[TMDL] Generating changes with Claude...');
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON, handling potential markdown wrapping
      let text = content.text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const changes = JSON.parse(text) as TmdlChange[];
      console.log(`[TMDL] Claude generated ${changes.length} change(s)`);
      return changes;
    } catch (error) {
      console.error('[TMDL] Claude generation failed, falling back to rule-based:', error);
      return this.generateSimpleChanges(request);
    }
  }

  /**
   * Apply a single change using PowerBI MCP manage_measure tool
   */
  private async applyChangeTom(modelPath: string, change: TmdlChange): Promise<void> {
    console.log(`[TMDL] Applying ${change.type}: ${change.measureName} in ${change.tableName}`);

    if (change.type !== 'create') {
      throw new Error(`Operation '${change.type}' not yet implemented`);
    }

    // Find the semantic model path
    const semanticModelPath = modelPath.includes('.pbip')
      ? path.join(path.dirname(modelPath), path.basename(modelPath, '.pbip') + '.SemanticModel')
      : modelPath;

    try {
      // Connect MCP client if not already connected
      if (!this.mcpClient) {
        throw new Error('MCP client not initialized');
      }

      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.connect();
      }

      // Use PowerBI MCP to create the measure
      const result = await this.mcpClient.call('manage_measure', {
        model_path: semanticModelPath,
        table_name: change.tableName,
        measure_name: change.measureName,
        operation: 'create',
        expression: change.expression,
        format_string: change.formatString || undefined,
        description: change.description || undefined,
      });

      console.log(`[TMDL] MCP result:`, JSON.stringify(result));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to ${change.type} measure: ${errorMessage}`);
    }
  }

  /**
   * Simple rule-based change generation (temporary - will be replaced with Claude)
   */
  private generateSimpleChanges(request: ChangeRequest): TmdlChange[] {
    const description = request.description.toLowerCase();

    // Simple pattern: create YTD measure
    if (description.includes('year-to-date') || description.includes('ytd')) {
      return [
        {
          type: 'create',
          tableName: 'Sales',
          measureName: 'Sales Amount YTD',
          expression: 'TOTALYTD(SUM(Sales[SalesAmount]), \'Date\'[Date])',
          formatString: '$#,##0',
          description: 'Year-to-date sales amount',
        },
      ];
    }

    return [];
  }

  /**
   * Get the files changed for git staging (deprecated - MCPs handle file changes automatically)
   */
  getChangedFiles(modelPath: string, changes: TmdlChange[]): string[] {
    // Deprecated: MCPs handle file changes automatically
    // Git will detect the changes made by the MCP
    return [];
  }
}
