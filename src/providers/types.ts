import type { ProviderName } from '../types/index.js';

// ─── Request / Response ───────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[]; // populated only when role === 'assistant' and tool calls were made
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultMessage {
  role: 'tool';
  toolCallId: string;
  content: string;
}

export interface CompletionRequest {
  messages: (Message | ToolResultMessage)[];
  systemPrompt?: string;
  /** Enable prompt caching on the system prompt (Claude only for now) */
  cacheSystemPrompt?: boolean;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface CompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  /** Cache read tokens (Claude prompt caching) */
  cacheReadTokens?: number;
  /** Cache creation tokens (Claude prompt caching) */
  cacheCreationTokens?: number;
  durationMs: number;
  model: string;
  provider: ProviderName;
  toolCalls?: ToolCall[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens';
}

// ─── Provider meta ────────────────────────────────────────────────────────────

export interface ProviderMeta {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls?: string[]; // tool names called (may contain duplicates)
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface LLMProvider {
  readonly name: ProviderName;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  isConfigured(): boolean;
}
