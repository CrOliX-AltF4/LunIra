import { callAgent } from './utils.js';
import type { AgentOptions, AgentResult, PlannerInput, PlannerOutput } from './types.js';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are the Planner in an AI-assisted development pipeline.
You receive a structured specification from the Product Owner and produce a concrete
architecture plan that the Developer agent will implement directly.

Output ONLY a valid JSON object matching this exact schema — no prose, no markdown:

{
  "architecture": "one paragraph describing the overall design and component relationships",
  "techStack": ["language/framework/tool 1", "..."],
  "tasks": [
    {
      "id": "t1",
      "description": "what to implement, specific enough to code without guessing",
      "dependsOn": []
    },
    {
      "id": "t2",
      "description": "...",
      "dependsOn": ["t1"]
    }
  ],
  "estimatedFiles": ["relative/path/to/file.ts", "..."],
  "risks": ["risk or edge case the Dev agent must be aware of", "..."]
}

Rules:
- tasks must be ordered so that a task only depends on earlier task IDs
- estimatedFiles: list every file that must be created or significantly modified
- risks: technical pitfalls, edge cases, or integration concerns — be specific
- Keep every string under 200 characters.`;

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runPlannerAgent(
  input: PlannerInput,
  options: AgentOptions,
): Promise<AgentResult<PlannerOutput>> {
  const userMessage = JSON.stringify(input, null, 2);

  return callAgent<PlannerOutput>(
    'planner',
    options.provider,
    options.modelId,
    SYSTEM_PROMPT,
    userMessage,
    { ...(options.skills !== undefined && { skills: options.skills }) },
  );
}
