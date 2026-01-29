import Anthropic from '@anthropic-ai/sdk';
import { ChangeType, TriageResult, TriageAnalysis, CreateRequestDTO } from '../types/request';
import { sanitizeForLLM } from '../utils/validation';

const TRIAGE_SYSTEM_PROMPT = `You are a PowerBI change request triage specialist. Analyze incoming requests and classify them.

Your job is to:
1. Identify the type of change being requested
2. **Understand what currently exists** in the report/model before proposing changes
3. Assess whether it can be automated, needs human assistance, or requires human design
4. Estimate complexity
5. Identify what objects in the model might be affected
6. **Propose changes that ADD to or ENHANCE existing work, not replace it** unless explicitly requested

CRITICAL: Before proposing any changes:
- Check what pages/visuals already exist
- Identify if the request is to CREATE NEW or MODIFY EXISTING
- If modifying, specify exactly what to change without overwriting other work
- If creating, ensure it doesn't conflict with existing content

Change Types:
- dax_formula_tweak: Minor changes to existing DAX formulas (syntax fixes, small logic changes)
- new_measure: Creating new measures from scratch
- modify_measure: Significant modifications to existing measures
- new_calculated_column: Creating calculated columns
- schema_change: Table structure, relationships, or data model changes
- new_report: New report pages or significant visual requirements
- formatting: Visual formatting, colors, layouts
- data_refresh: Data source or refresh configuration issues
- unknown: Cannot determine from description

Triage Results:
- auto_fix: Use this for MOST measure requests. If the request clearly describes what calculation is needed (sums, averages, ratios, percentages, time intelligence, business metrics like revenue/profit/customers), it should be auto_fix. Default to auto_fix unless there's a specific reason not to.
- assisted_fix: Only use this when the request has genuine ambiguity or complex conditional business logic that needs human verification. Do NOT use this just because you're being cautious.
- human_design: Only for architectural changes - new reports, major schema redesigns, fundamental model restructuring
- clarification_needed: Only when the request is genuinely unclear or contradictory

IMPORTANT: Err on the side of auto_fix. Most measure requests (sums, counts, percentages, ratios, time comparisons) are standard patterns that can be safely automated.

Respond with JSON only, no markdown formatting.`;

export class TriageService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async analyzeRequest(request: CreateRequestDTO, repoPath?: string): Promise<TriageAnalysis> {
    // First try rule-based analysis (works without API key)
    const ruleBasedResult = this.ruleBasedAnalysis(request);

