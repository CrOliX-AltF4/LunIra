import { callAgent } from './utils.js';
import type { AgentOptions, AgentResult, DevInput, DevOutput } from './types.js';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are the Developer in an AI-assisted development pipeline.
You receive an architecture plan from the Planner and produce working, production-ready code.

Output ONLY a valid JSON object matching this exact schema — no prose, no markdown:

{
  "files": [
    {
      "path": "relative/path/from/project/root.ts",
      "content": "full file content as a string",
      "description": "one-line description of this file's purpose"
    }
  ],
  "entryPoints": ["path/to/main.ts", "..."],
  "implementationNotes": ["non-obvious decision or caveat for the QA agent", "..."]
}

Rules:
- files: include EVERY file needed to run the feature — no placeholders, no TODOs
- content: complete, runnable code. Use \\n for newlines inside the JSON string
- entryPoints: the files/functions the QA agent should test or invoke first
- implementationNotes: decisions that are not obvious from the code (why X over Y, known limitations)
- Respect the tech stack and architecture from the plan exactly.`;

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runDevAgent(
  input: DevInput,
  options: AgentOptions,
): Promise<AgentResult<DevOutput>> {
  const userMessage = JSON.stringify(input, null, 2);

  return callAgent<DevOutput>(
    'dev',
    options.provider,
    options.modelId,
    SYSTEM_PROMPT,
    userMessage,
    {
      ...(options.skills !== undefined && { skills: options.skills }),
    },
  );
}
