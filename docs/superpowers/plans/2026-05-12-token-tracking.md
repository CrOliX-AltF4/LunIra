# Token Tracking per Skill/Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose per-skill and per-plugin token attribution in each `PipelineStep`, so users know exactly what each component costs in a run.

**Architecture:** `PipelineStep` gains two new optional fields: `skillsTokens` (sum of `tokenEstimate` for active skills) and `pluginsCalls` (count of tool_use invocations per plugin id). The runner populates these before and after each agent call. The TUI results screen renders a cost breakdown line per step. No additional LLM calls required — skill token estimates already exist on `Skill.tokenEstimate`; plugin call counts come from the provider response.

**Tech Stack:** TypeScript strict, Ink (TUI), Vitest

**Prerequisite:** This plan can run independently of the extensibility plan, but if both are implemented, the tracking will automatically cover external plugins/skills too.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `skillsTokens`, `pluginsCalls` to `PipelineStep` |
| Modify | `src/pipeline/runner.ts` | Compute and record tracking fields per step |
| Modify | `src/providers/types.ts` | Expose tool call count from provider response meta |
| Modify | `src/ui/` (results screen) | Render skill/plugin breakdown in TUI |
| Modify | `tests/pipeline/runner.test.ts` | Assert tracking fields populated |

---

## Task 1 — Extend `PipelineStep` with tracking fields

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/types/pipeline-step.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { PipelineStep } from '../../src/types/index.js';

