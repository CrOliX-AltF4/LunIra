import type { ProviderName } from '../types/index.js';
import type { LLMProvider } from './types.js';
import { GroqProvider } from './groq.js';
import { GeminiProvider } from './gemini.js';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';
import { NimProvider } from './nim.js';

// ─── Registry ─────────────────────────────────────────────────────────────────

const instances = new Map<ProviderName, LLMProvider>();

function getInstance(name: ProviderName): LLMProvider {
  const cached = instances.get(name);
  if (cached) return cached;

  let provider: LLMProvider;
  switch (name) {
    case 'groq':
      provider = new GroqProvider();
      break;
    case 'gemini':
      provider = new GeminiProvider();
      break;
    case 'claude':
      provider = new ClaudeProvider();
      break;
    case 'openai':
      provider = new OpenAIProvider();
      break;
    case 'nim':
      provider = new NimProvider();
      break;
  }

  instances.set(name, provider);
  return provider;
}

export function getProvider(name: ProviderName): LLMProvider {
  return getInstance(name);
}

export function getAllProviders(): LLMProvider[] {
  const names: ProviderName[] = ['groq', 'gemini', 'claude', 'openai', 'nim'];
  return names.map(getInstance);
}

export function getConfiguredProviders(): LLMProvider[] {
  return getAllProviders().filter((p) => p.isConfigured());
}
