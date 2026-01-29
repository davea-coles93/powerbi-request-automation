/**
 * GitHub Integration Service
 * Handles real git operations and PR creation for PowerBI model changes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

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
   * Create a branch, commit changes, and create a PR
   */
  async createPullRequest(
    requestId: string,
    clientId: string,
    modelId: string,
    title: string,
    description: string,
    changes: string[]
  ): Promise<GitHubPRResult> {
    const branchName = `auto/${clientId}/${modelId}/${requestId.slice(0, 8)}`;

    try {
      // Check if gh CLI is available
      await execAsync('gh --version', { cwd: this.repoPath });

      // Get the model file path
      const modelPath = await this.getModelPath(clientId, modelId);
      if (!modelPath) {
        return { success: false, error: `Model ${modelId} not found for client ${clientId}` };
      }

      // Check if there are actually changes to commit
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.repoPath });

      if (!statusOutput.trim()) {
        // No changes to commit - this might happen if the model wasn't saved
        console.log('[GitHub] No changes detected in working directory');
        return {
          success: false,
          error: 'No changes detected. Make sure the PowerBI model is saved after modifications.'
        };
      }

      // Get current branch to return to later
      const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd: this.repoPath });
      const originalBranch = currentBranch.trim() || 'master';

      // Create and switch to new branch
      console.log(`[GitHub] Creating branch: ${branchName}`);
      await execAsync(`git checkout -b "${branchName}"`, { cwd: this.repoPath });

      // Stage the model file
      const relativeModelPath = path.relative(this.repoPath, modelPath);
      await execAsync(`git add "${relativeModelPath}"`, { cwd: this.repoPath });

      // Also stage any related changes
      await execAsync('git add -A models/', { cwd: this.repoPath });

      // Create commit
      const commitMessage = `${title}\n\n${description}\n\nChanges:\n${changes.map(c => `- ${c}`).join('\n')}\n\nRequest ID: ${requestId}\nClient: ${clientId}\nModel: ${modelId}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`;

      await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: this.repoPath });

      // Push to remote
      console.log(`[GitHub] Pushing branch to remote...`);
      await execAsync(`git push -u origin "${branchName}"`, { cwd: this.repoPath });

      // Create PR using gh CLI
      console.log(`[GitHub] Creating pull request...`);
      const prBody = `## Summary
${description}

## Changes
${changes.map(c => `- ${c}`).join('\n')}

## Details
- **Request ID:** ${requestId}
- **Client:** ${clientId}
- **Model:** ${modelId}

## Testing
- [ ] DAX validation passed
- [ ] Model opens correctly in PowerBI Desktop
- [ ] Measures calculate expected values

---
Generated with [PowerBI Request Automation](https://github.com/davea-coles93/powerbi-request-automation)
`;

      const { stdout: prOutput } = await execAsync(
        `gh pr create --title "${title}" --body "${prBody.replace(/"/g, '\\"')}" --base "${originalBranch}"`,
        { cwd: this.repoPath }
      );

      // Parse PR URL from output
      const prUrl = prOutput.trim();
      const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
      const prNumber = prNumberMatch ? parseInt(prNumberMatch[1]) : undefined;

      // Switch back to original branch
      await execAsync(`git checkout "${originalBranch}"`, { cwd: this.repoPath });

      console.log(`[GitHub] PR created: ${prUrl}`);

      return {
        success: true,
        prUrl,
        prNumber,
        branch: branchName,
      };
    } catch (error) {
      console.error('[GitHub] Error creating PR:', error);

      // Try to clean up - switch back to original branch
      try {
        await execAsync('git checkout master', { cwd: this.repoPath });
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
