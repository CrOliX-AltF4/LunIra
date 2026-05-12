# Provider Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a provider fails (rate limit, network error, misconfiguration), the pipeline automatically retries the step with the next configured fallback provider instead of failing the entire run.

**Architecture:** `lunatar.config.json` gains a `providers.fallback: string[]` field listing provider names in priority order. In `runner.ts`, each step's provider call is wrapped in a retry loop that iterates the fallback list on retriable errors. One retry maximum — the step fails after exhausting all fallbacks. Error classification (retriable vs. fatal) lives in a dedicated `src/pipeline/errors.ts` module.

**Tech Stack:** TypeScript strict, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/config/types.ts` | Add `providers.fallback: string[]` |
| Modify | `src/config/project.ts` | Parse and default `providers.fallback` |
| Create | `src/pipeline/errors.ts` | `isRetriableError(err)` classifier |
| Modify | `src/pipeline/runner.ts` | Retry loop with fallback provider |
| Create | `tests/pipeline/errors.test.ts` | Unit tests for error classifier |
| Modify | `tests/pipeline/runner.test.ts` | Assert fallback triggers on rate limit |

---

## Task 1 — Add `providers.fallback` to config

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/config/project.ts`

- [ ] **Step 1: Write the failing test**

In `tests/config/types.test.ts` (already created in extensibility plan, or create fresh), add:

