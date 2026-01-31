/**
 * TMDL-based Request Router
 *
 * Handles change requests using TMDL files for git-based version control.
 */

import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import simpleGit, { SimpleGit } from 'simple-git';
import { RequestStore } from '../services/requestStore';
import { TriageService } from '../services/triageService';
import { TmdlExecutionService, TmdlChange } from '../services/tmdlExecutionService';
import { CreateRequestDTO, ChangeRequest } from '../types/request';
import { createRequestSchema, sanitizeBranchName } from '../utils/validation';

interface ClientConfig {
  clients: Array<{
    id: string;
    name: string;
    contact: string;
    models: Array<{
      id: string;
      name: string;
      file: string;
      format?: string;
      description: string;
    }>;
  }>;
}

export function createTmdlRequestRouter(
  store: RequestStore,
  triageService: TriageService,
  repoPath: string
): Router {
  const router = Router();
  const modelsPath = path.join(repoPath, 'models');
  const mcpServerPath = process.env.POWERBI_MCP_PATH || '';

  if (!mcpServerPath) {
    throw new Error('POWERBI_MCP_PATH environment variable is required');
  }

  const tmdlExecutionService = new TmdlExecutionService(modelsPath, mcpServerPath);

  // Load client config
  async function loadClientConfig(): Promise<ClientConfig> {
    const configPath = path.join(modelsPath, 'clients.json');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  // Get model file path for a client/model
  async function getModelPath(clientId: string, modelId: string): Promise<string | null> {
    const config = await loadClientConfig();
    const client = config.clients.find(c => c.id === clientId);
    if (!client) return null;

    const model = client.models.find(m => m.id === modelId);
    if (!model) return null;

    return model.file;
  }

  // Create a new change request
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Validate input
      const { error, value } = createRequestSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: 'Invalid request format' });
        return;
      }

      const dto: CreateRequestDTO = value;

      // Verify model exists
      const modelPath = await getModelPath(dto.clientId, dto.modelName);
      if (!modelPath) {
        res.status(400).json({ error: 'Invalid request' });
        return;
      }

      // Create the request
      const request = store.create(dto);
      store.addLog(request.id, 'Request created', `New request from ${dto.clientId}`, 'info');
      store.addLog(request.id, 'Model path', modelPath, 'info');

      // Quick classification
      const quickResult = triageService.quickClassify(dto.description);
      if (quickResult && quickResult.confidence > 0.8) {
        store.update(request.id, { changeType: quickResult.changeType });
        store.addLog(
          request.id,
          'Quick classification',
          `Classified as ${quickResult.changeType} with ${(quickResult.confidence * 100).toFixed(0)}% confidence`,
          'info'
        );
      }

      // Start async triage and processing
      store.setStatus(request.id, 'triaging');
      console.log('[REQUEST] Starting async processing for:', request.id);
      processRequest(request.id, dto, modelPath, store, triageService, tmdlExecutionService, repoPath)
        .catch(err => console.error('[REQUEST] Process failed:', err));

      res.status(201).json(request);
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ error: 'Failed to create request' });
    }
  });

  // Get all requests
  router.get('/', (_req: Request, res: Response) => {
    const requests = store.getAll();
    res.json(requests);
  });

  // Get request by ID
  router.get('/:id', (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const request = store.get(id);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json(request);
  });

  // Get stats
  router.get('/stats/summary', (_req: Request, res: Response) => {
    const stats = store.getStats();
    res.json(stats);
  });

  // Manually trigger execution
  router.post('/:id/execute', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const request = store.get(id);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const modelPath = await getModelPath(request.clientId, request.modelName);
    if (!modelPath) {
      res.status(400).json({ error: 'Model not found' });
      return;
    }

    store.setStatus(request.id, 'in_progress');
    store.addLog(request.id, 'Manual execution triggered', 'Starting TMDL execution...', 'info');

    try {
      const result = await executeAndCreatePR(
        request,
        modelPath,
        store,
        tmdlExecutionService,
        repoPath
      );

      res.json(result);
    } catch (error) {
      store.setStatus(request.id, 'failed');
      store.addLog(request.id, 'Execution failed', String(error), 'error');
      res.status(500).json({ error: 'Execution failed' });
    }
  });

  return router;
}