    // If no API key configured, use rule-based only
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No API key configured - using rule-based triage');
      return ruleBasedResult;
    }

    // Get current state of report/model if path provided
    let currentState = '';
    if (repoPath) {
      currentState = await this.getCurrentReportState(repoPath, request.clientId, request.modelName);
    }

    const prompt = `Analyze this PowerBI change request:

Client: ${sanitizeForLLM(request.clientId)}
Model: ${sanitizeForLLM(request.modelName)}
Title: ${sanitizeForLLM(request.title)}
Description: ${sanitizeForLLM(request.description)}
Urgency: ${request.urgency}

CURRENT STATE OF REPORT:
${currentState}

IMPORTANT: Review the current state carefully. Propose changes that:
- ADD to existing pages/visuals, don't replace them unless explicitly requested
- If a page already exists, specify adding new visuals to it (not recreating it)
- If visuals already exist, specify modifying specific ones (not deleting all and recreating)

Provide your analysis as JSON with these fields:
{
  "changeType": "<one of the change types>",
  "triageResult": "<one of the triage results>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>",
  "suggestedApproach": "<how to implement if auto/assisted>",
  "estimatedComplexity": "<trivial|simple|moderate|complex>",
  "affectedObjects": ["<list of likely affected tables/measures/columns>"]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const analysis = JSON.parse(content.text) as TriageAnalysis;
      return this.validateAnalysis(analysis);
    } catch (error) {
      console.error('Triage analysis failed, using rule-based fallback:', error);
      return ruleBasedResult;
    }
  }

  /**
   * Get current state of report to understand what exists before proposing changes
   */
  private async getCurrentReportState(repoPath: string, clientId: string, modelName: string): Promise<string> {
    try {
      const fs = require('fs');
      const path = require('path');

      const reportPath = path.join(repoPath, 'models', clientId, `${modelName}.Report`, 'definition');

      if (!fs.existsSync(reportPath)) {
        return 'Report does not exist yet - this will be a new report.';
      }

      let state = '=== EXISTING REPORT STRUCTURE ===\n\n';

      // Read pages
      const pagesIndexPath = path.join(reportPath, 'pages', 'pages.json');
      if (fs.existsSync(pagesIndexPath)) {
        const pagesIndex = JSON.parse(fs.readFileSync(pagesIndexPath, 'utf-8'));
        state += `PAGES (${pagesIndex.pages?.length || 0} total):\n`;

        for (const pageRef of pagesIndex.pages || []) {
          const pagePath = path.join(reportPath, 'pages', pageRef.name, 'page.json');
          if (fs.existsSync(pagePath)) {
            const page = JSON.parse(fs.readFileSync(pagePath, 'utf-8'));
            state += `\n  📄 "${pageRef.displayName}" (${pageRef.name})\n`;

            // Count visuals on this page
            const visualsPath = path.join(reportPath, 'pages', pageRef.name, 'visuals');
            if (fs.existsSync(visualsPath)) {
              const visualContainers = fs.readdirSync(visualsPath);
              state += `     Visuals: ${visualContainers.length}\n`;

              // List visual types
              for (const container of visualContainers.slice(0, 5)) { // Max 5 to avoid too much text
                const visualJsonPath = path.join(visualsPath, container, 'visual.json');
                if (fs.existsSync(visualJsonPath)) {
                  const visual = JSON.parse(fs.readFileSync(visualJsonPath, 'utf-8'));
                  const visualType = visual.visual?.visualType || 'unknown';
                  const title = visual.visual?.visualContainerObjects?.title?.[0]?.properties?.text?.expr?.Literal?.Value || container;
                  state += `       - ${visualType}: ${title}\n`;
                }
              }
              if (visualContainers.length > 5) {
                state += `       ... and ${visualContainers.length - 5} more\n`;
              }
            }
          }
        }
      } else {
        state += 'No pages exist yet.\n';
      }

      state += '\n⚠️  IMPORTANT: Do not propose deleting or replacing existing pages/visuals unless explicitly requested.\n';
      state += 'Propose ADDING new content or MODIFYING specific existing items.\n';

      return state;
    } catch (error) {
      console.error('Failed to read current report state:', error);
      return 'Could not read current report state.';
    }
  }

  // Rule-based triage that works without API key
  private ruleBasedAnalysis(request: CreateRequestDTO): TriageAnalysis {
    const desc = request.description.toLowerCase();
    const title = request.title.toLowerCase();
    const combined = `${title} ${desc}`;

    // Determine change type
    let changeType: ChangeType = 'unknown';
    let triageResult: TriageResult = 'clarification_needed';
    let confidence = 0.6;
    let reasoning = '';
    let suggestedApproach = '';
    let estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' = 'moderate';

    // DAX formula tweaks
    if (/\b(fix|correct|typo|syntax|error|bug)\b.*\b(formula|dax|measure|calculation)\b/i.test(combined) ||
        /\b(formula|dax|measure)\b.*\b(fix|correct|wrong|incorrect)\b/i.test(combined)) {
      changeType = 'dax_formula_tweak';
      triageResult = 'auto_fix';
      confidence = 0.85;
      reasoning = 'Request indicates a DAX formula correction - suitable for automated fix';
      suggestedApproach = 'Identify the measure, analyze the error, generate corrected DAX';
      estimatedComplexity = 'simple';
    }
    // New measure
    else if (/\b(create|add|new|need)\b.*\bmeasure\b/i.test(combined) ||
             /\bmeasure\b.*\b(create|add|new)\b/i.test(combined)) {
      changeType = 'new_measure';

      // Patterns that indicate clear, well-defined measures -> auto_fix
      const autoFixPatterns = [
        // Time intelligence
        /\b(yoy|year.over.year|ytd|mtd|qtd|rolling|cumulative|previous\s*(year|month|quarter))\b/i,
        // Aggregations with clear targets
        /\b(sum|total|count|average|avg|min|max|distinct\s*count)\b.*\b(of|for)\b/i,
        // Ratios and percentages
        /\b(ratio|percentage|percent|%|margin|rate)\b/i,
        // Variance and growth
        /\b(variance|growth|change|difference|delta)\b/i,
        // Common business metrics
        /\b(revenue|sales|profit|cost|price|quantity|units|orders|customers|lifetime\s*value|clv|ltv|aov|arpu)\b/i,
        // Running totals
        /\b(running|cumulative)\s*(total|sum|count)\b/i,
      ];

      // Check if description is clear enough for auto-fix
      const isWellDefined = autoFixPatterns.some(pattern => pattern.test(combined));
      // Check for ambiguous language that needs clarification
      const needsClarification = /\b(maybe|possibly|might|could|not sure|unclear|depends|various|multiple options)\b/i.test(combined);
      // Check for complex requirements
      const isComplex = /\b(depending on|based on multiple|complex logic|business rules|exceptions|special cases)\b/i.test(combined);

      if (isWellDefined && !needsClarification && !isComplex) {
        triageResult = 'auto_fix';
        confidence = 0.9;
        reasoning = 'Clear measure request with well-defined requirements - suitable for automation';
        suggestedApproach = 'Generate DAX measure based on the specified calculation';
        estimatedComplexity = 'simple';
      } else if (needsClarification || /\b(unclear|ambiguous|need more info)\b/i.test(combined)) {
        triageResult = 'clarification_needed';
        confidence = 0.7;
        reasoning = 'Request contains ambiguous language - clarification recommended';
        suggestedApproach = 'Request clarification on specific requirements';
        estimatedComplexity = 'moderate';
      } else if (isComplex) {
        triageResult = 'assisted_fix';
        confidence = 0.75;
        reasoning = 'Measure involves complex business logic - human review recommended';
        suggestedApproach = 'Generate measure and flag for review';
        estimatedComplexity = 'moderate';
      } else {
        // Default: if reasonably clear, auto-fix with lower confidence
        triageResult = 'auto_fix';
        confidence = 0.75;
        reasoning = 'New measure request - appears straightforward';
        suggestedApproach = 'Generate measure based on description';
        estimatedComplexity = 'simple';
      }
    }
    // Modify existing measure
    else if (/\b(update|change|modify|edit|alter)\b.*\bmeasure\b/i.test(combined)) {
      changeType = 'modify_measure';
      triageResult = 'assisted_fix';
      confidence = 0.75;
      reasoning = 'Modification to existing measure - requires review of current implementation';
      suggestedApproach = 'Retrieve current measure, analyze change request, propose modification';
      estimatedComplexity = 'moderate';
    }
    // Schema changes
    else if (/\b(relationship|table|schema|model|column)\b.*\b(add|change|remove|delete|create)\b/i.test(combined) ||
             /\b(add|change|remove|delete|create)\b.*\b(relationship|table|column)\b/i.test(combined)) {
      changeType = 'schema_change';
      triageResult = 'human_design';
      confidence = 0.8;
      reasoning = 'Schema changes require careful consideration of data model impact';
      estimatedComplexity = 'complex';
    }
    // New report
    else if (/\b(new|create|build)\b.*\b(report|page|dashboard|visual)\b/i.test(combined)) {
      changeType = 'new_report';
      triageResult = 'human_design';
      confidence = 0.85;
      reasoning = 'New report creation requires design decisions and stakeholder input';
      estimatedComplexity = 'complex';
    }
    // Formatting
    else if (/\b(format|color|font|style|visual|layout|theme)\b/i.test(combined)) {
      changeType = 'formatting';
      triageResult = 'auto_fix';
      confidence = 0.7;
      reasoning = 'Visual formatting change - typically straightforward';
      suggestedApproach = 'Apply formatting changes to specified elements';
      estimatedComplexity = 'trivial';
    }

    return {
      changeType,
      triageResult,
      confidence,
      reasoning: reasoning || 'Classified using pattern matching - manual review recommended',
      suggestedApproach,
      estimatedComplexity,
      affectedObjects: [],
    };
  }

  private validateAnalysis(analysis: TriageAnalysis): TriageAnalysis {
    const validChangeTypes: ChangeType[] = [
      'dax_formula_tweak', 'new_measure', 'modify_measure', 'new_calculated_column',
      'schema_change', 'new_report', 'formatting', 'data_refresh', 'unknown'
    ];
    const validTriageResults: TriageResult[] = [
      'auto_fix', 'assisted_fix', 'human_design', 'clarification_needed'
    ];

    if (!validChangeTypes.includes(analysis.changeType)) {
      analysis.changeType = 'unknown';
    }
    if (!validTriageResults.includes(analysis.triageResult)) {
      analysis.triageResult = 'clarification_needed';
    }
    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
      analysis.confidence = 0.5;
    }

    return analysis;
  }

  private getFallbackAnalysis(): TriageAnalysis {
    return {
      changeType: 'unknown',
      triageResult: 'clarification_needed',
      confidence: 0,
      reasoning: 'Unable to analyze request - manual review required',
      estimatedComplexity: 'complex',
    };
  }

  // Quick classification without API call for obvious patterns
  quickClassify(description: string): { changeType: ChangeType; confidence: number } | null {
    const lower = description.toLowerCase();

    // Pattern matching for common request types
    const patterns: { pattern: RegExp; changeType: ChangeType; confidence: number }[] = [
      { pattern: /\b(fix|correct|typo|syntax)\b.*\b(formula|dax|measure)\b/i, changeType: 'dax_formula_tweak', confidence: 0.8 },
      { pattern: /\b(create|add|new)\b.*\bmeasure\b/i, changeType: 'new_measure', confidence: 0.85 },
      { pattern: /\b(update|change|modify)\b.*\bmeasure\b/i, changeType: 'modify_measure', confidence: 0.8 },
      { pattern: /\b(calculated|calc)\b.*\bcolumn\b/i, changeType: 'new_calculated_column', confidence: 0.85 },
      { pattern: /\b(relationship|table|schema|model)\b.*\b(add|change|remove)\b/i, changeType: 'schema_change', confidence: 0.75 },
      { pattern: /\b(new|create)\b.*\b(report|page|dashboard)\b/i, changeType: 'new_report', confidence: 0.8 },
      { pattern: /\b(format|color|font|visual|layout)\b/i, changeType: 'formatting', confidence: 0.7 },
      { pattern: /\b(refresh|data source|connection|gateway)\b/i, changeType: 'data_refresh', confidence: 0.75 },
    ];

    for (const { pattern, changeType, confidence } of patterns) {
      if (pattern.test(lower)) {
        return { changeType, confidence };
      }
    }

    return null;
  }
}
