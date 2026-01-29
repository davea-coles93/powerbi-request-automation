import { Router, Request, Response } from 'express';
import { RequestStore } from '../services/requestStore';
import { TriageService } from '../services/triageService';
import { ExecutionService } from '../services/executionService';
import { ClarificationService } from '../services/clarificationService';
import { GitHubService } from '../services/githubService';
import { IPowerBIService } from '../types/powerbi';
import { CreateRequestDTO } from '../types/request';

// Initialize clarification service
const clarificationService = new ClarificationService();

export function createRequestRouter(
  store: RequestStore,
  triageService: TriageService,
  executionService: ExecutionService,
  powerbiService: IPowerBIService,
  githubService?: GitHubService
): Router {
  const router = Router();

  // Create a new change request
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateRequestDTO = req.body;

      if (!dto.clientId || !dto.modelName || !dto.title || !dto.description) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Create the request
      const request = store.create(dto);
      store.addLog(request.id, 'Request created', `New request from ${dto.clientId}`, 'info');

      // Quick classification first
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

      // Start async triage
      store.setStatus(request.id, 'triaging');
      triageAndProcess(request.id, dto, store, triageService, executionService, githubService);

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

  // Get requests by client
  router.get('/client/:clientId', (req: Request, res: Response) => {
    const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const requests = store.getByClient(clientId);
    res.json(requests);
  });

  // Get stats
  router.get('/stats/summary', (_req: Request, res: Response) => {
    const stats = store.getStats();
    res.json(stats);
  });

  // Manually trigger execution for a request
  router.post('/:id/execute', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const request = store.get(id);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    store.setStatus(request.id, 'in_progress');
    store.addLog(request.id, 'Manual execution triggered', 'Starting execution...', 'info');

    try {
      const result = await executionService.executeRequest(request);

      if (result.success) {
        store.update(request.id, {
          status: 'testing',
          testResults: result.testResults,
          executionLog: [...request.executionLog, ...result.logs],
        });

        // Create real PR if GitHub service is available
        if (githubService) {
          const prResult = await githubService.createPullRequest(
            request.id,
            request.clientId,
            request.modelName,
            request.title,
            request.description,
            result.actions?.map(a => `${a.type}: ${a.measureName || 'N/A'}`) || ['Changes applied']
          );
          if (prResult.success && prResult.prUrl) {
            store.setPRUrl(request.id, prResult.prUrl);
            store.addLog(request.id, 'PR created', prResult.prUrl, 'success');
          } else {
            store.addLog(request.id, 'PR creation failed', prResult.error || 'Unknown error', 'error');
          }
        } else {
          // Fallback to simulated PR
          const prUrl = `https://github.com/org/powerbi-models/pull/${Math.floor(Math.random() * 1000)}`;
          store.setPRUrl(request.id, prUrl);
          store.addLog(request.id, 'PR created (simulated)', prUrl, 'success');
        }
      } else {
        store.setStatus(request.id, 'failed');
        store.update(request.id, {
          executionLog: [...request.executionLog, ...result.logs],
        });
      }

      res.json({ success: result.success, result });
    } catch (error) {
      store.setStatus(request.id, 'failed');
      res.status(500).json({ error: 'Execution failed' });
    }
  });

  // Provide clarification for a request
  router.post('/:id/clarify', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const request = store.get(id);

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (request.status !== 'awaiting_clarification') {
      res.status(400).json({ error: 'Request is not awaiting clarification' });
      return;
    }

    const { response: clarificationResponse } = req.body;
    if (!clarificationResponse) {
      res.status(400).json({ error: 'Clarification response required' });
      return;
    }

    // Update request with clarification
    store.update(id, {
      clarificationResponse,
      description: `${request.description}\n\n--- Additional Information ---\n${clarificationResponse}`,
      status: 'triaging',
    });
    store.addLog(id, 'Clarification received', clarificationResponse, 'info');

    // Re-trigger triage with updated information
    triageAndProcess(id, {
      clientId: request.clientId,
      modelName: request.modelName,
      title: request.title,
      description: `${request.description}\n\n--- Additional Information ---\n${clarificationResponse}`,
      urgency: request.urgency,
    }, store, triageService, executionService, githubService);

    res.json({ success: true, message: 'Clarification received, re-processing request' });
  });

  // Send clarification request notification
  router.post('/:id/notify', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const request = store.get(id);

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (!request.clarificationQuestions?.length) {
      res.status(400).json({ error: 'No clarification questions to send' });
      return;
    }

    const { channel, recipient } = req.body;

    let result;
    if (channel === 'teams') {
      result = await clarificationService.sendTeamsNotification(
        request,
        request.clarificationQuestions,
        req.body.webhookUrl
      );
    } else if (channel === 'email') {
      result = await clarificationService.sendEmailNotification(
        request,
        request.clarificationQuestions,
        recipient
      );
    } else {
      res.status(400).json({ error: 'Invalid channel. Use "teams" or "email"' });
      return;
    }

    store.addLog(id, 'Notification sent',
      `${channel} notification to ${result.recipient}: ${result.sent ? 'success' : result.error}`,
      result.sent ? 'success' : 'error');

    res.json(result);
  });

  // Get PowerBI model info
  router.get('/powerbi/model', async (_req: Request, res: Response) => {
    try {
      const model = await powerbiService.getModelInfo();
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get model info' });
    }
  });

  // Get PowerBI measures
  router.get('/powerbi/measures', async (_req: Request, res: Response) => {
    try {
      const measures = await powerbiService.getMeasures();
      res.json(measures);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get measures' });
    }
  });

  return router;
}

