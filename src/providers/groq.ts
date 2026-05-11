import Groq from 'groq-sdk';
import type { LLMProvider, CompletionRequest, CompletionResponse, ToolCall } from './types.js';
import { getApiKey } from './config.js';

export class GroqProvider implements LLMProvider {
  readonly name = 'groq' as const;

  private client(): Groq {
    const apiKey = getApiKey('groq');
    if (!apiKey)
      throw new Error('Groq API key not configured. Run: lunatar config set groq.apiKey <key>');
    return new Groq({ apiKey });
  }

  isConfigured(): boolean {
    return !!getApiKey('groq');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    for (const m of request.messages) {
      if (m.role === 'tool') {
        messages.push({
          role: 'tool' as const,
          tool_call_id: m.toolCallId,
          content: m.content,
        } as Groq.Chat.ChatCompletionMessageParam);
      } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        messages.push({
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
          })),
        } as Groq.Chat.ChatCompletionMessageParam);
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const response = await client.chat.completions.create({
      model: request.modelId,
      messages: request.systemPrompt
        ? [{ role: 'system', content: request.systemPrompt }, ...messages]
        : messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stream: false,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('Groq returned no choices');

    const rawToolCalls = choice.message.tool_calls ?? [];
    const toolCalls: ToolCall[] = rawToolCalls
      .map((tc): ToolCall | null => {
        let parsedInput: unknown;
        try {
          parsedInput = JSON.parse(tc.function.arguments) as unknown;
        } catch {
          return null;
        }
        return { id: tc.id, name: tc.function.name, input: parsedInput };
      })
      .filter((tc): tc is ToolCall => tc !== null);

    return {
      content: choice.message.content ?? '',
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      stopReason:
        choice.finish_reason === 'tool_calls'
          ? ('tool_use' as const)
          : choice.finish_reason === 'length'
            ? ('max_tokens' as const)
            : ('end_turn' as const),
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      durationMs: Date.now() - start,
      model: response.model,
      provider: 'groq',
    };
  }
}