/**
 * Process a request: triage, execute, create PR
 */
async function processRequest(
  requestId: string,
  dto: CreateRequestDTO,
  modelPath: string,
  store: RequestStore,
  triageService: TriageService,
  tmdlExecutionService: TmdlExecutionService,
  repoPath: string
): Promise<void> {
  console.log('[PROCESS] processRequest called for:', requestId);
  try {
    // Full triage analysis (with current report state for context)
    console.log('[PROCESS] Starting triage analysis...');
    const analysis = await triageService.analyzeRequest(dto, repoPath);
    console.log('[PROCESS] Triage result:', analysis.triageResult);
    store.applyTriageResult(requestId, analysis);
    store.addLog(
      requestId,
      'Triage complete',
      `Result: ${analysis.triageResult}, Confidence: ${(analysis.confidence * 100).toFixed(0)}%`,
      'info'
    );

    // If auto-fixable, proceed with execution
    if (analysis.triageResult === 'auto_fix') {
      const request = store.get(requestId);
      if (!request) return;

      store.addLog(requestId, 'Auto-fix starting', 'Executing TMDL changes...', 'info');
      await executeAndCreatePR(request, modelPath, store, tmdlExecutionService, repoPath);
    } else {
      store.addLog(
        requestId,
        'Manual review required',
        `Triage result: ${analysis.triageResult}`,
        'info'
      );
    }
  } catch (error) {
    console.error('Processing error:', error);
    store.setStatus(requestId, 'failed');
    store.addLog(requestId, 'Processing error', String(error), 'error');
  }
}

/**
 * Execute changes and create a PR
 */
async function executeAndCreatePR(
  request: ChangeRequest,
  modelPath: string,
  store: RequestStore,
  tmdlExecutionService: TmdlExecutionService,
  repoPath: string
): Promise<{ success: boolean; prUrl?: string; changes?: TmdlChange[]; error?: string }> {
  const requestId = request.id;

  try {
    // Execute TMDL changes
    const result = await tmdlExecutionService.executeRequest(request, modelPath);

    if (!result.success) {
      store.setStatus(requestId, 'failed');
      store.addLog(requestId, 'Execution failed', result.error || 'Unknown error', 'error');
      return { success: false, error: result.error };
    }

    // Log changes
    for (const change of result.changes) {
      store.addLog(
        requestId,
        `${change.type}: ${change.measureName}`,
        change.expression ? `Expression: ${change.expression.substring(0, 100)}...` : 'Deleted',
        'success'
      );
    }

    // Create PR with the changes
    console.log('[PR] Starting PR creation for request:', requestId);
    const prResult = await createPullRequest(
      request,
      result.changes,
      repoPath
    );
    console.log('[PR] PR creation result:', prResult);

    if (prResult.success && prResult.prUrl) {
      store.setPRUrl(requestId, prResult.prUrl);
      store.setStatus(requestId, 'pr_created');
      store.addLog(requestId, 'PR created', prResult.prUrl, 'success');
    } else {
      store.setStatus(requestId, 'failed');
      store.addLog(requestId, 'PR creation failed', prResult.error || 'Unknown error', 'error');
    }

    return {
      success: prResult.success,
      prUrl: prResult.prUrl,
      changes: result.changes,
      error: prResult.error,
    };
  } catch (error) {
    store.setStatus(requestId, 'failed');
    store.addLog(requestId, 'Error', String(error), 'error');
    return { success: false, error: String(error) };
  }
}

/**
 * Create a PR with the TMDL changes
 */
