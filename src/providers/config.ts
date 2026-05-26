import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { ProviderName } from '../types/index.js';

// ─── Storage ──────────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.lunatar');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

type ProviderConfig = Partial<Record<ProviderName, { apiKey: string }>>;

function readConfig(): ProviderConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as ProviderConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: ProviderConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// ─── Key resolution ───────────────────────────────────────────────────────────

const ENV_KEYS: Record<ProviderName, string[]> = {
  groq: ['GROQ_API_KEY'],
  // Accept both GEMINI_API_KEY (natsume convention) and GOOGLE_API_KEY
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  claude: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  nim: ['NIM_API_KEY', 'NVIDIA_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  ollama: [],
};

export function getApiKey(provider: ProviderName): string | undefined {
  // 1. environment variables take precedence (first match wins)
  for (const envVar of ENV_KEYS[provider]) {
    const fromEnv = process.env[envVar];
    if (fromEnv) return fromEnv;
  }

  // 2. fall back to persisted config
  const config = readConfig();
  return config[provider]?.apiKey;
}

export function setApiKey(provider: ProviderName, apiKey: string): void {
  const config = readConfig();
  config[provider] = { apiKey };
  writeConfig(config);
}

export function removeApiKey(provider: ProviderName): void {
  const config = readConfig();
  const updated = Object.fromEntries(
    Object.entries(config).filter(([k]) => k !== provider),
  ) as ProviderConfig;
  writeConfig(updated);
}

export function listConfiguredProviders(): ProviderName[] {
  const providers: ProviderName[] = [
    'groq',
    'gemini',
    'claude',
    'openai',
    'nim',
    'openrouter',
    'ollama',
  ];
  return providers.filter((p) => !!getApiKey(p));
}
