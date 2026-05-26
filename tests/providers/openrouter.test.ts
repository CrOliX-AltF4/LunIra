import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../src/providers/openrouter.js';

vi.mock('../../src/providers/config.js', () => ({
  getApiKey: vi.fn(),
}));

import { getApiKey } from '../../src/providers/config.js';

describe('OpenRouterProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('name is openrouter', () => {
    expect(new OpenRouterProvider().name).toBe('openrouter');
  });

  it('isConfigured returns false when no key', () => {
    vi.mocked(getApiKey).mockReturnValue(undefined);
    expect(new OpenRouterProvider().isConfigured()).toBe(false);
  });

  it('isConfigured returns true when key present', () => {
    vi.mocked(getApiKey).mockReturnValue('sk-or-test');
    expect(new OpenRouterProvider().isConfigured()).toBe(true);
  });

  it('complete throws when not configured', async () => {
    vi.mocked(getApiKey).mockReturnValue(undefined);
    const provider = new OpenRouterProvider();
    await expect(
      provider.complete({ messages: [], modelId: 'test', maxTokens: 100 }),
    ).rejects.toThrow('OpenRouter API key not configured');
  });
});
