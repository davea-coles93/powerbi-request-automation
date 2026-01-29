/**
 * Power BI Report MCP Service
 * Interfaces with the powerbi-report MCP server to create and modify report visuals
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
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

export class ReportMcpService {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private isInitialized = false;

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    const mcpPath = path.join(__dirname, '../../../mcp-servers/powerbi-report/build/index.js');

    this.process = spawn('node', [mcpPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
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
        console.error('[ReportMCP] Failed to parse response:', line, error);
      }
    });

    this.process.stderr?.on('data', (data) => {
      console.error('[ReportMCP]', data.toString());
    });

    this.process.on('exit', (code) => {
      console.log(`[ReportMCP] Process exited with code ${code}`);
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
    console.log('[ReportMCP] Service started');
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

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('ReportMCP service not initialized');
    }

    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    // Extract text content from MCP response
    if (result && result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && textContent.text) {
        return JSON.parse(textContent.text);
      }
    }

    return result;
  }

  /**
   * Create a new page in a report
   */
  async createPage(
    reportPath: string,
    pageName: string,
    displayName: string,
    width: number = 1280,
    height: number = 720
  ): Promise<any> {
    return this.callTool('create_page', {
      reportPath,
      pageName,
      displayName,
      width,
      height,
    });
  }

  /**
   * Create a card visual
   */
  async createCardVisual(
    reportPath: string,
    pageName: string,
    measureEntity: string,
    measureProperty: string,
    position: { x: number; y: number; width: number; height: number },
    title?: string
  ): Promise<any> {
    return this.callTool('create_card_visual', {
      reportPath,
      pageName,
      measureEntity,
      measureProperty,
      position: { ...position, z: 0 },
      title,
    });
  }

  /**
   * Create a table visual
   */
  async createTableVisual(
    reportPath: string,
    pageName: string,
    columns: Array<{ entity: string; property: string }>,
    position: { x: number; y: number; width: number; height: number },
    title?: string
  ): Promise<any> {
    return this.callTool('create_table_visual', {
      reportPath,
      pageName,
      columns,
      position: { ...position, z: 0 },
      title,
    });
  }

  /**
   * Create a bar chart visual
   */
  async createBarChartVisual(
    reportPath: string,
    pageName: string,
    categoryEntity: string,
    categoryProperty: string,
    valueEntity: string,
    valueProperty: string,
    position: { x: number; y: number; width: number; height: number },
    title?: string
  ): Promise<any> {
    return this.callTool('create_bar_chart_visual', {
      reportPath,
      pageName,
      categoryEntity,
      categoryProperty,
      valueEntity,
      valueProperty,
      position: { ...position, z: 0 },
      aggregation: 0, // Sum
      title,
    });
  }

  /**
   * List all visuals on a page
   */
  async listVisuals(reportPath: string, pageName: string): Promise<any> {
    return this.callTool('list_visuals', {
      reportPath,
      pageName,
    });
  }

  /**
   * Analyze report structure
   */
  async analyzeReport(reportPath: string): Promise<any> {
    return this.callTool('analyze_report', {
      reportPath,
    });
  }
}
