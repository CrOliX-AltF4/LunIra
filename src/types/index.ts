// ─── Agent roles ─────────────────────────────────────────────────────────────

export type AgentRole = 'po' | 'planner' | 'dev' | 'qa';

// ─── LLM providers ───────────────────────────────────────────────────────────

export type ProviderName =
  | 'groq'
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'nim'
  | 'openrouter'
  | 'ollama';

// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskType = 'clarification' | 'architecture' | 'code' | 'analysis' | 'debug';

export type ComplexityLevel = 'low' | 'medium' | 'high';

// ─── Model ────────────────────────────────────────────────────────────────────

export interface ModelSpec {
  id: string;
  provider: ProviderName;
  displayName: string;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  avgLatencyMs: number;
  strengths: TaskType[];
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineStep {
  id: string;
  role: AgentRole;
  taskType: TaskType;
  status: PipelineStepStatus;
  modelId?: string;
  provider?: ProviderName;
  input?: string;
  output?: string | undefined;
  tokensUsed?: number;
  costUsd?: number;
  durationMs?: number;
  error?: string | undefined;
  skillsTokens?: number; // estimated tokens from injected skills
  pluginsCalls?: Record<string, number>; // pluginId → call count
}

export interface PipelineRun {
  id: string;
  createdAt: string;
  intent: string;
  steps: PipelineStep[];
  totalCostUsd: number;
  totalTokens: number;
  totalDurationMs: number;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  iterations?: number; // undefined = single pass (no QA retry occurred)
}

// ─── Model Recommendation ────────────────────────────────────────────────────

export interface ModelRecommendation {
  recommended: ModelSpec;
  alternatives: ModelSpec[];
  reason: string;
  estimatedCostUsd: number;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface SystemMetrics {
  cpuUsagePercent: number;
  memUsedMb: number;
  memTotalMb: number;
  timestamp: number;
}
