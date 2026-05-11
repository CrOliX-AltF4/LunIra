import type { AgentRole } from '../types/index.js';
import type { ToolDefinition } from '../providers/types.js';

export interface PluginContext {
  runId: string;
  outputDir: string;
  cwd: string;
}

export interface Plugin {
  id: string;
  name: string;
  role: AgentRole | 'all';
  tool: ToolDefinition;
  handler: (input: unknown, context: PluginContext) => Promise<string>;
}
