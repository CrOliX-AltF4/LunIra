// tests/plugins/runner.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { LLMProvider, CompletionRequest, ToolCall } from '../../src/providers/types.js';
import type { Plugin } from '../../src/plugins/types.js';

function toolUsingProvider(toolCallName: string, toolInput: unknown): LLMProvider {
  let callCount = 0;
  return {
    name: 'claude' as const,
    isConfigured: () => true,
    complete: vi.fn((_req: CompletionRequest) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          content: '',
          toolCalls: [{ id: 'tc_1', name: toolCallName, input: toolInput }] as ToolCall[],
          stopReason: 'tool_use' as const,
          inputTokens: 10,
          outputTokens: 5,
          durationMs: 50,
          model: 'claude-test',
          provider: 'claude' as const,
        });
      }
      return Promise.resolve({
        content: '{"result": "done"}',
        stopReason: 'end_turn' as const,
        inputTokens: 10,
        outputTokens: 5,
        durationMs: 50,
        model: 'claude-test',
        provider: 'claude' as const,
      });
    }),
  };
}

describe('callAgent with plugins', () => {
  it('executes tool handler and continues to final response', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');

    const handlerSpy = vi.fn().mockResolvedValue('handler result');
    const plugin: Plugin = {
      id: 'mock_tool',
      name: 'Mock Tool',
      role: 'dev',
      tool: {
        name: 'mock_tool',
        description: 'A mock tool',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      handler: handlerSpy,
    };

    const provider = toolUsingProvider('mock_tool', { key: 'value' });

    const result = await callAgent<{ result: string }>(
      'dev',
      provider,
      'claude-test',
      'You are Dev.',
      'do something',
      { plugins: [plugin], pluginContext: { runId: 'test-run', outputDir: '/tmp', cwd: '/tmp' } },
    );

    expect(handlerSpy).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledWith({ key: 'value' }, expect.any(Object));
    expect(result.output).toEqual({ result: 'done' });
  });

  it('does nothing when provider returns no tool calls', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');
    const provider = toolUsingProvider('never', {});
    (provider.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      content: '{"result": "direct"}',
      stopReason: 'end_turn' as const,
      inputTokens: 5,
      outputTokens: 3,
      durationMs: 30,
      model: 'test',
      provider: 'claude' as const,
    });

    const result = await callAgent<{ result: string }>(
      'dev',
      provider,
      'test',
      'prompt',
      'user',
      {},
    );
    expect(result.output).toEqual({ result: 'direct' });
  });
});