async function createPullRequest(
  request: ChangeRequest,
  changes: TmdlChange[],
  repoPath: string
): Promise<{ success: boolean; prUrl?: string; error?: string }> {
  const branchName = sanitizeBranchName(`request/${request.id.slice(0, 8)}`);
  const baseBranch = process.env.BASE_BRANCH || 'master';
  const git: SimpleGit = simpleGit(repoPath);

  console.log(`[PR] createPullRequest called - repoPath: ${repoPath}, branch: ${branchName}`);

  try {
    // Configure git to use gh CLI for auth
    execSync('gh auth setup-git', { cwd: repoPath });
    console.log('[PR] Configured git to use gh CLI for authentication');

    // Check for changes
    console.log('[PR] Checking git status...');
    const status = await git.status();
    console.log('[PR] Git status:', status.files.length, 'files changed');
    if (status.files.length === 0) {
      return { success: false, error: 'No changes to commit' };
    }

    console.log('[Git] Changes detected:', status.files.length, 'files');

    // Ensure we're on base branch
    await git.checkout(baseBranch);
    try {
      await git.pull('origin', baseBranch);
    } catch {
      // Ignore pull errors (might be a fresh repo)
    }

    // Delete branch if exists, then create
    try {
      await git.deleteLocalBranch(branchName, true);
    } catch {
      // Branch doesn't exist
    }
    await git.checkoutLocalBranch(branchName);

    // Stage TMDL files
    await git.add('models/');

    // Build commit message
    const changesSummary = changes
      .map(c => `- ${c.type}: ${c.measureName}`)
      .join('\n');

    const commitMessage = `${request.title}

${request.description}

Changes:
${changesSummary}

Request ID: ${request.id}
Client: ${request.clientId}
Model: ${request.modelName}

Co-Authored-By: Claude <noreply@anthropic.com>`;

    // Commit (simple-git handles escaping)
    await git.commit(commitMessage);

    // Push
    await git.push(['--force', '-u', 'origin', branchName]);

    // Create PR using gh CLI (safe - no user input in command)
    const prBody = buildPRBody(request, changes);
    const prTitle = `[${request.id.slice(0, 8)}] ${request.title}`;

    // Write PR details to temp files to avoid command injection
    const tmpDir = path.join(repoPath, '.git', 'tmp-pr');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const titleFile = path.join(tmpDir, 'title.txt');
    const bodyFile = path.join(tmpDir, 'body.txt');

    await fs.promises.writeFile(titleFile, prTitle, 'utf-8');
    await fs.promises.writeFile(bodyFile, prBody, 'utf-8');

    // Use gh CLI with file input (safe from injection)
    const prUrl = execSync(
      `gh pr create --title "$(cat "${titleFile}")" --body "$(cat "${bodyFile}")" --base "${baseBranch}"`,
      { cwd: repoPath, encoding: 'utf-8' }
    ).trim();

    // Cleanup temp files
    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    // Switch back to base branch
    await git.checkout(baseBranch);

    return { success: true, prUrl };
  } catch (error) {
    // Log the actual error
    console.error('[PR Creation Error]', error);

    // Cleanup
    try {
      await git.checkout(baseBranch);
    } catch {}

    return {
      success: false,
      error: `PR creation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Build PR body with change details
 */
function buildPRBody(request: ChangeRequest, changes: TmdlChange[]): string {
  const changesTable = changes.map(c => {
    const expr = c.expression
      ? c.expression.length > 50 ? c.expression.substring(0, 50) + '...' : c.expression
      : 'N/A';
    return `| ${c.type} | ${c.measureName} | ${c.tableName} | \`${expr}\` |`;
  }).join('\\n');

  return `## Summary

${request.description}

## Request Details

| Field | Value |
|-------|-------|
| **Request ID** | \`${request.id}\` |
| **Client** | ${request.clientId} |
| **Model** | ${request.modelName} |
| **Change Type** | ${request.changeType || 'N/A'} |

## Changes

| Type | Measure | Table | Expression |
|------|---------|-------|------------|
${changesTable}

## Review Checklist

- [ ] DAX syntax is correct
- [ ] Measure names follow naming conventions
- [ ] No breaking changes to existing measures
- [ ] Changes match the request description

---
Generated by PowerBI Request Automation
Request ID: ${request.id}`;
}
