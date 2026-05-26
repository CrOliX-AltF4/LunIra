import {
  getApiKey,
  setApiKey,
  removeApiKey,
  listConfiguredProviders,
} from '../../providers/index.js';
import type { ProviderName } from '../../types/index.js';

const VALID_PROVIDERS: ProviderName[] = [
  'openrouter',
  'groq',
  'gemini',
  'claude',
  'openai',
  'nim',
  'ollama',
];
const PROVIDER_ENV: Record<ProviderName, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  nim: 'NIM_API_KEY',
  ollama: 'OLLAMA_HOST',
};

function isProviderName(value: string): value is ProviderName {
  return (VALID_PROVIDERS as string[]).includes(value);
}

/**
 * Parse "provider.apiKey" key format.
 * Returns { provider } or null if the key is invalid.
 */
function parseKey(key: string): { provider: ProviderName } | null {
  const [provider, field] = key.split('.');
  if (!provider || field !== 'apiKey' || !isProviderName(provider)) return null;
  return { provider };
}

export function configCommand(action: string, key: string, value?: string): void {
  switch (action) {
    case 'get': {
      const parsed = parseKey(key);
      if (!parsed) {
        console.error(`Invalid key "${key}". Use format: <provider>.apiKey`);
        process.exit(1);
      }
      const apiKey = getApiKey(parsed.provider);
      if (!apiKey) {
        console.log(`${key}: (not set)`);
      } else {
        // Mask all but the last 4 characters
        const masked = apiKey.slice(0, -4).replace(/./g, '*') + apiKey.slice(-4);
        console.log(`${key}: ${masked}`);
        if (process.env[PROVIDER_ENV[parsed.provider]]) {
          console.log(`  (resolved from environment variable ${PROVIDER_ENV[parsed.provider]})`);
        }
      }
      break;
    }

    case 'set': {
      const parsed = parseKey(key);
      if (!parsed) {
        console.error(`Invalid key "${key}". Use format: <provider>.apiKey`);
        process.exit(1);
      }
      if (!value) {
        console.error('A value is required for the set action.');
        process.exit(1);
      }
      setApiKey(parsed.provider, value);
      console.log(`✓ ${key} saved to ~/.lunatar/config.json`);
      break;
    }

    case 'unset': {
      const parsed = parseKey(key);
      if (!parsed) {
        console.error(`Invalid key "${key}". Use format: <provider>.apiKey`);
        process.exit(1);
      }
      removeApiKey(parsed.provider);
      console.log(`✓ ${key} removed from ~/.lunatar/config.json`);
      break;
    }

    case 'list': {
      const configured = listConfiguredProviders();
      if (configured.length === 0) {
        console.log('No providers configured.\nRun: lunatar config set <provider>.apiKey <key>');
      } else {
        console.log('Configured providers:');
        for (const provider of configured) {
          const fromEnv = process.env[PROVIDER_ENV[provider]] ? ' (from env)' : '';
          console.log(`  ✓ ${provider}${fromEnv}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown action "${action}". Valid actions: get, set, unset, list`);
      process.exit(1);
  }
}
