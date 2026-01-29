/**
 * Power BI Automation MCP Service
 * Interfaces with the powerbi-automation MCP server for Windows automation
 */

import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: any;
}

export class AutomationMcpService {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private isInitialized = false;

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    // Use 'py' on Windows, 'python3' on other platforms
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    this.process = spawn(pythonCmd, ['-m', 'powerbi_automation_mcp.server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    // Set up response handler
    const rl = readline.createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      try {
        const response: McpResponse = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(response.error.message || JSON.stringify(response.error)));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (error) {
        console.error('[AutomationMCP] Failed to parse response:', line, error);
      }
    });

    this.process.stderr?.on('data', (data) => {
      const output = data.toString();
      // Filter out non-error messages
      if (!output.includes('Power BI Desktop Automation MCP Server')) {
        console.error('[AutomationMCP]', output);
      }
    });

    this.process.on('exit', (code) => {
      console.log(`[AutomationMCP] Process exited with code ${code}`);
      this.isInitialized = false;
    });

    // Initialize MCP protocol
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'powerbi-automation-backend',
        version: '1.0.0',
      },
    });

    await this.sendRequest('initialized', {});

    this.isInitialized = true;
    console.log('[AutomationMCP] Service started');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isInitialized = false;
    }
  }

  /**
   * Send a request to the MCP server
   */
  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('MCP process not running'));
        return;
      }

      const id = ++this.requestId;
      const request: McpRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 60 seconds (automation can be slow)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('AutomationMCP service not initialized');
    }

    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    // Extract content from MCP response
    if (result && result.content && Array.isArray(result.content)) {
      // Check for image content first
      const imageContent = result.content.find((c: any) => c.type === 'image');
      if (imageContent) {
        return {
          type: 'image',
          data: imageContent.data,
          mimeType: imageContent.mimeType,
        };
      }

      // Otherwise get text content
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && textContent.text) {
        try {
          return JSON.parse(textContent.text);
        } catch {
          return { message: textContent.text };
        }
      }
    }

    return result;
  }

  /**
   * Launch Power BI Desktop with a PBIP file
   */
  async launchPowerBI(pbipPath: string, timeout: number = 60): Promise<any> {
    return this.callTool('launch_powerbi', {
      pbipPath,
      timeout,
    });
  }

  /**
   * Check if Power BI is running
   */
  async isPowerBIRunning(): Promise<boolean> {
    const result = await this.callTool('is_powerbi_running', {});
    return result.running === true;
  }

  /**
   * Wait for Power BI to be ready
   */
  async waitForReady(timeout: number = 30): Promise<boolean> {
    const result = await this.callTool('wait_for_ready', { timeout });
    return result.ready === true;
  }

  /**
   * Save the current file
   */
  async saveCurrentFile(): Promise<any> {
    return this.callTool('save_current_file', {});
  }

  /**
   * Close Power BI Desktop
   */
  async closePowerBI(save: boolean = true): Promise<any> {
    return this.callTool('close_powerbi', { save });
  }

  /**
   * Take a screenshot of Power BI Desktop
   * Returns base64-encoded PNG image
   */
  async takeScreenshot(pageName?: string): Promise<{ type: string; data: string; mimeType: string } | null> {
    const result = await this.callTool('take_screenshot', { pageName });

    if (result.type === 'image') {
      return result;
    }

    return null;
  }

  /**
   * Refresh data in the report
   */
  async refreshData(): Promise<any> {
    return this.callTool('refresh_data', {});
  }
}
