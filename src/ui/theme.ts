import type { PipelineStepStatus, ProviderName, AgentRole } from '../types/index.js';

// ─── Status icons ─────────────────────────────────────────────────────────────

export const STATUS_ICONS: Record<PipelineStepStatus, string> = {
  pending: '○',
  running: '◆',
  completed: '✓',
  failed: '✗',
  skipped: '–',
};

// ─── Status colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<PipelineStepStatus, string> = {
  pending: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  skipped: 'gray',
};

// ─── Provider colors ──────────────────────────────────────────────────────────

export const PROVIDER_COLORS: Record<ProviderName, string> = {
  groq: 'cyan',
  gemini: 'blue',
  claude: 'magenta',
  openai: 'green',
  nim: 'yellow',
};

// ─── Role labels ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<AgentRole, string> = {
  po: 'PO     ',
  planner: 'Planner',
  dev: 'Dev    ',
  qa: 'QA     ',
};

export const ROLE_TASK_LABELS: Record<AgentRole, string> = {
  po: 'Clarification',
  planner: 'Architecture',
  dev: 'Code generation',
  qa: 'Validation',
};
