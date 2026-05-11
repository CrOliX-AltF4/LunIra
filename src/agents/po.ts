import { callAgent } from './utils.js';
import type { AgentOptions, AgentResult, POInput, POOutput } from './types.js';

// ─── System prompt ────────────────────────────────────────────────────────────
// Static per role → always cached by the provider layer.

const SYSTEM_PROMPT = `\
You are the Product Owner in an AI-assisted development pipeline.
Your job is to take a raw user intent and produce a structured, unambiguous specification
that the Planner agent can act on without further clarification.

Output ONLY a valid JSON object matching this exact schema — no prose, no markdown:

{
  "clarifiedGoal": "one sentence summarising what must be built",
  "requirements": ["functional requirement 1", "..."],
  "constraints": ["technical or business constraint 1", "..."],
  "acceptanceCriteria": ["measurable criterion 1", "..."],
  "complexity": "low" | "medium" | "high",
  "assumptions": ["assumption made to resolve an ambiguity", "..."]
}

Rules:
- requirements: what the system MUST do (functional)
- constraints: what the system MUST NOT do or is bounded by (non-functional, tech, legal)
- acceptanceCriteria: verifiable conditions that confirm the goal is met
- complexity: "low" = trivial script; "medium" = single service / feature; "high" = multi-component system
- assumptions: list every ambiguity you resolved so the user can challenge them later
- Keep every string under 120 characters.`;

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runPOAgent(
  input: POInput,
  options: AgentOptions,
): Promise<AgentResult<POOutput>> {
  const userMessage = `User intent: "${input.intent}"`;

  return callAgent<POOutput>('po', options.provider, options.modelId, SYSTEM_PROMPT, userMessage, {
    ...(options.skills !== undefined && { skills: options.skills }),
  });
}
