/**
 * MCP Client for communicating with TMDL MCP Server
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface McpToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class McpClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';
  private tools: McpToolDefinition[] = [];
  private modelPath: string;

  constructor(modelPath: string) {
    super();
    this.modelPath = modelPath;
  }

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    const serverPath = path.join(__dirname, '../../mcp-servers/tmdl/dist/index.js');

    this.process = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MODEL_PATH: this.modelPath,
      },
    });

    // Handle stdout (responses from server)
    this.process.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });

    // Handle stderr (logs from server)
    this.process.stderr?.on('data', (data) => {
      console.error('[MCP Server]', data.toString().trim());
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      console.log(`[MCP] Server exited with code ${code}`);
      this.process = null;
    });

    // Give server a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Load tools
    await this.loadTools();
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * Handle stdout data from server
   */
  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();

    // Process complete JSON-RPC messages
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        console.error('[MCP] Failed to parse message:', line);
      }
    }
  }

  /**
   * Handle a JSON-RPC message from the server
   */
  private handleMessage(message: any): void {
    if (message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'Unknown error'));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // Notification from server (not currently used)
      this.emit('notification', message);
    }
  }

  /**
   * Send a JSON-RPC request to the server
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP server not started');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || {},
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Load tool definitions from the server
   */
  private async loadTools(): Promise<void> {
    const response = await this.sendRequest('tools/list');
    this.tools = response.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  /**
   * Get tool definitions in Claude SDK format
   */
  getToolDefinitions(): McpToolDefinition[] {
    return this.tools;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<any> {
    const response = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    // Parse the text content from MCP response
    if (response.content && response.content[0]?.text) {
      return JSON.parse(response.content[0].text);
    }

    return response;
  }
}
