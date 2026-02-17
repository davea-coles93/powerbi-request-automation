import Anthropic from '@anthropic-ai/sdk';
import { ChangeRequest, CreateRequestDTO } from '../types/request';

export interface ClarificationQuestion {
  question: string;
  context: string;
  suggestedAnswers?: string[];
  required: boolean;
}

export interface ClarificationResult {
  needsClarification: boolean;
  questions: ClarificationQuestion[];
  confidence: number;
  missingInfo: string[];
}

export interface NotificationResult {
  sent: boolean;
  channel: 'teams' | 'email';
  recipient: string;
  messageId?: string;
  error?: string;
}

const CLARIFICATION_PROMPT = `You are analyzing a PowerBI change request to determine if it has enough information to proceed.

Check for:
1. Specific measure/report/table names mentioned
2. Clear description of current vs desired behavior
3. Any DAX formulas or calculation logic provided
4. Affected time periods or filters
5. Expected output format or values

If information is missing, generate specific clarifying questions.

Respond with JSON:
{
  "needsClarification": true/false,
  "confidence": 0.0-1.0,
  "missingInfo": ["list of missing information"],
  "questions": [
    {
      "question": "Clear question to ask",
      "context": "Why this is needed",
      "suggestedAnswers": ["option1", "option2"],
      "required": true/false
    }
  ]
}`;

export class ClarificationService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async analyzeForClarification(request: CreateRequestDTO): Promise<ClarificationResult> {
    // First, rule-based check for obvious missing info
    const ruleBasedResult = this.ruleBasedCheck(request);
    if (ruleBasedResult.needsClarification && ruleBasedResult.confidence > 0.8) {
      return ruleBasedResult;
    }

