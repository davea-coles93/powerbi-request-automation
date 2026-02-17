import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createTmdlRequestRouter } from './routes/tmdlRequests';
import { createVisualRequestRouter } from './routes/visualRequests';
import { RequestStore } from './services/requestStore';
import { TriageService } from './services/triageService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet()); // Security headers

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' })); // Limit JSON payload size

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window (increased for testing)
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Paths
const repoPath = process.env.REPO_PATH || path.resolve(__dirname, '../..');
const modelsPath = path.join(repoPath, 'models');

// Initialize services
const requestStore = new RequestStore();
const triageService = new TriageService();

// Routes - TMDL-based request handling
app.use('/api/requests', createTmdlRequestRouter(requestStore, triageService, repoPath));

// Routes - Visual creation with feedback loop
app.use('/api/visuals', createVisualRequestRouter(requestStore));

// Client and model management endpoints
app.get('/api/clients', async (_req, res) => {
  try {
    const configPath = path.join(modelsPath, 'clients.json');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    res.json(config.clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

app.get('/api/clients/:clientId', async (req, res) => {
  try {
    const configPath = path.join(modelsPath, 'clients.json');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    const client = config.clients.find((c: { id: string }) => c.id === req.params.clientId);
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
    const configPath = path.join(modelsPath, 'clients.json');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    const client = config.clients.find((c: { id: string }) => c.id === req.params.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client.models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load models' });
  }
});

// Root endpoint - API info
app.get('/', (_req, res) => {
  res.send(`
    <html>
      <head><title>PowerBI Request Automation API</title></head>
      <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1>PowerBI Request Automation API</h1>
        <p>API is running. Use the endpoints below or the frontend at <a href="http://localhost:3000">http://localhost:3000</a></p>
        <h2>Endpoints</h2>
        <ul>
          <li><strong>POST /api/requests</strong> - Create a change request</li>
          <li><strong>GET /api/requests</strong> - List all requests</li>
          <li><strong>GET /api/requests/:id</strong> - Get request by ID</li>
          <li><strong>POST /api/requests/:id/execute</strong> - Trigger execution</li>
          <li><strong>GET /api/clients</strong> - List clients</li>
          <li><strong>GET /api/health</strong> - Health check</li>
        </ul>
        <h2>Quick Test</h2>
        <pre style="background: #f4f4f4; padding: 15px; overflow-x: auto;">
curl -X POST http://localhost:3001/api/requests \\
  -H "Content-Type: application/json" \\
  -d '{"clientId": "contoso-corp", "modelName": "sales-returns", "title": "Add Profit Margin", "description": "Create a measure for profit margin percentage", "urgency": "medium"}'
        </pre>
      </body>
    </html>
  `);
});

// Health check (sanitized - no sensitive info)
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       PowerBI Request Automation - TMDL Mode                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Security: CORS ✓ | Rate Limit ✓ | Helmet ✓                  ║
║                                                               ║
║  Endpoints:                                                   ║
║    POST   /api/requests          - Create change request      ║
║    GET    /api/requests          - List all requests          ║
║    GET    /api/requests/:id      - Get request by ID          ║
║    POST   /api/requests/:id/execute - Trigger execution       ║
║    POST   /api/visuals/create-visuals - Create with feedback  ║
║    POST   /api/visuals/test-visual - Test visual creation     ║
║    GET    /api/requests/stats/summary - Get statistics        ║
║    GET    /api/clients           - List clients               ║
║    GET    /api/health            - Health check               ║
║                                                               ║
║  Mode: TMDL (Git-based version control)                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
