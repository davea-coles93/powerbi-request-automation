/**
 * MCP Client for communicating with PowerBI Desktop MCP server
 * Uses JSON-RPC over stdio to spawn and communicate with the MCP server
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private serverPath: string;
  private initialized = false;
  private readline: readline.Interface | null = null;

  constructor(serverPath: string) {
    super();
    this.serverPath = serverPath;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[MCP Client] Starting server: ${this.serverPath}`);

        this.process = spawn(this.serverPath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        });

        if (!this.process.stdout || !this.process.stdin) {
          reject(new Error('Failed to create stdio streams'));
          return;
        }

        // Set up readline for line-by-line reading
        this.readline = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        this.readline.on('line', (line) => {
          this.handleMessage(line);
        });

        this.process.stderr?.on('data', (data) => {
          console.error(`[MCP Server Error] ${data.toString()}`);
        });

        this.process.on('error', (err) => {
          console.error('[MCP Client] Process error:', err);
          this.emit('error', err);
          if (!this.initialized) {
            reject(err);
          }
        });

        this.process.on('close', (code) => {
          console.log(`[MCP Client] Server process exited with code ${code}`);
          this.initialized = false;
          this.emit('close', code);
        });

        // Initialize the MCP connection
        this.initialize()
          .then(() => {
            this.initialized = true;
            resolve(true);
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async initialize(): Promise<void> {
    // Send initialize request
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'powerbi-automation-backend',
        version: '1.0.0',
      },
    });

    console.log('[MCP Client] Initialized:', result);

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});
  }

  private handleMessage(line: string): void {
    try {
      const message = JSON.parse(line) as JsonRpcResponse;

      if (message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      }
    } catch (error) {
      // Not JSON or parsing error - might be server output
      if (line.trim()) {
        console.log('[MCP Server]', line);
      }
    }
  }

  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP client not connected'));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request) + '\n';
      this.process.stdin.write(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.process?.stdin) {
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  async call(tool: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    const result = await this.sendRequest('tools/call', {
      name: tool,
      arguments: params,
    }) as { content: Array<{ type: string; text?: string }> };

    // Extract the result from the MCP response format
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find(c => c.type === 'text');
      if (textContent?.text) {
        try {
          return JSON.parse(textContent.text);
        } catch {
          return textContent.text;
        }
      }
    }

    return result;
  }

  async listTools(): Promise<unknown> {
    return this.sendRequest('tools/list', {});
  }

  disconnect(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.initialized = false;
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.initialized && this.process !== null;
  }
}
