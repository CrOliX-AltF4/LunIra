import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/providers/config.js', () => ({
  getApiKey: vi.fn(),
}));

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }
  return { default: AnthropicMock };
});

const { getApiKey } = await import('../../src/providers/config.js');
const { ClaudeProvider } = await import('../../src/providers/claude.js');

const mockGetApiKey = vi.mocked(getApiKey);

function makeClaudeResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: [{ type: 'text', text: 'Hello' }],
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    model: 'claude-3-5-sonnet-20241022',
    ...overrides,
  };
}

describe('ClaudeProvider', () => {
  let provider: InstanceType<typeof ClaudeProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider();
  });

  it('isConfigured returns false when no key', () => {
    mockGetApiKey.mockReturnValue(undefined);
    expect(provider.isConfigured()).toBe(false);
  });

  it('isConfigured returns true when key present', () => {
    mockGetApiKey.mockReturnValue('test-key');
    expect(provider.isConfigured()).toBe(true);
  });

  it('complete throws when no API key configured', async () => {
    mockGetApiKey.mockReturnValue(undefined);
    await expect(
      provider.complete({ modelId: 'm', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow('Anthropic API key not configured');
  });

  it('complete returns mapped response', async () => {
    mockGetApiKey.mockReturnValue('test-key');
    mockCreate.mockResolvedValue(makeClaudeResponse());

    const result = await provider.complete({
      modelId: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('Hello');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(result.provider).toBe('claude');
    expect(result.stopReason).toBe('end_turn');
  });

  it('complete maps tool_use stop_reason', async () => {
    mockGetApiKey.mockReturnValue('test-key');
    mockCreate.mockResolvedValue(
      makeClaudeResponse({
        content: [
          {
            type: 'tool_use',
            id: 'tool_abc',
            name: 'my_tool',
            input: { key: 'val' },
          },
        ],
        stop_reason: 'tool_use',
      }),
    );

    const result = await provider.complete({
      modelId: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'call tool' }],
    });

    expect(result.stopReason).toBe('tool_use');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0]?.name).toBe('my_tool');
  });

  it('complete maps max_tokens stop_reason', async () => {
    mockGetApiKey.mockReturnValue('test-key');
    mockCreate.mockResolvedValue(makeClaudeResponse({ stop_reason: 'max_tokens' }));

    const result = await provider.complete({
      modelId: 'm',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.stopReason).toBe('max_tokens');
  });
});
