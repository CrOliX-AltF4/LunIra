import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, CompletionRequest, CompletionResponse, ToolCall } from './types.js';
import { getApiKey } from './config.js';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;

  private client(): Anthropic {
    const apiKey = getApiKey('claude');
    if (!apiKey)
      throw new Error(
        'Anthropic API key not configured. Run: lunatar config set claude.apiKey <key>',
      );
    return new Anthropic({ apiKey });
  }

  isConfigured(): boolean {
    return !!getApiKey('claude');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    // Build system prompt — apply prompt caching when requested
    const systemParam: Anthropic.Messages.MessageCreateParamsNonStreaming['system'] =
      request.systemPrompt
        ? request.cacheSystemPrompt
          ? [
              {
                type: 'text' as const,
                text: request.systemPrompt,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : request.systemPrompt
        : undefined;

    const messages: Anthropic.Messages.MessageParam[] = request.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            { type: 'tool_result' as const, tool_use_id: m.toolCallId, content: m.content },
          ],
        };
      }
      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];
        if (m.content) contentBlocks.push({ type: 'text', text: m.content });
        for (const tc of m.toolCalls) {
          contentBlocks.push({
            type: 'tool_use' as const,
            id: tc.id,
            name: tc.name,
            input: tc.input as Record<string, unknown>,
          });
        }
        return { role: 'assistant' as const, content: contentBlocks };
      }
      return { role: m.role, content: m.content };
    });

    const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: request.modelId,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(systemParam !== undefined ? { system: systemParam } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      ...(request.tools && request.tools.length > 0
        ? {
            tools: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema as Anthropic.Messages.Tool['input_schema'],
            })),
          }
        : {}),
    };

    const response = await client.messages.create(params);

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';

    const toolCalls: ToolCall[] = response.content
      .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));

    const { usage } = response;

    const result: CompletionResponse = {
      content,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      stopReason:
        response.stop_reason === 'tool_use'
          ? 'tool_use'
          : response.stop_reason === 'max_tokens'
            ? 'max_tokens'
            : 'end_turn',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      durationMs: Date.now() - start,
      model: response.model,
      provider: 'claude',
    };

    if (usage.cache_read_input_tokens != null) {
      result.cacheReadTokens = usage.cache_read_input_tokens;
    }
    if (usage.cache_creation_input_tokens != null) {
      result.cacheCreationTokens = usage.cache_creation_input_tokens;
    }

    return result;
  }
}