describe('PipelineStep type', () => {
  it('has optional skillsTokens field', () => {
    expectTypeOf<PipelineStep>().toHaveProperty('skillsTokens');
  });

  it('has optional pluginsCalls field', () => {
    expectTypeOf<PipelineStep>().toHaveProperty('pluginsCalls');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/types/pipeline-step.test.ts
```

Expected: FAIL — properties do not exist on type

- [ ] **Step 3: Add fields to `PipelineStep`**

Read `src/types/index.ts`, then add to the `PipelineStep` interface:

```typescript
export interface PipelineStep {
  // ... existing fields ...
  skillsTokens?: number;                        // estimated tokens from injected skills
  pluginsCalls?: Record<string, number>;        // pluginId → call count
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/types/pipeline-step.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts tests/types/pipeline-step.test.ts
git commit -m "feat(types): add skillsTokens and pluginsCalls to PipelineStep"
```

---

## Task 2 — Populate tracking in the pipeline runner

**Files:**
- Modify: `src/pipeline/runner.ts`

- [ ] **Step 1: Understand the current `applyMeta` helper**

Read `src/pipeline/runner.ts` lines 242–254. The function signature is:

```typescript
function applyMeta(
  status: 'completed',
  output: unknown,
  meta: { inputTokens: number; outputTokens: number; costUsd: number; durationMs: number },
): Partial<PipelineStep>
```

We will extend `meta` to carry tracking data.

- [ ] **Step 2: Write the failing test**

In `tests/pipeline/runner.test.ts` (create if absent), add:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../../src/pipeline/runner.js';
import type { PipelineStep } from '../../src/types/index.js';

// Minimal mock provider that returns a fixed response
const mockProvider = {
  isConfigured: () => true,
  chat: vi.fn().mockResolvedValue({
    content: JSON.stringify({ clarifiedGoal: 'test', requirements: [], constraints: [], acceptanceCriteria: [], complexity: 'low', assumptions: [] }),
    meta: { inputTokens: 100, outputTokens: 50, costUsd: 0.001, durationMs: 200, toolCalls: [] },
  }),
};

vi.mock('../../src/providers/registry.js', () => ({
  getProvider: () => mockProvider,
}));

vi.mock('../../src/config/project.js', () => ({
  loadProjectConfig: async () => ({
    skills: { all: ['typescript-strict'], external: [] },
    plugins: { all: [], external: [] },
  }),
}));

describe('runPipeline — token tracking', () => {
  it('populates skillsTokens on a completed step', async () => {
    const steps: PipelineStep[] = [
      { role: 'po', status: 'pending', provider: 'mock', modelId: 'mock' },
    ];
    const result = await runPipeline('build a thing', steps);
    const poStep = result.steps.find((s) => s.role === 'po');
    expect(poStep?.skillsTokens).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/pipeline/runner.test.ts
```

Expected: FAIL — `skillsTokens` is undefined

- [ ] **Step 4: Populate `skillsTokens` in runner**

In `src/pipeline/runner.ts`, after computing `getActiveSkills(role)` for each step, sum the token estimates. Locate each `case 'po':`, `case 'planner':`, `case 'dev':`, `case 'qa':` block. Add before the agent call:

```typescript
// Inside case 'po':
const poSkills = getActiveSkills('po');
const poPlugins = getActivePlugins('po');
const poSkillsTokens = poSkills.reduce((sum, s) => sum + s.tokenEstimate, 0);

const { output, meta } = await runPOAgent(...);
ctx.po = output;
patch(i, { ...applyMeta('completed', output, meta), skillsTokens: poSkillsTokens });
```

Apply the same pattern to `planner`, `dev`, `qa` cases, using `plannerSkills`, `devSkills`, `qaSkills` respectively.

- [ ] **Step 5: Populate `pluginsCalls` from provider response**

Read `src/providers/types.ts` to understand the provider `chat` return type. If `meta.toolCalls` is not already tracked, add it:

In `src/providers/types.ts`, add to the meta return type:

```typescript
export interface ProviderMeta {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls?: string[];   // list of tool names called (may contain duplicates)
}
```

In each provider implementation (e.g., `src/providers/groq.ts`, `claude.ts`, etc.), populate `toolCalls` from the response's tool_use blocks. For example in `claude.ts`:

```typescript
const toolCalls = response.content
  .filter((b): b is { type: 'tool_use'; name: string } => b.type === 'tool_use')
  .map((b) => b.name);
meta.toolCalls = toolCalls;
```

Back in `runner.ts`, after the agent call, compute the calls map:

```typescript
const pluginsCallsMap: Record<string, number> = {};
for (const toolName of meta.toolCalls ?? []) {
  pluginsCallsMap[toolName] = (pluginsCallsMap[toolName] ?? 0) + 1;
}
patch(i, { ...applyMeta('completed', output, meta), skillsTokens: poSkillsTokens, pluginsCalls: pluginsCallsMap });
```

- [ ] **Step 6: Run tests**

```bash
npm run typecheck && npm test
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/pipeline/runner.ts src/providers/types.ts tests/pipeline/runner.test.ts
git commit -m "feat(pipeline): track skillsTokens and pluginsCalls per pipeline step"
```

---

## Task 3 — Display tracking in TUI results

**Files:**
- Modify: relevant file in `src/ui/` that renders the results/step details screen

- [ ] **Step 1: Find the results renderer**

```bash
grep -r "tokensUsed\|costUsd" src/ui/ --include="*.ts" --include="*.tsx" -l
```

Note the file path. Read that file.

- [ ] **Step 2: Write the failing test**

This is a render test — check the text output contains the breakdown. Create `tests/ui/results.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatStepBreakdown } from '../../src/ui/formatters.js';
import type { PipelineStep } from '../../src/types/index.js';

describe('formatStepBreakdown', () => {
  it('includes skill token count when present', () => {
    const step: PipelineStep = {
      role: 'dev',
      status: 'completed',
      tokensUsed: 500,
      skillsTokens: 120,
      pluginsCalls: { file_write: 2 },
    };
    const output = formatStepBreakdown(step);
    expect(output).toContain('120');
    expect(output).toContain('file_write');
  });

  it('omits breakdown when skillsTokens is absent', () => {
    const step: PipelineStep = { role: 'po', status: 'completed', tokensUsed: 200 };
    const output = formatStepBreakdown(step);
    expect(output).not.toContain('skills:');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/ui/results.test.ts
```

Expected: FAIL — `formatStepBreakdown` not found

- [ ] **Step 4: Create `src/ui/formatters.ts`**

```typescript
import type { PipelineStep } from '../types/index.js';

export function formatStepBreakdown(step: PipelineStep): string {
  const parts: string[] = [];

  if (step.skillsTokens !== undefined) {
    parts.push(`skills: ~${step.skillsTokens} tokens`);
  }

  if (step.pluginsCalls && Object.keys(step.pluginsCalls).length > 0) {
    const callSummary = Object.entries(step.pluginsCalls)
      .map(([name, count]) => `${name}×${count}`)
      .join(', ');
    parts.push(`plugins: ${callSummary}`);
  }

  return parts.length > 0 ? `  ↳ ${parts.join(' | ')}` : '';
}
```

- [ ] **Step 5: Integrate into the UI results component**

Read the results component file identified in Step 1. After the existing `tokensUsed` display line, add a call to `formatStepBreakdown(step)` and render it if non-empty.

Example (adapt to actual JSX/Ink structure):

```tsx
import { formatStepBreakdown } from '../formatters.js';

// After the existing tokens line:
const breakdown = formatStepBreakdown(step);
{breakdown && <Text dimColor>{breakdown}</Text>}
```

- [ ] **Step 6: Run tests**

```bash
npm run typecheck && npm test
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/ui/formatters.ts src/ui/<results-file> tests/ui/results.test.ts
git commit -m "feat(ui): display per-step skill token and plugin call breakdown in results"
```

---

## Task 4 — Full check + PR

- [ ] **Step 1: Full test suite**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass

- [ ] **Step 2: Open PR**

```bash
git push -u origin feat/token-tracking
gh pr create --title "feat: per-step skill token and plugin call tracking" \
  --body "PipelineStep gains skillsTokens and pluginsCalls fields. Runner populates them from active skills tokenEstimate and provider tool_use response. TUI results shows breakdown per step."
```