    // Use Claude for more nuanced analysis
    if (!process.env.ANTHROPIC_API_KEY) {
      return ruleBasedResult;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: CLARIFICATION_PROMPT,
        messages: [{
          role: 'user',
          content: `Analyze this request:\n\nTitle: ${request.title}\nDescription: ${request.description}\nClient: ${request.clientId}\nModel: ${request.modelName}`
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
    } catch (error) {
      console.error('Clarification analysis failed:', error);
    }

    return ruleBasedResult;
  }

  private ruleBasedCheck(request: CreateRequestDTO): ClarificationResult {
    const questions: ClarificationQuestion[] = [];
    const missingInfo: string[] = [];
    const desc = request.description.toLowerCase();

    // Check for vague descriptions
    if (request.description.length < 50) {
      missingInfo.push('Description is too brief');
      questions.push({
        question: 'Can you provide more details about what you need changed?',
        context: 'The description is quite brief and we want to make sure we understand the full requirement.',
        required: true,
      });
    }

    // Check for missing specifics
    if (!this.hasMeasureReference(desc) && !this.hasReportReference(desc)) {
      missingInfo.push('No specific measure or report mentioned');
      questions.push({
        question: 'Which specific measure, report, or visual needs to be changed?',
        context: 'We need to know exactly which component to modify.',
        suggestedAnswers: ['A specific measure (please name it)', 'A report page', 'A visual/chart', 'Multiple items'],
        required: true,
      });
    }

    // Check for calculation changes without formula
    if (this.isCalculationRequest(desc) && !this.hasFormulaOrLogic(desc)) {
      missingInfo.push('Calculation logic not specified');
      questions.push({
        question: 'What should the calculation logic be?',
        context: 'For calculation changes, we need to understand the exact formula or logic you want.',
        suggestedAnswers: ['I can provide the DAX formula', 'I\'ll describe the logic in words', 'Please suggest based on best practice'],
        required: true,
      });
    }

    // Check for comparison/change requests without baseline
    if (this.isComparisonRequest(desc) && !this.hasBaseline(desc)) {
      missingInfo.push('No baseline or comparison point specified');
      questions.push({
        question: 'What should be compared against what?',
        context: 'For comparison metrics, we need to know the baseline period or value.',
        suggestedAnswers: ['Previous year', 'Previous month', 'Budget/Target', 'Custom period'],
        required: true,
      });
    }

    // Check for "not working" without specifics
    if (desc.includes('not working') || desc.includes('broken') || desc.includes('wrong')) {
      if (!this.hasExpectedBehavior(desc)) {
        missingInfo.push('Expected behavior not described');
        questions.push({
          question: 'What should the correct behavior or result look like?',
          context: 'To fix the issue, we need to understand what the expected outcome should be.',
          required: true,
        });
      }
      if (!this.hasCurrentBehavior(desc)) {
        missingInfo.push('Current behavior not described');
        questions.push({
          question: 'What is currently happening (the incorrect behavior)?',
          context: 'Understanding the current state helps us identify the root cause.',
          required: true,
        });
      }
    }

    return {
      needsClarification: questions.length > 0,
      questions,
      confidence: questions.length === 0 ? 0.9 : 0.5,
      missingInfo,
    };
  }

  private hasMeasureReference(desc: string): boolean {
    return /\b(measure|metric|kpi|calculation|formula)\b/i.test(desc) &&
           /\b[A-Z][a-zA-Z\s]+(%|ratio|total|sum|count|average)\b/i.test(desc);
  }

  private hasReportReference(desc: string): boolean {
    return /\b(report|page|dashboard|visual|chart|table|matrix)\b/i.test(desc);
  }

  private isCalculationRequest(desc: string): boolean {
    return /\b(calculate|formula|dax|computation|derive|sum|average|divide)\b/i.test(desc);
  }

  private hasFormulaOrLogic(desc: string): boolean {
    return /\b(divide|sum|calculate|if|switch|sumx|filter|\+|\-|\*|\/|=)\b/i.test(desc) ||
           desc.includes('[') || desc.includes('(');
  }

  private isComparisonRequest(desc: string): boolean {
    return /\b(compare|versus|vs|yoy|mom|year.over|month.over|growth|change|variance)\b/i.test(desc);
  }

  private hasBaseline(desc: string): boolean {
    return /\b(last year|previous|prior|budget|target|baseline|same period)\b/i.test(desc);
  }

  private hasExpectedBehavior(desc: string): boolean {
    return /\b(should|expect|want|need|correct|proper|supposed)\b/i.test(desc);
  }

  private hasCurrentBehavior(desc: string): boolean {
    return /\b(currently|now|showing|displaying|returns|gives|produces)\b/i.test(desc);
  }

  // Send clarification request via Teams
  async sendTeamsNotification(
    request: ChangeRequest,
    questions: ClarificationQuestion[],
    webhookUrl?: string
  ): Promise<NotificationResult> {
    const url = webhookUrl || process.env.TEAMS_WEBHOOK_URL;

    if (!url) {
      return {
        sent: false,
        channel: 'teams',
        recipient: 'unknown',
        error: 'Teams webhook URL not configured',
      };
    }

    const questionsList = questions
      .map((q, i) => `${i + 1}. ${q.question}${q.required ? ' *(required)*' : ''}`)
      .join('\n\n');

    const card = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: 'F59E0B',
      summary: `Clarification needed: ${request.title}`,
      sections: [{
        activityTitle: `Clarification Needed for PowerBI Request`,
        activitySubtitle: `Request ID: ${request.id}`,
        facts: [
          { name: 'Client', value: request.clientId },
          { name: 'Model', value: request.modelName },
          { name: 'Request', value: request.title },
        ],
        text: `We need some additional information before we can process this request:\n\n${questionsList}`,
      }],
      potentialAction: [{
        '@type': 'OpenUri',
        name: 'Reply with Details',
        targets: [{
          os: 'default',
          uri: `mailto:powerbi-requests@company.com?subject=RE: ${encodeURIComponent(request.title)}&body=${encodeURIComponent('Additional details:\n\n')}`,
        }],
      }],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (response.ok) {
        return {
          sent: true,
          channel: 'teams',
          recipient: 'Teams Channel',
        };
      } else {
        return {
          sent: false,
          channel: 'teams',
          recipient: 'Teams Channel',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        sent: false,
        channel: 'teams',
        recipient: 'Teams Channel',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send clarification request via email (using SendGrid or similar)
  async sendEmailNotification(
    request: ChangeRequest,
    questions: ClarificationQuestion[],
    recipientEmail: string
  ): Promise<NotificationResult> {
    // For POC, just log the email
    console.log(`[EMAIL] To: ${recipientEmail}`);
    console.log(`[EMAIL] Subject: Clarification needed: ${request.title}`);
    console.log(`[EMAIL] Questions:`, questions);

    // In production, integrate with SendGrid, Azure Communication Services, etc.
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    return {
      sent: true,
      channel: 'email',
      recipient: recipientEmail,
      messageId: `mock-${Date.now()}`,
    };
  }

  // Format questions for display
  formatQuestionsForDisplay(questions: ClarificationQuestion[]): string {
    return questions.map((q, i) => {
      let text = `${i + 1}. ${q.question}`;
      if (q.context) text += `\n   Context: ${q.context}`;
      if (q.suggestedAnswers?.length) {
        text += `\n   Options: ${q.suggestedAnswers.join(', ')}`;
      }
      return text;
    }).join('\n\n');
  }
}
