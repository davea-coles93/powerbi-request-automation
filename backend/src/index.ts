import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { createRequestRouter } from './routes/requests';
import { RequestStore } from './services/requestStore';
import { TriageService } from './services/triageService';
import { ExecutionService } from './services/executionService';
import { PowerBIMockService } from './services/powerbiMockService';
import { PowerBIMcpService } from './services/powerbiMcpService';
import { GitHubService } from './services/githubService';
import { IPowerBIService } from './types/powerbi';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services based on environment
let powerbiService: IPowerBIService;
let powerbiMode = 'mock';

const mcpServerPath = process.env.POWERBI_MCP_PATH;
if (mcpServerPath) {
  console.log('[PowerBI] Attempting to connect to MCP server...');
  const mcpService = new PowerBIMcpService(mcpServerPath);
  mcpService.connect()
    .then((connected) => {
      if (connected) {
        powerbiMode = 'mcp';
        console.log('[PowerBI] Connected to real PowerBI Desktop via MCP');
      } else {
        console.log('[PowerBI] MCP connection failed, falling back to mock service');
      }
    })
    .catch((err) => {
      console.error('[PowerBI] MCP connection error:', err);
      console.log('[PowerBI] Using mock service');
    });
  powerbiService = mcpService;
} else {
  console.log('[PowerBI] No MCP path configured, using mock service');
  powerbiService = new PowerBIMockService();
}

const requestStore = new RequestStore();
const triageService = new TriageService();
const executionService = new ExecutionService(powerbiService);

// GitHub service for real PR creation
const repoPath = path.resolve(__dirname, '../..');
const githubService = new GitHubService(repoPath);

// Routes
app.use('/api/requests', createRequestRouter(requestStore, triageService, executionService, powerbiService, githubService));

// Client and model management endpoints
app.get('/api/clients', async (_req, res) => {
  try {
    const config = await githubService.getClients();
    res.json(config.clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

app.get('/api/clients/:clientId', async (req, res) => {
  try {
    const client = await githubService.getClient(req.params.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load client' });
  }
});

app.get('/api/clients/:clientId/models', async (req, res) => {
  try {
    const client = await githubService.getClient(req.params.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client.models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load models' });
  }
});

app.get('/api/models', async (_req, res) => {
  try {
    const models = await githubService.listAllModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load models' });
  }
});

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
  const pbiStatus = powerbiMode === 'mcp'
    ? 'MCP Service (Real PowerBI Desktop)'
    : 'Mock Service (Contoso Finance Model)';
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
║  PowerBI: ${pbiStatus.padEnd(44)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
