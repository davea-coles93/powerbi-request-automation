import { Router, Request, Response } from 'express';
import { RequestStore } from '../services/requestStore';
import { TriageService } from '../services/triageService';
import { ExecutionService } from '../services/executionService';
import { IPowerBIService } from '../types/powerbi';
import { CreateRequestDTO } from '../types/request';

export function createRequestRouter(
  store: RequestStore,
  triageService: TriageService,
  executionService: ExecutionService,
  powerbiService: IPowerBIService
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
      triageAndProcess(request.id, dto, store, triageService, executionService);

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
    const request = store.get(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json(request);
  });

  // Get requests by client
  router.get('/client/:clientId', (req: Request, res: Response) => {
    const requests = store.getByClient(req.params.clientId);
    res.json(requests);
  });

  // Get stats
  router.get('/stats/summary', (_req: Request, res: Response) => {
    const stats = store.getStats();
    res.json(stats);
  });

  // Manually trigger execution for a request
  router.post('/:id/execute', async (req: Request, res: Response) => {
    const request = store.get(req.params.id);
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

        // Simulate PR creation
        const prUrl = `https://github.com/org/powerbi-models/pull/${Math.floor(Math.random() * 1000)}`;
        store.setPRUrl(request.id, prUrl);
        store.addLog(request.id, 'PR created', prUrl, 'success');
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
  executionService: ExecutionService
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
          const prUrl = `https://github.com/org/powerbi-models/pull/${Math.floor(Math.random() * 1000)}`;
          store.setPRUrl(requestId, prUrl);
          store.addLog(requestId, 'PR created', prUrl, 'success');
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
      store.addLog(
        requestId,
        'Clarification needed',
        'The request needs more information before proceeding',
        'info'
      );
    }
  } catch (error) {
    console.error('Triage/processing error:', error);
    store.setStatus(requestId, 'failed');
    store.addLog(requestId, 'Processing error', String(error), 'error');
  }
}