```typescript
import { loadProjectConfig } from '../../src/config/project.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('project config — providers.fallback', () => {
  it('parses fallback provider list', async () => {
    const dir = join(tmpdir(), `lunatar-fb-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunatar.config.json'),
      JSON.stringify({
        skills: { all: [] },
        plugins: { all: [] },
        providers: { fallback: ['groq', 'openai'] },
      }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.providers?.fallback).toEqual(['groq', 'openai']);
    await rm(dir, { recursive: true });
  });

  it('defaults providers to empty when absent', async () => {
    const dir = join(tmpdir(), `lunatar-fb-test2-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunatar.config.json'),
      JSON.stringify({ skills: { all: [] }, plugins: { all: [] } }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.providers?.fallback ?? []).toEqual([]);
    await rm(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/config/types.test.ts
```

Expected: FAIL — `providers` field not on config type

- [ ] **Step 3: Add `providers` to config types**

Read `src/config/types.ts`, then add:

```typescript
export interface ProvidersConfig {
  fallback?: string[];
}

export interface ProjectConfig {
  // ... existing fields ...
  providers?: ProvidersConfig;
}
```

Read `src/config/project.ts`, then ensure `providers` is parsed and defaulted in the config loading logic:

```typescript
providers: {
  fallback: parsed.providers?.fallback ?? [],
},
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/config/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Update `lunatar.config.json` scaffold template**

In `src/init/templates/core.ts`, update `lunatarConfig()` to include the `providers` section:

```typescript
export function lunatarConfig(): string {
  return JSON.stringify(
    {
      skills: { ... },    // unchanged
      plugins: { ... },   // unchanged
      providers: {
        fallback: [],     // e.g. ["groq", "openai", "claude"]
      },
    },
    null,
    2,
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/config/types.ts src/config/project.ts src/init/templates/core.ts tests/config/types.test.ts
git commit -m "feat(config): add providers.fallback list to project config"
```

---

## Task 2 — Error classifier

**Files:**
- Create: `src/pipeline/errors.ts`
- Create: `tests/pipeline/errors.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/pipeline/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isRetriableError } from '../../src/pipeline/errors.js';

describe('isRetriableError', () => {
  it('returns true for rate limit errors (HTTP 429)', () => {
    const err = new Error('rate limit exceeded');
    expect(isRetriableError(err)).toBe(true);
  });

  it('returns true for network timeout errors', () => {
    const err = new Error('network timeout');
    expect(isRetriableError(err)).toBe(true);
  });

  it('returns true for connection refused', () => {
    const err = new Error('ECONNREFUSED');
    expect(isRetriableError(err)).toBe(true);
  });

  it('returns false for auth errors (HTTP 401)', () => {
    const err = new Error('401 unauthorized');
    expect(isRetriableError(err)).toBe(false);
  });

  it('returns false for invalid request errors (HTTP 400)', () => {
    const err = new Error('400 bad request');
    expect(isRetriableError(err)).toBe(false);
  });

  it('returns false for unknown errors', () => {
    const err = new Error('something unexpected happened');
    expect(isRetriableError(err)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/pipeline/errors.test.ts
```

Expected: FAIL — errors.ts not found

- [ ] **Step 3: Create `src/pipeline/errors.ts`**

```typescript
const RETRIABLE_PATTERNS = [
  /rate.?limit/i,
  /429/,
  /timeout/i,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  /ENOTFOUND/,
  /service.?unavailable/i,
  /503/,
  /overloaded/i,
];

export function isRetriableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return RETRIABLE_PATTERNS.some((pattern) => pattern.test(message));
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/pipeline/errors.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/errors.ts tests/pipeline/errors.test.ts
git commit -m "feat(pipeline): add retriable error classifier for provider fallback"
```

---

## Task 3 — Retry loop in runner

**Files:**
- Modify: `src/pipeline/runner.ts`

- [ ] **Step 1: Write the failing test**

In `tests/pipeline/runner.test.ts`, add:

```typescript
describe('runPipeline — provider fallback', () => {
  it('retries with fallback provider on rate limit error', async () => {
    let callCount = 0;
    const failingProvider = {
      isConfigured: () => true,
      chat: vi.fn().mockRejectedValue(new Error('429 rate limit exceeded')),
    };
    const workingProvider = {
      isConfigured: () => true,
      chat: vi.fn().mockResolvedValue({
        content: JSON.stringify({ clarifiedGoal: 'ok', requirements: [], constraints: [], acceptanceCriteria: [], complexity: 'low', assumptions: [] }),
        meta: { inputTokens: 100, outputTokens: 50, costUsd: 0.001, durationMs: 200, toolCalls: [] },
      }),
    };

    vi.mocked(getProvider)
      .mockImplementationOnce(() => failingProvider)
      .mockImplementationOnce(() => workingProvider);

    vi.mocked(loadProjectConfig).mockResolvedValue({
      skills: { all: [], external: [] },
      plugins: { all: [], external: [] },
      providers: { fallback: ['groq', 'openai'] },
    });

    const steps: PipelineStep[] = [
      { role: 'po', status: 'pending', provider: 'groq', modelId: 'llama' },
    ];
    const result = await runPipeline('test', steps);
    expect(result.status).toBe('completed');
    expect(workingProvider.chat).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/pipeline/runner.test.ts
```

Expected: FAIL — no fallback logic, step fails immediately

- [ ] **Step 3: Add retry loop to runner**

Read `src/pipeline/runner.ts`. Locate the `try { switch(step.role) { ... } } catch (err)` block.

Replace the existing try/catch with a fallback-aware wrapper:

```typescript
import { isRetriableError } from './errors.js';

// Inside the for loop, replace the try/catch:
const fallbackChain = [step.provider ?? 'groq', ...(projectConfig.providers?.fallback ?? [])];
// Remove duplicates while preserving order
const providerChain = [...new Set(fallbackChain)];

let lastError: unknown;
let succeeded = false;

for (const providerName of providerChain) {
  const provider = getProvider(providerName);
  if (!provider.isConfigured()) continue;

  patch(i, { status: 'running' });

  try {
    switch (step.role) {
      case 'po': {
        const poSkills = getActiveSkills('po');
        const poPlugins = getActivePlugins('po');
        const { output, meta } = await runPOAgent(
          { intent },
          { provider, modelId: step.modelId ?? '', ...(poSkills.length > 0 ? { skills: poSkills } : {}), ...(poPlugins.length > 0 ? { plugins: poPlugins } : {}) },
        );
        ctx.po = output;
        patch(i, applyMeta('completed', output, meta));
        break;
      }
      case 'planner': {
        if (!ctx.po) throw new Error('PO output is missing — cannot run Planner.');
        const plannerSkills = getActiveSkills('planner');
        const plannerPlugins = getActivePlugins('planner');
        const { output, meta } = await runPlannerAgent(buildPlannerInput(ctx.po), {
          provider, modelId: step.modelId ?? '',
          ...(plannerSkills.length > 0 ? { skills: plannerSkills } : {}),
          ...(plannerPlugins.length > 0 ? { plugins: plannerPlugins } : {}),
        });
        ctx.planner = output;
        patch(i, applyMeta('completed', output, meta));
        break;
      }
      case 'dev': {
        if (!ctx.po) throw new Error('PO output is missing — cannot run Dev.');
        if (!ctx.planner) throw new Error('Planner output is missing — cannot run Dev.');
        const devSkills = getActiveSkills('dev');
        const devPlugins = getActivePlugins('dev');
        const { output, meta } = await runDevAgent(buildDevInput(ctx.po, ctx.planner), {
          provider, modelId: step.modelId ?? '',
          ...(devSkills.length > 0 ? { skills: devSkills } : {}),
          ...(devPlugins.length > 0 ? { plugins: devPlugins } : {}),
        });
        ctx.dev = output;
        patch(i, applyMeta('completed', output, meta));
        break;
      }
      case 'qa': {
        if (!ctx.po) throw new Error('PO output is missing — cannot run QA.');
        if (!ctx.dev) throw new Error('Dev output is missing — cannot run QA.');
        const qaSkills = getActiveSkills('qa');
        const qaPlugins = getActivePlugins('qa');
        const { output, meta } = await runQAAgent(buildQAInput(ctx.po, ctx.dev), {
          provider, modelId: step.modelId ?? '',
          ...(qaSkills.length > 0 ? { skills: qaSkills } : {}),
          ...(qaPlugins.length > 0 ? { plugins: qaPlugins } : {}),
        });
        ctx.qa = output;
        patch(i, applyMeta('completed', output, meta));
        break;
      }
    }
    succeeded = true;
    break; // exit fallback chain on success
  } catch (err) {
    lastError = err;
    if (!isRetriableError(err)) break; // non-retriable: stop immediately
    // retriable: try next provider in chain
  }
}

if (!succeeded) {
  patch(i, { status: 'failed', error: String(lastError) });
  skipRemaining(run, i + 1, patch);
  run.status = 'failed';
  break;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/runner.ts tests/pipeline/runner.test.ts
git commit -m "feat(pipeline): retry step with fallback provider on retriable errors"
```

---

## Task 4 — Full check + PR

- [ ] **Step 1: Full test suite**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass

- [ ] **Step 2: Manual smoke test**

Add to `lunatar.config.json` in a test project:

```json
{
  "providers": { "fallback": ["groq", "openai"] }
}
```

Temporarily break the primary provider (invalid API key) and verify Lunatar falls back to the next one.

- [ ] **Step 3: Open PR**

```bash
git push -u origin feat/provider-fallback
gh pr create --title "feat(pipeline): automatic provider fallback on retriable errors" \
  --body "Adds providers.fallback config, isRetriableError classifier, and retry loop in runner. Steps try each provider in order on rate limit/network errors. Non-retriable errors (401, 400) fail immediately."
```
