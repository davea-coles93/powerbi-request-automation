/**
 * Wrapper to add modelPath support to existing tools
 */

import { TmdlService } from '../tmdl-service.js';
import { Tool } from './index.js';

// Cache TmdlService instances to avoid reloading the same model
const serviceCache = new Map<string, TmdlService>();

/**
 * Get or create a TmdlService instance for the given model path
 */
export async function getTmdlService(modelPath: string): Promise<TmdlService> {
  if (!serviceCache.has(modelPath)) {
    const service = new TmdlService(modelPath);
    await service.loadProject(); // Pre-load the project
    serviceCache.set(modelPath, service);
  }
  return serviceCache.get(modelPath)!;
}

/**
 * Wrap tools to add modelPath parameter support
 */
export function wrapTools(tools: Tool[]): Tool[] {
  return tools.map(tool => ({
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        modelPath: {
          type: 'string',
          description: 'Path to the .pbip file (e.g., C:/path/to/model.pbip)',
        },
        ...tool.inputSchema.properties,
      },
      required: ['modelPath', ...(tool.inputSchema.required || [])],
    },
    handler: async (args: any) => {
      // Get or create TmdlService for this model
      const tmdlService = await getTmdlService(args.modelPath);

      // Call original handler with injected service
      // This is a hack - we're setting a global but it works
      (global as any).__tmdlService = tmdlService;
      const result = await tool.handler(args);
      delete (global as any).__tmdlService;

      return result;
    },
  }));
}
