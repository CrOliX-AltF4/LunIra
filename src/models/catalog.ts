import type { AgentRole, ModelSpec } from '../types/index.js';

// ─── Model catalog ────────────────────────────────────────────────────────────
// Pricing: USD per token (not per million).
// Sources: provider pricing pages — last reviewed 2026-04.

export const MODEL_CATALOG: ModelSpec[] = [
  // ── Groq ────────────────────────────────────────────────────────────────────
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    displayName: 'Llama 3.3 70B',
    contextWindow: 128_000,
    costPerInputToken: 0.00000059, // $0.59/M
    costPerOutputToken: 0.00000079, // $0.79/M
    avgLatencyMs: 800,
    strengths: ['clarification', 'analysis', 'debug'],
  },

  // ── Gemini ──────────────────────────────────────────────────────────────────
  {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: 1_048_576,
    costPerInputToken: 0.0000001, // $0.10/M
    costPerOutputToken: 0.0000004, // $0.40/M
    avgLatencyMs: 1200,
    strengths: ['architecture', 'analysis', 'code'],
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 2.5 Flash',
    contextWindow: 1_048_576,
    costPerInputToken: 0.00000015, // $0.15/M
    costPerOutputToken: 0.0000006, // $0.60/M
    avgLatencyMs: 1500,
    strengths: ['architecture', 'analysis', 'code'],
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    displayName: 'Gemini 2.5 Pro',
    contextWindow: 1_048_576,
    costPerInputToken: 0.00000125, // $1.25/M
    costPerOutputToken: 0.00001, // $10/M
    avgLatencyMs: 2000,
    strengths: ['architecture', 'code', 'analysis'],
  },

  // ── Claude ──────────────────────────────────────────────────────────────────
  {
    id: 'claude-sonnet-4-5',
    provider: 'claude',
    displayName: 'Claude Sonnet 4.5',
    contextWindow: 200_000,
    costPerInputToken: 0.000003, // $3/M
    costPerOutputToken: 0.000015, // $15/M
    avgLatencyMs: 2500,
    strengths: ['code', 'architecture', 'analysis'],
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'claude',
    displayName: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    costPerInputToken: 0.000003, // $3/M
    costPerOutputToken: 0.000015, // $15/M
    avgLatencyMs: 2500,
    strengths: ['code', 'architecture', 'analysis'],
  },
  {
    id: 'claude-opus-4-6',
    provider: 'claude',
    displayName: 'Claude Opus 4.6',
    contextWindow: 200_000,
    costPerInputToken: 0.000015, // $15/M
    costPerOutputToken: 0.000075, // $75/M
    avgLatencyMs: 4000,
    strengths: ['code', 'architecture'],
  },

  // ── NVIDIA NIM ──────────────────────────────────────────────────────────────
  // Free endpoints — rate limits not guaranteed, use as fallback/experimentation.
  {
    id: 'deepseek-ai/deepseek-r1-0528',
    provider: 'nim',
    displayName: 'DeepSeek R1 (NIM)',
    contextWindow: 1_000_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 3000,
    strengths: ['code', 'architecture', 'analysis'],
  },
  {
    id: 'nvidia/nemotron-super-49b-v1',
    provider: 'nim',
    displayName: 'Nemotron Super 49B (NIM)',
    contextWindow: 1_000_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 2500,
    strengths: ['architecture', 'analysis'],
  },
  {
    id: 'mistralai/mistral-medium-3',
    provider: 'nim',
    displayName: 'Mistral Medium 3 (NIM)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 1500,
    strengths: ['clarification', 'analysis', 'debug'],
  },

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o mini',
    contextWindow: 128_000,
    costPerInputToken: 0.00000015, // $0.15/M
    costPerOutputToken: 0.0000006, // $0.60/M
    avgLatencyMs: 1000,
    strengths: ['clarification', 'analysis', 'debug'],
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128_000,
    costPerInputToken: 0.0000025, // $2.50/M
    costPerOutputToken: 0.00001, // $10/M
    avgLatencyMs: 2000,
    strengths: ['code', 'analysis', 'clarification'],
  },

  // ── OpenRouter ────────────────────────────────────────────────────────────────
  // Curated models accessible with a single OpenRouter API key.
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    provider: 'openrouter',
    displayName: 'Llama 3.3 70B (OR free)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 1500,
    strengths: ['clarification', 'analysis', 'debug'],
  },
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct:free',
    provider: 'openrouter',
    displayName: 'Mistral Small 3.2 (OR free)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 1200,
    strengths: ['clarification', 'analysis'],
  },
  {
    id: 'google/gemini-2.5-flash',
    provider: 'openrouter',
    displayName: 'Gemini 2.5 Flash (OR)',
    contextWindow: 1_048_576,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    avgLatencyMs: 1500,
    strengths: ['architecture', 'analysis', 'code'],
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    provider: 'openrouter',
    displayName: 'Claude Sonnet 4.5 (OR)',
    contextWindow: 200_000,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    avgLatencyMs: 2500,
    strengths: ['code', 'architecture', 'analysis'],
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
    displayName: 'DeepSeek R1 (OR free)',
    contextWindow: 163_840,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 3500,
    strengths: ['code', 'architecture', 'analysis'],
  },

  // ── Ollama (local) ────────────────────────────────────────────────────────────
  // Requires Ollama running on localhost:11434. Latency estimates for a mid-range GPU.
  {
    id: 'llama3.2',
    provider: 'ollama',
    displayName: 'Llama 3.2 (local)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 2000,
    strengths: ['clarification', 'analysis'],
  },
  {
    id: 'qwen2.5-coder',
    provider: 'ollama',
    displayName: 'Qwen 2.5 Coder (local)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 3000,
    strengths: ['code'],
  },
  {
    id: 'deepseek-r1',
    provider: 'ollama',
    displayName: 'DeepSeek R1 (local)',
    contextWindow: 128_000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 4000,
    strengths: ['code', 'architecture', 'analysis'],
  },
];

// ─── Default model per role ───────────────────────────────────────────────────
// Strategy: fast+cheap for routing roles (PO, QA), best available for generation (Dev).

export const DEFAULT_ROLE_MODELS: Record<AgentRole, string> = {
  po: 'llama-3.3-70b-versatile', // fastest clarification, free tier
  planner: 'gemini-2.5-flash', // 1M context, strong reasoning, cost-efficient
  dev: 'claude-sonnet-4-6', // best code quality
  qa: 'llama-3.3-70b-versatile', // fast validation, free tier
};

export function getModelById(id: string): ModelSpec | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function getDefaultModel(role: AgentRole): ModelSpec {
  const id = DEFAULT_ROLE_MODELS[role];
  const model = getModelById(id);
  if (!model) throw new Error(`Default model not found for role: ${role}`);
  return model;
}
