import { getModelById } from '../models/catalog.js';
import type { AgentRole } from '../types/index.js';
import type { LLMProvider, Message, ToolResultMessage } from '../providers/types.js';
import type { AgentMeta, AgentResult } from './types.js';
import type { Skill } from '../skills/types.js';
import type { Plugin, PluginContext } from '../plugins/types.js';

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Extracts the first JSON object from a raw LLM response.
 * Handles markdown code fences (```json ... ```) and leading/trailing prose.
 */
function extractJson(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object in model response. Got: ${raw.slice(0, 300)}`);
  }

  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (err) {
    throw new Error(`Malformed JSON in model response: ${String(err)}. Got: ${raw.slice(0, 300)}`);
  }
}

// ─── Cost calculation ─────────────────────────────────────────────────────────

function calcCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const spec = getModelById(modelId);
  if (!spec) return 0;
  return inputTokens * spec.costPerInputToken + outputTokens * spec.costPerOutputToken;
}

// ─── Retry helpers ────────────────────────────────────────────────────────────

const MAX_JSON_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_TOOL_TURNS = 5;
const RATE_LIMIT_BASE_MS = 1000;

function isRateLimit(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core runner ──────────────────────────────────────────────────────────────

/**
 * Calls a provider, extracts the JSON output, and wraps the result with cost
 * and token metadata.
 *
 * Retry strategy:
 * - JSON parse failure → multi-turn retry: the bad response is sent back as an
 *   assistant message, followed by a corrective user message. Up to 2 retries.
 * - Rate limit (429) → exponential backoff: 1s, 2s, 4s. Up to 3 retries.
 *
 * Tokens and costs are accumulated across all attempts.
 * The system prompt is always cached (`cacheSystemPrompt: true`) because agent
 * system prompts are static per role — the variable data lives in the user
 * message only.
 */
export async function callAgent<T>(
  role: AgentRole,
  provider: LLMProvider,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  options?: { skills?: Skill[]; plugins?: Plugin[]; pluginContext?: PluginContext },
): Promise<AgentResult<T>> {
  const activeSkills = options?.skills ?? [];
  const activePlugins = options?.plugins ?? [];
  const pluginContext: PluginContext = options?.pluginContext ?? {
    runId: 'unknown',
    outputDir: process.cwd(),
    cwd: process.cwd(),
  };
  const enrichedPrompt =
    activeSkills.length > 0
      ? systemPrompt + '\n\n---\n\n' + activeSkills.map((s) => s.content).join('\n\n')
      : systemPrompt;

  const messages: (Message | ToolResultMessage)[] = [{ role: 'user', content: userMessage }];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalDurationMs = 0;
  let retries = 0;
  const allToolCallNames: string[] = [];

  let jsonAttempts = 0;
  let rateLimitAttempts = 0;
  let toolTurnAttempts = 0;

  for (;;) {
    // ── Rate-limit backoff ──────────────────────────────────────────────────
    let response: Awaited<ReturnType<typeof provider.complete>>;
    try {
      response = await provider.complete({
        modelId,
        systemPrompt: enrichedPrompt,
        cacheSystemPrompt: true,
        messages,
        temperature: 0,
        ...(activePlugins.length > 0 ? { tools: activePlugins.map((p) => p.tool) } : {}),
      });
    } catch (err) {
      if (isRateLimit(err) && rateLimitAttempts < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = RATE_LIMIT_BASE_MS * Math.pow(2, rateLimitAttempts);
        rateLimitAttempts++;
        retries++;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    // Accumulate usage across all attempts
    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;
    totalCacheReadTokens += response.cacheReadTokens ?? 0;
    totalCacheCreationTokens += response.cacheCreationTokens ?? 0;
    totalDurationMs += response.durationMs;

    // ── Tool use ────────────────────────────────────────────────────────────
    if (response.stopReason === 'tool_use' && response.toolCalls && response.toolCalls.length > 0) {
      if (toolTurnAttempts >= MAX_TOOL_TURNS) {
        throw new Error(
          'Tool-use loop exceeded ' + String(MAX_TOOL_TURNS) + ' turns without a final response.',
        );
      }
      toolTurnAttempts++;

      for (const tc of response.toolCalls) {
        allToolCallNames.push(tc.name);
      }

      messages.push({
        role: 'assistant' as const,
        content: response.content || '',
        toolCalls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        const plugin = activePlugins.find((p) => p.tool.name === tc.name);
        let result: string;
        if (plugin) {
          try {
            result = await plugin.handler(tc.input, pluginContext);
          } catch (err) {
            result = `Tool error: ${String(err instanceof Error ? err.message : err)}`;
          }
        } else {
          result = `Unknown tool: ${tc.name}`;
        }
        messages.push({ role: 'tool' as const, toolCallId: tc.id, content: result });
      }
      continue;
    }

    // ── JSON extraction with corrective retry ───────────────────────────────
    try {
      const parsed = extractJson(response.content) as T;

      const meta: AgentMeta = {
        role,
        modelId,
        provider: provider.name,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cacheReadTokens: totalCacheReadTokens,
        cacheCreationTokens: totalCacheCreationTokens,
        costUsd: calcCostUsd(modelId, totalInputTokens, totalOutputTokens),
        durationMs: totalDurationMs,
        retries,
        ...(allToolCallNames.length > 0 ? { toolCalls: allToolCallNames } : {}),
      };

      return { output: parsed, meta };
    } catch (jsonErr) {
      if (jsonAttempts >= MAX_JSON_RETRIES) {
        throw jsonErr;
      }
      // Add the bad response + corrective prompt for next attempt
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content:
          'Your previous response was not valid JSON. ' +
          'Respond ONLY with a valid JSON object — no prose, no markdown fences, no explanation.',
      });
      jsonAttempts++;
      retries++;
    }
  }
}
