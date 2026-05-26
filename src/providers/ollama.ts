import OpenAI from 'openai';
import type { LLMProvider, CompletionRequest, CompletionResponse, ToolCall } from './types.js';

const OLLAMA_BASE_URL = process.env['OLLAMA_HOST'] ?? 'http://localhost:11434/v1';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;

  private client(): OpenAI {
    return new OpenAI({ apiKey: 'ollama', baseURL: OLLAMA_BASE_URL });
  }

  isConfigured(): boolean {
    // True only when OLLAMA_HOST is explicitly set, avoiding auto-selection when Ollama is not running.
    // Users can still invoke --provider ollama without OLLAMA_HOST; the connection error becomes a retriable fallback.
    return !!process.env['OLLAMA_HOST'];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const m of request.messages) {
      if (m.role === 'tool') {
        messages.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content });
      } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        messages.push({
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
          })),
        });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const response = await client.chat.completions.create({
      model: request.modelId,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('Ollama returned no choices');

    const rawToolCalls = choice.message.tool_calls ?? [];
    const toolCalls: ToolCall[] = rawToolCalls
      .filter(
        (
          tc,
        ): tc is typeof tc & { type: 'function'; function: { name: string; arguments: string } } =>
          tc.type === 'function',
      )
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
      provider: 'ollama',
    };
  }
}