// Async triage and processing
async function triageAndProcess(
  requestId: string,
  dto: CreateRequestDTO,
  store: RequestStore,
  triageService: TriageService,
  executionService: ExecutionService,
  githubService?: GitHubService
): Promise<void> {
  try {
    // Full triage analysis
    const analysis = await triageService.analyzeRequest(dto);
    store.applyTriageResult(requestId, analysis);
    store.addLog(
      requestId,
      'Triage complete',
      `Result: ${analysis.triageResult}, Confidence: ${(analysis.confidence * 100).toFixed(0)}%, Reasoning: ${analysis.reasoning}`,
      'info'
    );

    // If auto-fixable, proceed with execution
    if (analysis.triageResult === 'auto_fix') {
      const request = store.get(requestId);
      if (!request) return;

      store.addLog(requestId, 'Auto-fix starting', 'Executing automated changes...', 'info');
      const result = await executionService.executeRequest(request);

      if (result.success) {
        store.update(requestId, {
          status: 'testing',
          testResults: result.testResults,
        });

        // All tests passed - create PR
        if (result.testResults.every(t => t.passed)) {
          if (githubService) {
            const prResult = await githubService.createPullRequest(
              requestId,
              request.clientId,
              request.modelName,
              request.title,
              request.description,
              result.actions?.map(a => `${a.type}: ${a.measureName || 'N/A'}`) || ['Changes applied']
            );
            if (prResult.success && prResult.prUrl) {
              store.setPRUrl(requestId, prResult.prUrl);
              store.addLog(requestId, 'PR created', prResult.prUrl, 'success');
            } else {
              store.addLog(requestId, 'PR creation failed', prResult.error || 'Unknown error', 'error');
              // Still mark as successful since changes were applied
              store.setStatus(requestId, 'pr_created');
            }
          } else {
            const prUrl = `https://github.com/org/powerbi-models/pull/${Math.floor(Math.random() * 1000)}`;
            store.setPRUrl(requestId, prUrl);
            store.addLog(requestId, 'PR created (simulated)', prUrl, 'success');
          }
        } else {
          store.setStatus(requestId, 'needs_human');
          store.addLog(requestId, 'Tests failed', 'Some tests did not pass - manual review needed', 'error');
        }
      } else {
        store.setStatus(requestId, 'failed');
        store.addLog(requestId, 'Execution failed', 'Auto-fix could not complete', 'error');
      }
    } else if (analysis.triageResult === 'assisted_fix') {
      store.addLog(
        requestId,
        'Awaiting review',
        `Suggested approach: ${analysis.suggestedApproach || 'Review required'}`,
        'info'
      );
    } else if (analysis.triageResult === 'human_design') {
      store.addLog(
        requestId,
        'Human design required',
        `Complexity: ${analysis.estimatedComplexity}. This request requires architectural decisions.`,
        'info'
      );
    } else {
      // Clarification needed - analyze what's missing
      const clarificationResult = await clarificationService.analyzeForClarification(dto);

      if (clarificationResult.needsClarification) {
        store.update(requestId, {
          status: 'awaiting_clarification',
          clarificationQuestions: clarificationResult.questions,
        });
        store.addLog(
          requestId,
          'Clarification needed',
          `Missing: ${clarificationResult.missingInfo.join(', ')}`,
          'info'
        );

        // Log each question
        clarificationResult.questions.forEach((q, i) => {
          store.addLog(requestId, `Question ${i + 1}`, q.question, 'info');
        });
      } else {
        store.addLog(
          requestId,
          'Manual review required',
          'Could not determine clarification questions - manual review needed',
          'info'
        );
      }
    }
  } catch (error) {
    console.error('Triage/processing error:', error);
    store.setStatus(requestId, 'failed');
    store.addLog(requestId, 'Processing error', String(error), 'error');
  }
}
