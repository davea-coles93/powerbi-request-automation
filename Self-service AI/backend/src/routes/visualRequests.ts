/**
 * Visual Request Routes
 * Handles requests to create report visuals with autonomous feedback
 */

import { Router, Request, Response } from 'express';
import { VisualFeedbackService, VisualCreationRequest } from '../services/visualFeedbackService';
import { RequestStore } from '../services/requestStore';
import { createRequestSchema } from '../utils/validation';

export function createVisualRequestRouter(requestStore: RequestStore): Router {
  const router = Router();
  const feedbackService = new VisualFeedbackService();

  // Start MCP services on first use
  let servicesStarted = false;

  async function ensureServicesStarted() {
    if (!servicesStarted) {
      await feedbackService.start();
      servicesStarted = true;
    }
  }

  /**
   * Create visuals with autonomous feedback loop
   */
  router.post('/create-visuals', async (req: Request, res: Response) => {
    try {
      await ensureServicesStarted();

      const { clientId, modelName, pageName, displayName, description, visuals } = req.body;

      if (!clientId || !modelName || !pageName || !displayName || !visuals) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Get model path
      const pbipPath = `models/${clientId}/${modelName}.pbip`;

      // Execute with feedback loop
      const result = await feedbackService.createVisualsWithFeedback(
        pbipPath,
        pageName,
        displayName,
        visuals as VisualCreationRequest[],
        description
      );

      res.json(result);
    } catch (error) {
      console.error('Visual creation error:', error);
      res.status(500).json({
        error: 'Failed to create visuals',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Test visual creation (simpler endpoint for testing)
   */
  router.post('/test-visual', async (req: Request, res: Response) => {
    try {
      await ensureServicesStarted();

      const { clientId, modelName } = req.body;

      if (!clientId || !modelName) {
        res.status(400).json({ error: 'Missing clientId or modelName' });
        return;
      }

      const pbipPath = `models/${clientId}/${modelName}.pbip`;

      // Create a simple test page with a card visual
      const result = await feedbackService.createVisualsWithFeedback(
        pbipPath,
        'TestPage',
        'Test Dashboard',
        [
          {
            type: 'card',
            measureEntity: 'Sales',
            measureProperty: 'Total Sales',
            position: { x: 10, y: 10, width: 250, height: 120 },
            title: 'Total Sales',
          },
        ],
        'Create a simple card visual showing Total Sales'
      );

      res.json(result);
    } catch (error) {
      console.error('Test visual error:', error);
      res.status(500).json({
        error: 'Failed to create test visual',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Enhanced execution with visual feedback
   * This extends the existing request execution to include report visuals
   */
  router.post('/:id/execute-with-visuals', async (req: Request, res: Response) => {
    try {
      await ensureServicesStarted();

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const request = requestStore.get(id);

      if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      const { visuals, pageName, displayName } = req.body;

      if (!visuals || !pageName || !displayName) {
        res.status(400).json({ error: 'Missing visual configuration' });
        return;
      }

      const pbipPath = `models/${request.clientId}/${request.modelName}.pbip`;

      requestStore.setStatus(id, 'in_progress');
      requestStore.addLog(id, 'Visual creation', 'Starting visual feedback loop', 'info');

      const result = await feedbackService.createVisualsWithFeedback(
        pbipPath,
        pageName,
        displayName,
        visuals,
        request.description
      );

      if (result.success) {
        requestStore.setStatus(id, 'completed');
        requestStore.addLog(
          id,
          'Visuals created',
          `Created ${result.visualsCreated} visuals in ${result.attempts} attempts`,
          'success'
        );
      } else {
        requestStore.setStatus(id, 'failed');
        requestStore.addLog(
          id,
          'Visual creation failed',
          result.error || result.issues?.join(', ') || 'Unknown error',
          'error'
        );
      }

      res.json(result);
    } catch (error) {
      console.error('Execute with visuals error:', error);
      res.status(500).json({
        error: 'Failed to execute with visuals',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (servicesStarted) {
      await feedbackService.stop();
    }
  });

  process.on('SIGINT', async () => {
    if (servicesStarted) {
      await feedbackService.stop();
    }
  });

  return router;
}
