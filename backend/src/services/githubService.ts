/**
 * GitHub Integration Service
 * Handles real git operations and PR creation for PowerBI model changes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Default reviewers for PRs - can be configured via environment
const DEFAULT_REVIEWERS = process.env.PR_REVIEWERS?.split(',') || [];
const BASE_BRANCH = process.env.BASE_BRANCH || 'master';

export interface GitHubPRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branch?: string;
  error?: string;
}

export interface ClientModel {
  id: string;
  name: string;
  file: string;
  description: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  models: ClientModel[];
}

export interface ClientConfig {
  clients: Client[];
}

export interface ChangeDetails {
  requestId: string;
  clientId: string;
  clientName?: string;
  modelId: string;
  modelName?: string;
  title: string;
  description: string;
  changeType?: string;
  changes: string[];
  testResults?: Array<{ name: string; passed: boolean; message: string }>;
  executionLogs?: Array<{ action: string; details: string; status: string }>;
}

export class GitHubService {
  private repoPath: string;
  private modelsPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.modelsPath = path.join(repoPath, 'models');
  }

  /**
   * Load client configuration
   */
  async getClients(): Promise<ClientConfig> {
    const configPath = path.join(this.modelsPath, 'clients.json');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get a specific client by ID
   */
  async getClient(clientId: string): Promise<Client | undefined> {
    const config = await this.getClients();
    return config.clients.find(c => c.id === clientId);
  }

  /**
   * Get model path for a client's model
   */
  async getModelPath(clientId: string, modelId: string): Promise<string | null> {
    const client = await this.getClient(clientId);
    if (!client) return null;

    const model = client.models.find(m => m.id === modelId);
    if (!model) return null;

    return path.join(this.modelsPath, model.file);
  }

  /**
   * Create a branch from main, commit changes, create PR with reviewers
   */
  async createPullRequest(details: ChangeDetails): Promise<GitHubPRResult> {
    // Branch name includes request ID for traceability
    const branchName = `request/${details.requestId}`;
    const shortId = details.requestId.slice(0, 8);

    try {
      // Check if gh CLI is available
      await execAsync('gh --version', { cwd: this.repoPath });

      // Get client and model info for PR description
      const client = await this.getClient(details.clientId);
      const model = client?.models.find(m => m.id === details.modelId);

      // Get the model file path
      const modelPath = await this.getModelPath(details.clientId, details.modelId);
      if (!modelPath) {
        return { success: false, error: `Model ${details.modelId} not found for client ${details.clientId}` };
      }

      // Check if there are actually changes to commit
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.repoPath });

      if (!statusOutput.trim()) {
        console.log('[GitHub] No changes detected in working directory');
        return {
          success: false,
          error: 'No changes detected. Make sure the PowerBI model is saved after modifications.'
        };
      }

      // Ensure we're on the base branch and up to date
      console.log(`[GitHub] Switching to ${BASE_BRANCH} and pulling latest...`);
      await execAsync(`git checkout ${BASE_BRANCH}`, { cwd: this.repoPath });
      await execAsync(`git pull origin ${BASE_BRANCH}`, { cwd: this.repoPath }).catch(() => {
        // Ignore pull errors (might be a fresh repo)
      });

      // Create new branch from base
      console.log(`[GitHub] Creating branch: ${branchName}`);
      try {
        await execAsync(`git branch -D "${branchName}"`, { cwd: this.repoPath });
      } catch {
        // Branch doesn't exist, that's fine
      }
      await execAsync(`git checkout -b "${branchName}"`, { cwd: this.repoPath });

      // Stage the model file and any related changes
      const relativeModelPath = path.relative(this.repoPath, modelPath);
      await execAsync(`git add "${relativeModelPath}"`, { cwd: this.repoPath });
      await execAsync('git add -A models/', { cwd: this.repoPath });

      // Create detailed commit message
      const commitMessage = this.buildCommitMessage(details, client, model);

      // Use heredoc for commit to handle special characters
      const commitCmd = `git commit -m "${commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      await execAsync(commitCmd, { cwd: this.repoPath });

      // Push to remote
      console.log(`[GitHub] Pushing branch to remote...`);
      await execAsync(`git push -u origin "${branchName}" --force`, { cwd: this.repoPath });

      // Create PR using gh CLI
      console.log(`[GitHub] Creating pull request...`);
      const prBody = this.buildPRBody(details, client, model);
      const prTitle = `[${shortId}] ${details.title}`;

      // Build gh pr create command
      let prCommand = `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}" --base "${BASE_BRANCH}"`;

      // Add reviewers if configured
      if (DEFAULT_REVIEWERS.length > 0) {
        prCommand += ` --reviewer "${DEFAULT_REVIEWERS.join(',')}"`;
      }

      const { stdout: prOutput } = await execAsync(prCommand, { cwd: this.repoPath });

      // Parse PR URL from output
      const prUrl = prOutput.trim();
      const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
      const prNumber = prNumberMatch ? parseInt(prNumberMatch[1]) : undefined;

      // Add a comment to the PR with test results
      if (prNumber && details.testResults) {
        await this.addPRComment(prNumber, details);
      }

      // Switch back to base branch
      await execAsync(`git checkout ${BASE_BRANCH}`, { cwd: this.repoPath });

      console.log(`[GitHub] PR created: ${prUrl}`);

      return {
        success: true,
        prUrl,
        prNumber,
        branch: branchName,
      };
    } catch (error) {
      console.error('[GitHub] Error creating PR:', error);

      // Try to clean up - switch back to base branch
      try {
        await execAsync(`git checkout ${BASE_BRANCH}`, { cwd: this.repoPath });
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PR',
        branch: branchName,
      };
    }
  }

  /**
   * Build a detailed commit message
   */
  private buildCommitMessage(details: ChangeDetails, client?: Client, model?: ClientModel): string {
    const lines = [
      details.title,
      '',
      details.description,
      '',
      'Changes:',
      ...details.changes.map(c => `- ${c}`),
      '',
      `Request ID: ${details.requestId}`,
      `Client: ${client?.name || details.clientId}`,
      `Model: ${model?.name || details.modelId}`,
      `Change Type: ${details.changeType || 'unknown'}`,
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
    ];
    return lines.join('\n');
  }

  /**
   * Build a comprehensive PR body with all details
   */
  private buildPRBody(details: ChangeDetails, client?: Client, model?: ClientModel): string {
    const testResultsSection = details.testResults?.length
      ? `## Test Results\n\n| Test | Status | Details |\n|------|--------|---------|\\n${details.testResults.map(t =>
          `| ${t.name} | ${t.passed ? '✅ Passed' : '❌ Failed'} | ${t.message} |`
        ).join('\\n')}`
      : '## Test Results\\n\\n_Tests will run automatically via GitHub Actions_';

    const executionSection = details.executionLogs?.length
      ? `## Execution Log\\n\\n${details.executionLogs.map(l =>
          `- **${l.action}**: ${l.details} (${l.status})`
        ).join('\\n')}`
      : '';

    return `## Summary

${details.description}

## Request Details

| Field | Value |
|-------|-------|
| **Request ID** | \`${details.requestId}\` |
| **Client** | ${client?.name || details.clientId} |
| **Model** | ${model?.name || details.modelId} |
| **Change Type** | ${details.changeType || 'N/A'} |
| **Model File** | \`${model?.file || 'N/A'}\` |

## Changes Made

${details.changes.map(c => `- ${c}`).join('\\n')}

${testResultsSection}

${executionSection}

## Review Checklist

- [ ] DAX syntax is correct
- [ ] Measure names follow naming conventions
- [ ] No breaking changes to existing measures
- [ ] Test results pass in CI

## How to Test

1. Download the \`.pbix\` file from this PR
2. Open in PowerBI Desktop
3. Verify the new/modified measures work correctly
4. Check that existing reports still render properly

---
🤖 _This PR was automatically generated by the PowerBI Request Automation system_
📋 _Request ID: ${details.requestId}_`;
  }

  /**
   * Add a comment to an existing PR with test results
   */
  async addPRComment(prNumber: number, details: ChangeDetails): Promise<void> {
    try {
      const testSummary = details.testResults?.length
        ? details.testResults.map(t =>
            `| ${t.name} | ${t.passed ? '✅' : '❌'} | ${t.message} |`
          ).join('\n')
        : 'No test results available';

      const comment = `## 🧪 Automated Test Results

| Test Name | Status | Details |
|-----------|--------|---------|
${testSummary}

---
_Tested at: ${new Date().toISOString()}_`;

      await execAsync(
        `gh pr comment ${prNumber} --body "${comment.replace(/"/g, '\\"')}"`,
        { cwd: this.repoPath }
      );
      console.log(`[GitHub] Added test results comment to PR #${prNumber}`);
    } catch (error) {
      console.error('[GitHub] Failed to add PR comment:', error);
    }
  }

  /**
   * Check if gh CLI is authenticated
   */
  async checkGitHubAuth(): Promise<boolean> {
    try {
      await execAsync('gh auth status', { cwd: this.repoPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the repository's remote URL
   */
  async getRemoteUrl(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: this.repoPath });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * List all available models across all clients
   */
  async listAllModels(): Promise<Array<{ client: Client; model: ClientModel }>> {
    const config = await this.getClients();
    const result: Array<{ client: Client; model: ClientModel }> = [];

    for (const client of config.clients) {
      for (const model of client.models) {
        result.push({ client, model });
      }
    }

    return result;
  }
}
