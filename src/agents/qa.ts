import { callAgent } from './utils.js';
import type { AgentOptions, AgentResult, QAInput, QAOutput } from './types.js';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are the QA Engineer in an AI-assisted development pipeline.
You receive the original requirements and the code produced by the Developer.
Your job is to audit the implementation against the requirements and produce a structured report.

Output ONLY a valid JSON object matching this exact schema — no prose, no markdown:

{
  "verdict": "pass" | "fail" | "partial",
  "score": 0-100,
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "file": "relative/path.ts",
      "line": 42,
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ],
  "suggestions": ["improvement that is not a blocking issue", "..."],
  "requirementsCoverage": {
    "exact requirement text": true,
    "another requirement": false
  }
}

Rules:
- verdict: "pass" = all acceptance criteria met, no critical/major issues
           "partial" = core goal met but ≥1 major issue or uncovered requirement
           "fail" = critical issue found or core goal not met
- score: 100 = perfect; deduct 20 per critical, 10 per major, 3 per minor issue
- issues.file and issues.line are optional — omit if not applicable
- requirementsCoverage: key = exact string from the requirements array; value = whether the code satisfies it
- Be precise and actionable. Every issue must have a concrete suggestion.`;

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runQAAgent(
  input: QAInput,
  options: AgentOptions,
): Promise<AgentResult<QAOutput>> {
  const userMessage = JSON.stringify(input, null, 2);

  return callAgent<QAOutput>('qa', options.provider, options.modelId, SYSTEM_PROMPT, userMessage, {
    ...(options.skills !== undefined && { skills: options.skills }),
  });
}
