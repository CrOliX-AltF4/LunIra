import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, CompletionRequest, CompletionResponse } from './types.js';
import { getApiKey } from './config.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;

  private client(): GoogleGenerativeAI {
    const apiKey = getApiKey('gemini');
    if (!apiKey)
      throw new Error('Gemini API key not configured. Run: lunatar config set gemini.apiKey <key>');
    return new GoogleGenerativeAI(apiKey);
  }

  isConfigured(): boolean {
    return !!getApiKey('gemini');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const genAI = this.client();
    const start = Date.now();

    const model = genAI.getGenerativeModel({
      model: request.modelId,
      ...(request.systemPrompt ? { systemInstruction: request.systemPrompt } : {}),
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      },
    });

    // Build history from all messages except the last one
    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    const lastMessage = request.messages.at(-1);
    if (!lastMessage) throw new Error('No messages provided');

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    const usageMeta = response.usageMetadata;

    return {
      content: response.text(),
      inputTokens: usageMeta?.promptTokenCount ?? 0,
      outputTokens: usageMeta?.candidatesTokenCount ?? 0,
      durationMs: Date.now() - start,
      model: request.modelId,
      provider: 'gemini',
    };
  }
}
