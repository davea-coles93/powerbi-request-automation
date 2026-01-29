import Anthropic from '@anthropic-ai/sdk';
import { ChangeType, TriageResult, TriageAnalysis, CreateRequestDTO } from '../types/request';

const TRIAGE_SYSTEM_PROMPT = `You are a PowerBI change request triage specialist. Analyze incoming requests and classify them.

Your job is to:
1. Identify the type of change being requested
2. Assess whether it can be automated, needs human assistance, or requires human design
3. Estimate complexity
4. Identify what objects in the model might be affected

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
- auto_fix: Simple changes that can be executed automatically (formula tweaks, simple new measures, formatting)
- assisted_fix: Changes that Claude can implement but should have human review (moderate complexity)
- human_design: Complex requirements needing human architecture decisions (new reports, major schema changes)
- clarification_needed: Request is unclear or missing critical information

Respond with JSON only, no markdown formatting.`;

export class TriageService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async analyzeRequest(request: CreateRequestDTO): Promise<TriageAnalysis> {
    // First try rule-based analysis (works without API key)
    const ruleBasedResult = this.ruleBasedAnalysis(request);

    // If no API key configured, use rule-based only
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No API key configured - using rule-based triage');
      return ruleBasedResult;
    }

    const prompt = `Analyze this PowerBI change request:

Client: ${request.clientId}
Model: ${request.modelName}
Title: ${request.title}
Description: ${request.description}
Urgency: ${request.urgency}

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
      if (/\b(yoy|year.over.year|ytd|mtd|rolling|cumulative)\b/i.test(combined)) {
        triageResult = 'auto_fix';
        confidence = 0.8;
        reasoning = 'Request for a common time intelligence measure - can be auto-generated';
        suggestedApproach = 'Generate appropriate time intelligence DAX pattern';
        estimatedComplexity = 'simple';
      } else {
        triageResult = 'assisted_fix';
        confidence = 0.7;
        reasoning = 'New measure request - may need clarification on exact requirements';
        suggestedApproach = 'Generate measure based on description, human review recommended';
        estimatedComplexity = 'moderate';
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
