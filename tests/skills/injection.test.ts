import { describe, it, expect, vi } from 'vitest';
import type {
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
} from '../../src/providers/types.js';
import type { Skill } from '../../src/skills/types.js';

function mockProvider(content = '{}'): LLMProvider & { lastRequest: CompletionRequest | null } {
  const p = {
    name: 'groq' as const,
    lastRequest: null as CompletionRequest | null,
    isConfigured: () => true,
    complete: vi.fn((req: CompletionRequest): Promise<CompletionResponse> => {
      p.lastRequest = req;
      return Promise.resolve({
        content,
        inputTokens: 10,
        outputTokens: 5,
        durationMs: 100,
        model: 'test',
        provider: 'groq' as const,
      });
    }),
  };
  return p;
}

describe('skill injection in callAgent', () => {
  it('does not modify systemPrompt when no skills provided', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');
    const provider = mockProvider('{"result": true}');
    await callAgent('dev', provider, 'test-model', 'You are Dev.', 'build X');
    expect(provider.lastRequest?.systemPrompt).toBe('You are Dev.');
  });

  it('appends skill content to systemPrompt when skills are provided', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');

    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      role: 'dev',
      content: '## Test\nDo the test thing.',
      tokenEstimate: 10,
      cacheable: true,
    };

    const provider = mockProvider('{"result": true}');
    await callAgent('dev', provider, 'test-model', 'You are Dev.', 'build X', { skills: [skill] });

    expect(provider.lastRequest?.systemPrompt).toContain('You are Dev.');
    expect(provider.lastRequest?.systemPrompt).toContain('Do the test thing.');
  });

  it('appends multiple skills in order', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');

    const skills: Skill[] = [
      {
        id: 's1',
        name: 'S1',
        role: 'all',
        content: 'SKILL_ONE',
        tokenEstimate: 5,
        cacheable: true,
      },
      {
        id: 's2',
        name: 'S2',
        role: 'all',
        content: 'SKILL_TWO',
        tokenEstimate: 5,
        cacheable: true,
      },
    ];

    const provider = mockProvider('{"ok": true}');
    await callAgent('dev', provider, 'test-model', 'Base prompt.', 'user msg', { skills });

    const prompt = provider.lastRequest?.systemPrompt ?? '';
    expect(prompt.indexOf('SKILL_ONE')).toBeLessThan(prompt.indexOf('SKILL_TWO'));
  });
});
