import type { AgentRole, PipelineRun } from './index.js';

export type PipelineEvent =
  | { type: 'step_started'; stepId: string; role: AgentRole; provider: string; modelId: string }
  | {
      type: 'step_completed';
      stepId: string;
      role: AgentRole;
      costUsd: number;
      tokensUsed: number;
      durationMs: number;
    }
  | { type: 'step_failed'; stepId: string; role: AgentRole; error: string }
  | { type: 'step_skipped'; stepId: string; role: AgentRole }
  | { type: 'plugin_called'; stepId: string; pluginId: string; callCount: number }
  | { type: 'provider_switched'; stepId: string; from: string; to: string }
  | { type: 'run_completed'; run: PipelineRun };
