import { describe, it, expect } from 'vitest';
import { OllamaProvider } from '../../src/providers/ollama.js';

describe('OllamaProvider', () => {
  it('name is ollama', () => {
    expect(new OllamaProvider().name).toBe('ollama');
  });

  it('isConfigured returns false when OLLAMA_HOST not set', () => {
    const saved = process.env['OLLAMA_HOST'];
    delete process.env['OLLAMA_HOST'];
    expect(new OllamaProvider().isConfigured()).toBe(false);
    if (saved !== undefined) process.env['OLLAMA_HOST'] = saved;
  });

  it('isConfigured returns true when OLLAMA_HOST is set', () => {
    process.env['OLLAMA_HOST'] = 'http://localhost:11434/v1';
    expect(new OllamaProvider().isConfigured()).toBe(true);
    delete process.env['OLLAMA_HOST'];
  });

  it('complete throws on connection error when Ollama not running', async () => {
    const provider = new OllamaProvider();
    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'hi' }],
        modelId: 'llama3.2',
        maxTokens: 100,
      }),
    ).rejects.toThrow();
  });
});
