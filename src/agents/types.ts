import type { AgentRole, ComplexityLevel, ProviderName } from '../types/index.js';
import type { LLMProvider } from '../providers/types.js';
import type { Skill } from '../skills/types.js';
import type { Plugin } from '../plugins/types.js';

// ─── Agent options ────────────────────────────────────────────────────────────

export interface AgentOptions {
  /** Resolved LLM provider (from registry). */
  provider: LLMProvider;
  /** Exact model ID to use (e.g. "llama-3.3-70b-versatile"). */
  modelId: string;
  /** Active skills to inject into this agent's system prompt. */
  skills?: Skill[];
  /** Active plugins available to this agent for tool use. */
  plugins?: Plugin[];
}

// ─── Agent result ─────────────────────────────────────────────────────────────

export interface AgentMeta {
  role: AgentRole;
  modelId: string;
  provider: ProviderName;
  inputTokens: number;
  outputTokens: number;
  /** Claude prompt-cache read tokens (0 for other providers). */
  cacheReadTokens: number;
  /** Claude prompt-cache creation tokens (0 for other providers). */
  cacheCreationTokens: number;
  costUsd: number;
  durationMs: number;
  /** Number of retries needed (0 = first attempt succeeded). */
  retries: number;
}

export interface AgentResult<T> {
  output: T;
  meta: AgentMeta;
}

// ─── PO Agent ─────────────────────────────────────────────────────────────────

export interface POInput {
  intent: string;
}

export interface POOutput {
  clarifiedGoal: string;
  requirements: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  complexity: ComplexityLevel;
  /** Assumptions the PO made to fill ambiguities. */
  assumptions: string[];
}

// ─── Planner Agent ────────────────────────────────────────────────────────────

export interface PlannerInput {
  clarifiedGoal: string;
  requirements: string[];
  constraints: string[];
  complexity: ComplexityLevel;
}

export interface PlannerTask {
  id: string;
  description: string;
  /** IDs of tasks that must complete before this one. */
  dependsOn: string[];
}

export interface PlannerOutput {
  /** One-paragraph architecture overview. */
  architecture: string;
  techStack: string[];
  tasks: PlannerTask[];
  /** Relative file paths the Dev agent should create or modify. */
  estimatedFiles: string[];
  risks: string[];
}

// ─── Dev Agent ────────────────────────────────────────────────────────────────

export interface DevInput {
  clarifiedGoal: string;
  architecture: string;
  techStack: string[];
  tasks: PlannerTask[];
}

export interface CodeFile {
  /** Relative path from project root. */
  path: string;
  content: string;
  /** One-line description of the file's purpose. */
  description: string;
}

export interface DevOutput {
  files: CodeFile[];
  /** Files / functions that serve as entry points (for QA). */
  entryPoints: string[];
  /** Non-obvious decisions or caveats for the QA agent. */
  implementationNotes: string[];
}

// ─── QA Agent ─────────────────────────────────────────────────────────────────

export interface QAInput {
  requirements: string[];
  acceptanceCriteria: string[];
  files: CodeFile[];
  entryPoints: string[];
}

export type QAVerdict = 'pass' | 'fail' | 'partial';
export type IssueSeverity = 'critical' | 'major' | 'minor';

export interface QAIssue {
  severity: IssueSeverity;
  /** Relative file path, if applicable. */
  file?: string;
  line?: number;
  description: string;
  suggestion: string;
}

export interface QAOutput {
  verdict: QAVerdict;
  /** Overall quality score 0–100. */
  score: number;
  issues: QAIssue[];
  suggestions: string[];
  /** Requirement text → covered (true/false). */
  requirementsCoverage: Record<string, boolean>;
}
