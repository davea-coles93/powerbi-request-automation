import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequestRouter } from './routes/requests';
import { RequestStore } from './services/requestStore';
import { TriageService } from './services/triageService';
import { ExecutionService } from './services/executionService';
import { PowerBIMockService } from './services/powerbiMockService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const powerbiService = new PowerBIMockService();
const requestStore = new RequestStore();
const triageService = new TriageService();
const executionService = new ExecutionService(powerbiService);

// Routes
app.use('/api/requests', createRequestRouter(requestStore, triageService, executionService, powerbiService));

// Health check
app.get('/api/health', async (_req, res) => {
  const pbiConnected = await powerbiService.isConnected();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      powerbi: pbiConnected ? 'connected' : 'disconnected',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
    },
  });
});

// Model info endpoint
app.get('/api/model', async (_req, res) => {
  try {
    const model = await powerbiService.getModelInfo();
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get model info' });
  }
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         PowerBI Request Automation POC - Backend              ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                      ║
║                                                               ║
║  Endpoints:                                                   ║
║    POST   /api/requests          - Create change request      ║
║    GET    /api/requests          - List all requests          ║
║    GET    /api/requests/:id      - Get request by ID          ║
║    POST   /api/requests/:id/execute - Trigger execution       ║
║    GET    /api/requests/stats/summary - Get statistics        ║
║    GET    /api/model             - Get PowerBI model info     ║
║    GET    /api/health            - Health check               ║
║                                                               ║
║  Using: ${process.env.ANTHROPIC_API_KEY ? 'Claude API ✓' : 'Claude API (not configured)'}                               ║
║  PowerBI: Mock Service (Contoso Finance Model)                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
