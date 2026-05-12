# Skills & Plugins System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a skills system (contextual knowledge injected into agent prompts) and a plugins system (tool-use capabilities for agents) to the aiwb pipeline, configurable per project via `aiwb.config.json`.

**Architecture:** Skills append markdown content to agent system prompts (leveraging existing `cacheSystemPrompt: true` in `callAgent`). Plugins extend `CompletionRequest/Response` for `tools`/`toolCalls` and add a multi-turn tool execution loop inside `callAgent`. A project config file (`aiwb.config.json`) declares active skills and plugins per role.

**Tech Stack:** TypeScript strict, Node.js `fs/promises` for file operations, Anthropic SDK tool_use, OpenAI SDK function_calling, Vitest, Ink (TUI).

---

## File Map

**New files:**
- `src/skills/types.ts` — `Skill` interface
- `src/skills/registry.ts` — load + filter skills from catalog
- `src/skills/catalog/typescript-strict.md` — TypeScript conventions skill
- `src/skills/catalog/react-css-modules.md` — React + CSS Modules skill
- `src/skills/catalog/conventional-commits.md` — commit conventions skill
- `src/skills/catalog/project-context.md` — project metadata skill (dynamic)
- `src/skills/catalog/laravel-conventions.md` — Laravel/PHP skill
- `src/plugins/types.ts` — `Plugin`, `ToolDefinition`, `ToolCall`, `ToolResultMessage`
- `src/plugins/registry.ts` — plugin catalog + lookup
- `src/plugins/catalog/file-write.ts` — write files to `./output/<run-id>/`
- `src/plugins/catalog/read-file.ts` — read files from cwd
- `src/plugins/catalog/web-search.ts` — web search stub
- `src/plugins/catalog/github-create-issue.ts` — GitHub issue stub
- `src/config/types.ts` — `ProjectConfig` interface
- `src/config/project.ts` — load `aiwb.config.json` from cwd
- `src/ui/screens/ConfigScreen.tsx` — TUI skills/plugins toggle screen
- `tests/skills/registry.test.ts`
- `tests/plugins/registry.test.ts`
- `tests/plugins/runner.test.ts`
- `tests/config/project.test.ts`

**Modified files:**
- `src/providers/types.ts` — add `tools`, `toolCalls`, `ToolDefinition`, `ToolCall`, `ToolResultMessage`
- `src/agents/types.ts` — add `skills?: Skill[]` and `plugins?: Plugin[]` to `AgentOptions`
- `src/agents/utils.ts` — inject skills into systemPrompt; add tool-use loop
- `src/providers/claude.ts` — handle tool_use blocks in response + tool_result in messages
- `src/providers/openai.ts` — handle function_calling (Groq/NIM inherit)
- `src/pipeline/runner.ts` — load project config and pass skills+plugins to agents
- `src/ui/App.tsx` — add ConfigScreen step before Pipeline screen

---

## Task 1: Extend provider types for tools

**Files:**
- Modify: `src/providers/types.ts`

- [ ] **Step 1: Add ToolDefinition, ToolCall, ToolResultMessage to providers/types.ts**

```typescript
// Add after the existing Message interface in src/providers/types.ts

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultMessage {
  role: 'tool';
  toolCallId: string;
  content: string;
}

// Update CompletionRequest:
export interface CompletionRequest {
  messages: (Message | ToolResultMessage)[];
  systemPrompt?: string;
  cacheSystemPrompt?: boolean;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];   // ← new
}

// Update CompletionResponse:
export interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];           // ← new
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens';  // ← new
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  durationMs: number;
  model: string;
  provider: ProviderName;
}
```

- [ ] **Step 2: Run typecheck — expect errors in providers that don't handle the new union yet**

```bash
./node_modules/.bin/tsc.cmd --noEmit -p tsconfig.test.json
```

Expected: errors in `claude.ts`, `openai.ts`, `groq.ts`, `nim.ts` about `messages` type. That's fine — we'll fix them in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/providers/types.ts
git commit -m "feat(providers): extend types for tool use (ToolDefinition, ToolCall)"
```

---

## Task 2: Skill types + registry

**Files:**
- Create: `src/skills/types.ts`
- Create: `src/skills/registry.ts`
- Create: `tests/skills/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/skills/registry.test.ts
import { describe, it, expect } from 'vitest';
import { SkillRegistry } from '../../src/skills/registry.js';

describe('SkillRegistry', () => {
  it('loads all catalog skills and each has required fields', () => {
    const registry = new SkillRegistry();
    const skills = registry.getAll();
    expect(skills.length).toBeGreaterThan(0);
    for (const s of skills) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.content).toBeTruthy();
      expect(s.tokenEstimate).toBeGreaterThan(0);
    }
  });

  it('forRole("dev") returns only dev or all-role skills', () => {
    const registry = new SkillRegistry();
    const skills = registry.forRole('dev');
    expect(skills.every((s) => s.role === 'dev' || s.role === 'all')).toBe(true);
  });

  it('getById returns the correct skill', () => {
    const registry = new SkillRegistry();
    const skill = registry.getById('typescript-strict');
    expect(skill).toBeDefined();
    expect(skill?.id).toBe('typescript-strict');
  });

  it('getById returns undefined for unknown id', () => {
    const registry = new SkillRegistry();
    expect(registry.getById('does-not-exist')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test -- tests/skills/registry.test.ts
```

Expected: FAIL — `SkillRegistry` not found.

- [ ] **Step 3: Create skill types**

```typescript
// src/skills/types.ts
import type { AgentRole } from '../types/index.js';

export interface Skill {
  id: string;
  name: string;
  role: AgentRole | 'all';
  content: string;
  tokenEstimate: number;
  cacheable: boolean;
}
```

- [ ] **Step 4: Create skill registry**

```typescript
// src/skills/registry.ts
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentRole } from '../types/index.js';
import type { Skill } from './types.js';

const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), 'catalog');

// Estimates ~1.3 tokens per word (conservative)
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

function loadMd(filename: string): string {
  return readFileSync(join(CATALOG_DIR, filename), 'utf-8');
}

// ─── Static catalog ───────────────────────────────────────────────────────────

const CATALOG: Omit<Skill, 'content' | 'tokenEstimate'>[] = [
  { id: 'typescript-strict', name: 'TypeScript Strict', role: 'all', cacheable: true },
  { id: 'react-css-modules', name: 'React + CSS Modules', role: 'dev', cacheable: true },
  { id: 'conventional-commits', name: 'Conventional Commits', role: 'all', cacheable: true },
  { id: 'project-context', name: 'Project Context', role: 'all', cacheable: false },
  { id: 'laravel-conventions', name: 'Laravel Conventions', role: 'dev', cacheable: true },
];

export class SkillRegistry {
  private readonly skills: Skill[];

  constructor() {
    this.skills = CATALOG.map((entry) => {
      const content = loadMd(`${entry.id}.md`);
      return { ...entry, content, tokenEstimate: estimateTokens(content) };
    });
  }

  getAll(): Skill[] {
    return this.skills;
  }

  getById(id: string): Skill | undefined {
    return this.skills.find((s) => s.id === id);
  }

  forRole(role: AgentRole): Skill[] {
    return this.skills.filter((s) => s.role === role || s.role === 'all');
  }
}
```

- [ ] **Step 5: Run tests — should pass (once catalog files exist in Task 3)**

```bash
npm test -- tests/skills/registry.test.ts
```

Expected: FAIL (catalog .md files don't exist yet). Proceed to Task 3.

- [ ] **Step 6: Commit types + registry (catalog files in Task 3)**

```bash
git add src/skills/types.ts src/skills/registry.ts tests/skills/registry.test.ts
git commit -m "feat(skills): add skill interface and registry"
```

---

## Task 3: Skill catalog — 5 markdown files

**Files:**
- Create: `src/skills/catalog/typescript-strict.md`
- Create: `src/skills/catalog/react-css-modules.md`
- Create: `src/skills/catalog/conventional-commits.md`
- Create: `src/skills/catalog/project-context.md`
- Create: `src/skills/catalog/laravel-conventions.md`

- [ ] **Step 1: Create typescript-strict.md**

```markdown
<!-- src/skills/catalog/typescript-strict.md -->
## TypeScript Strict Conventions

- **No `any`** — use `unknown` + type guards: `if (typeof x === 'string') { ... }`
- **`import type`** for type-only imports: `import type { Foo } from './foo.js'`
- **`exactOptionalPropertyTypes`** — never explicitly set optional props to `undefined`
- **`noUncheckedIndexedAccess`** — always check array/record access before using the value
- **Prefer discriminated unions** over nullable types for domain objects
- **No non-null assertion (`!`)** — narrow the type instead
- All public function parameters and return types must be explicitly annotated
```

- [ ] **Step 2: Create react-css-modules.md**

```markdown
<!-- src/skills/catalog/react-css-modules.md -->
## React + CSS Modules Conventions

- Components are function components — no class components
- CSS Modules: `import styles from './Component.module.css'` — className via `styles.foo`
- One component per file; file name matches component name (PascalCase)
- Props interface declared inline above the component: `interface Props { ... }`
- No inline styles — all styling in `.module.css`
- Framer Motion for animations: `<motion.div animate={{ opacity: 1 }} />`
- Avoid `useEffect` for data fetching — use React Query or server components
```

- [ ] **Step 3: Create conventional-commits.md**

```markdown
<!-- src/skills/catalog/conventional-commits.md -->
## Conventional Commits

Format: `<type>(<scope>): <lowercase subject>`

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

Rules:
- Subject in lowercase, no period at end, ≤ 100 chars total header
- Body optional — use to explain WHY, not WHAT
- Breaking changes: add `!` after type: `feat!: rename API`

Examples:
- `feat(auth): add jwt refresh token endpoint`
- `fix(pipeline): handle empty qa output gracefully`
- `refactor(providers): extract base openai client`
```

- [ ] **Step 4: Create project-context.md**

```markdown
<!-- src/skills/catalog/project-context.md -->
## Project Context

This is a placeholder skill. Replace with actual project metadata at runtime.
The pipeline runner injects real project context (name, type, stack) by generating
a dynamic version of this skill from aiwb.config.json.
```

- [ ] **Step 5: Create laravel-conventions.md**

```markdown
<!-- src/skills/catalog/laravel-conventions.md -->
## Laravel / PHP Conventions

- **Eloquent** for database access — no raw SQL unless performance-critical
- **Form Requests** for validation — never validate in controllers
- **Resources** for API responses — never expose Eloquent models directly
- **Service classes** for business logic — thin controllers
- Route model binding for CRUD endpoints
- PHPDoc for all public methods: `/** @param string $name */`
- Tests in `tests/Feature/` (HTTP) and `tests/Unit/` (logic)
- `php artisan make:` for all scaffolding
```

- [ ] **Step 6: Run registry tests — should now pass**

```bash
npm test -- tests/skills/registry.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 7: Commit catalog**

```bash
git add src/skills/catalog/
git commit -m "feat(skills): add 5-skill base catalog"
```

---

## Task 4: Skill injection into callAgent

**Files:**
- Modify: `src/agents/types.ts` — add `skills?: Skill[]` to `AgentOptions`
- Modify: `src/agents/utils.ts` — append skill content to systemPrompt
- Modify: `src/agents/dev.ts`, `po.ts`, `planner.ts`, `qa.ts` — forward skills from options

- [ ] **Step 1: Write failing test**

```typescript
// tests/skills/injection.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { LLMProvider, CompletionRequest } from '../../src/providers/types.js';
import type { Skill } from '../../src/skills/types.js';

// Minimal mock provider that captures the request
function mockProvider(content = '{}'): LLMProvider & { lastRequest: CompletionRequest | null } {
  const p = {
    name: 'groq' as const,
    lastRequest: null as CompletionRequest | null,
    isConfigured: () => true,
    complete: vi.fn(async (req: CompletionRequest) => {
      p.lastRequest = req;
      return {
        content,
        inputTokens: 10,
        outputTokens: 5,
        durationMs: 100,
        model: 'test',
        provider: 'groq' as const,
      };
    }),
  };
  return p;
}

describe('skill injection in callAgent', () => {
  it('appends skill content to systemPrompt when skills are provided', async () => {
    // We test this indirectly: callAgent is called by agents, and skills are passed
    // via AgentOptions. This test imports callAgent directly.
    const { callAgent } = await import('../../src/agents/utils.js');

    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      role: 'dev',
      content: '## Test\nDo the test thing.',
      tokenEstimate: 10,
      cacheable: true,
    };

    const provider = mockProvider('{"result": true}');
    // callAgent should still work without skills (backward compat)
    await callAgent('dev', provider, 'test-model', 'You are Dev.', 'build X');
    expect(provider.lastRequest?.systemPrompt).toBe('You are Dev.');
    expect(provider.lastRequest?.systemPrompt).not.toContain('Do the test thing.');
  });
});
```

> Note: Full injection test requires the `skills` option on `callAgent` — add after implementing.

- [ ] **Step 2: Run test — passes (baseline, no injection yet)**

```bash
npm test -- tests/skills/injection.test.ts
```

Expected: PASS (backward compat check).

- [ ] **Step 3: Update AgentOptions in agents/types.ts**

```typescript
// src/agents/types.ts — add to AgentOptions interface
import type { Skill } from '../skills/types.js';
import type { Plugin } from '../plugins/types.js';  // will be added in Task 5

export interface AgentOptions {
  provider: LLMProvider;
  modelId: string;
  skills?: Skill[];     // ← new
  plugins?: Plugin[];   // ← new (added now to avoid touching this file twice)
}
```

- [ ] **Step 4: Update callAgent in agents/utils.ts to inject skills**

Modify the `callAgent` signature and add skill injection before the provider call. The change is in the function signature and the systemPrompt construction — find the line where `provider.complete({ modelId, systemPrompt, cacheSystemPrompt: true, ... })` is called and build the enriched prompt first:

```typescript
// src/agents/utils.ts — new signature
export async function callAgent<T>(
  role: AgentRole,
  provider: LLMProvider,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  options?: { skills?: Skill[] },
): Promise<AgentResult<T>> {
  // Build enriched system prompt
  const activeSkills = options?.skills ?? [];
  const enrichedPrompt =
    activeSkills.length > 0
      ? systemPrompt +
        '\n\n---\n\n' +
        activeSkills.map((s) => s.content).join('\n\n')
      : systemPrompt;

  const messages: Message[] = [{ role: 'user', content: userMessage }];
  // ... rest of function uses enrichedPrompt instead of systemPrompt
```

Add the import at the top of utils.ts:
```typescript
import type { Skill } from '../skills/types.js';
```

- [ ] **Step 5: Update each agent to forward skills from AgentOptions**

For `src/agents/dev.ts`:
```typescript
export async function runDevAgent(
  input: DevInput,
  options: AgentOptions,
): Promise<AgentResult<DevOutput>> {
  const userMessage = JSON.stringify(input, null, 2);
  return callAgent<DevOutput>('dev', options.provider, options.modelId, SYSTEM_PROMPT, userMessage, {
    skills: options.skills,
  });
}
```

Apply the same pattern to `po.ts`, `planner.ts`, `qa.ts` — each forwards `{ skills: options.skills }` to `callAgent`.

- [ ] **Step 6: Add extended injection test**

```typescript
// Add to tests/skills/injection.test.ts
it('appends skill content when skills option is provided', async () => {
  const { callAgent } = await import('../../src/agents/utils.js');

  const skill: Skill = {
    id: 'test-skill',
    name: 'Test',
    role: 'dev',
    content: '## Test\nDo the test thing.',
    tokenEstimate: 10,
    cacheable: true,
  };

  const provider = mockProvider('{"result": true}');
  await callAgent('dev', provider, 'test-model', 'You are Dev.', 'build X', { skills: [skill] });

  expect(provider.lastRequest?.systemPrompt).toContain('You are Dev.');
  expect(provider.lastRequest?.systemPrompt).toContain('Do the test thing.');
});
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: 80+ tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/agents/types.ts src/agents/utils.ts src/agents/dev.ts src/agents/po.ts src/agents/planner.ts src/agents/qa.ts tests/skills/injection.test.ts
git commit -m "feat(skills): inject active skills into agent system prompts"
```

---

## Task 5: Plugin types + registry

**Files:**
- Create: `src/plugins/types.ts`
- Create: `src/plugins/registry.ts`
- Create: `src/plugins/catalog/file-write.ts`
- Create: `src/plugins/catalog/read-file.ts`
- Create: `src/plugins/catalog/web-search.ts`
- Create: `src/plugins/catalog/github-create-issue.ts`
- Create: `tests/plugins/registry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/plugins/registry.test.ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../../src/plugins/registry.js';

describe('PluginRegistry', () => {
  it('has all 4 built-in plugins', () => {
    const registry = new PluginRegistry();
    const names = registry.getAll().map((p) => p.id);
    expect(names).toContain('file_write');
    expect(names).toContain('read_file');
    expect(names).toContain('web_search');
    expect(names).toContain('github_create_issue');
  });

  it('forRole("dev") returns file_write and read_file', () => {
    const registry = new PluginRegistry();
    const ids = registry.forRole('dev').map((p) => p.id);
    expect(ids).toContain('file_write');
    expect(ids).toContain('read_file');
  });

  it('getById returns the correct plugin', () => {
    const registry = new PluginRegistry();
    expect(registry.getById('file_write')).toBeDefined();
  });

  it('each plugin has a valid JSON Schema inputSchema', () => {
    const registry = new PluginRegistry();
    for (const plugin of registry.getAll()) {
      expect(plugin.tool.inputSchema).toHaveProperty('type', 'object');
      expect(plugin.tool.inputSchema).toHaveProperty('properties');
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/plugins/registry.test.ts
```

- [ ] **Step 3: Create plugin types**

```typescript
// src/plugins/types.ts
import type { AgentRole } from '../types/index.js';
import type { ToolDefinition } from '../providers/types.js';

export interface Plugin {
  id: string;
  name: string;
  role: AgentRole | 'all';
  tool: ToolDefinition;
  handler: (input: unknown, context: PluginContext) => Promise<string>;
}

export interface PluginContext {
  runId: string;
  outputDir: string;
  cwd: string;
}
```

- [ ] **Step 4: Create plugin implementations**

```typescript
// src/plugins/catalog/file-write.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Plugin } from '../types.js';

interface FileWriteInput {
  path: string;
  content: string;
}

export const fileWritePlugin: Plugin = {
  id: 'file_write',
  name: 'Write File',
  role: 'dev',
  tool: {
    name: 'file_write',
    description: 'Write a file to the output directory. Use for every generated file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path within the output directory' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['path', 'content'],
    },
  },
  async handler(input, context) {
    const { path, content } = input as FileWriteInput;
    const absPath = join(context.outputDir, path);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, content, 'utf-8');
    return `Written: ${path}`;
  },
};
```

```typescript
// src/plugins/catalog/read-file.ts
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from '../types.js';

interface ReadFileInput {
  path: string;
}

export const readFilePlugin: Plugin = {
  id: 'read_file',
  name: 'Read File',
  role: 'all',
  tool: {
    name: 'read_file',
    description: 'Read an existing file from the project directory for context.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from the project root' },
      },
      required: ['path'],
    },
  },
  async handler(input, context) {
    const { path } = input as ReadFileInput;
    const absPath = resolve(context.cwd, path);
    try {
      const content = await readFile(absPath, 'utf-8');
      return content.slice(0, 8000); // cap at 8k chars
    } catch {
      return `Error: could not read "${path}"`;
    }
  },
};
```

```typescript
// src/plugins/catalog/web-search.ts
import type { Plugin } from '../types.js';

interface WebSearchInput {
  query: string;
}

export const webSearchPlugin: Plugin = {
  id: 'web_search',
  name: 'Web Search',
  role: 'all',
  tool: {
    name: 'web_search',
    description: 'Search the web for relevant information.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  async handler(input, _context) {
    const { query } = input as WebSearchInput;
    // Stub — integrate a search API (Brave, DuckDuckGo) in a future iteration
    return `[web_search] Query "${query}" — search API not configured. Set BRAVE_API_KEY to enable.`;
  },
};
```

```typescript
// src/plugins/catalog/github-create-issue.ts
import type { Plugin } from '../types.js';

interface GithubIssueInput {
  title: string;
  body: string;
  labels?: string[];
}

export const githubCreateIssuePlugin: Plugin = {
  id: 'github_create_issue',
  name: 'GitHub Create Issue',
  role: 'qa',
  tool: {
    name: 'github_create_issue',
    description: 'Open a GitHub issue with the QA report when the verdict is FAIL.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'body'],
    },
  },
  async handler(input, _context) {
    const { title, body, labels = [] } = input as GithubIssueInput;
    // Stub — use `gh issue create` CLI when available
    return `[github_create_issue] Stub: would create issue "${title}" with labels [${labels.join(', ')}].\nBody preview: ${body.slice(0, 200)}`;
  },
};
```

- [ ] **Step 5: Create plugin registry**

```typescript
// src/plugins/registry.ts
import type { AgentRole } from '../types/index.js';
import type { Plugin } from './types.js';
import { fileWritePlugin } from './catalog/file-write.js';
import { readFilePlugin } from './catalog/read-file.js';
import { webSearchPlugin } from './catalog/web-search.js';
import { githubCreateIssuePlugin } from './catalog/github-create-issue.js';

const CATALOG: Plugin[] = [fileWritePlugin, readFilePlugin, webSearchPlugin, githubCreateIssuePlugin];

export class PluginRegistry {
  private readonly plugins = CATALOG;

  getAll(): Plugin[] {
    return this.plugins;
  }

  getById(id: string): Plugin | undefined {
    return this.plugins.find((p) => p.id === id);
  }

  forRole(role: AgentRole): Plugin[] {
    return this.plugins.filter((p) => p.role === role || p.role === 'all');
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/plugins/registry.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/ tests/plugins/registry.test.ts
git commit -m "feat(plugins): add plugin interface, registry and 4 built-in plugins"
```

---

## Task 6: Provider updates for tool use + plugin runner in callAgent

**Files:**
- Modify: `src/providers/claude.ts` — return toolCalls from tool_use response blocks
- Modify: `src/providers/openai.ts` — return toolCalls from function_calling response
- Modify: `src/agents/utils.ts` — add tool-use loop using plugin handlers
- Create: `tests/plugins/runner.test.ts`

> Note: `groq.ts` and `nim.ts` both use the OpenAI SDK — the `openai.ts` pattern applies to them. Only `openai.ts` needs modification; Groq and NIM inherit the same SDK call.

- [ ] **Step 1: Write failing runner tests**

```typescript
// tests/plugins/runner.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { LLMProvider, CompletionRequest, ToolCall } from '../../src/providers/types.js';
import type { Plugin } from '../../src/plugins/types.js';
import type { Skill } from '../../src/skills/types.js';

// Provider that returns a tool_use response on first call, then a final response
function toolUsingProvider(toolCallName: string, toolInput: unknown): LLMProvider {
  let callCount = 0;
  return {
    name: 'claude' as const,
    isConfigured: () => true,
    complete: vi.fn(async (_req: CompletionRequest) => {
      callCount++;
      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [{ id: 'tc_1', name: toolCallName, input: toolInput }] as ToolCall[],
          stopReason: 'tool_use' as const,
          inputTokens: 10,
          outputTokens: 5,
          durationMs: 50,
          model: 'claude-test',
          provider: 'claude' as const,
        };
      }
      return {
        content: '{"result": "done"}',
        stopReason: 'end_turn' as const,
        inputTokens: 10,
        outputTokens: 5,
        durationMs: 50,
        model: 'claude-test',
        provider: 'claude' as const,
      };
    }),
  };
}

describe('callAgent with plugins', () => {
  it('executes tool handler and continues to final response', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');

    const handlerSpy = vi.fn().mockResolvedValue('handler result');
    const plugin: Plugin = {
      id: 'mock_tool',
      name: 'Mock Tool',
      role: 'dev',
      tool: {
        name: 'mock_tool',
        description: 'A mock tool',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      handler: handlerSpy,
    };

    const provider = toolUsingProvider('mock_tool', { key: 'value' });

    const result = await callAgent<{ result: string }>(
      'dev',
      provider,
      'claude-test',
      'You are Dev.',
      'do something',
      { plugins: [plugin], pluginContext: { runId: 'test-run', outputDir: '/tmp', cwd: '/tmp' } },
    );

    expect(handlerSpy).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledWith({ key: 'value' }, expect.any(Object));
    expect(result.output).toEqual({ result: 'done' });
  });

  it('does nothing when provider returns no tool calls', async () => {
    const { callAgent } = await import('../../src/agents/utils.js');
    const provider = toolUsingProvider('never', {}); // but first call returns end_turn
    (provider.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      content: '{"result": "direct"}',
      stopReason: 'end_turn' as const,
      inputTokens: 5, outputTokens: 3, durationMs: 30,
      model: 'test', provider: 'claude' as const,
    });

    const result = await callAgent<{ result: string }>(
      'dev', provider, 'test', 'prompt', 'user', {}
    );
    expect(result.output).toEqual({ result: 'direct' });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- tests/plugins/runner.test.ts
```

- [ ] **Step 3: Update Claude provider to return toolCalls**

In `src/providers/claude.ts`, after extracting `textBlock`, also extract tool_use blocks:

```typescript
// After: const textBlock = response.content.find((b) => b.type === 'text');
// Add:
const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

const toolCalls: import('./types.js').ToolCall[] = toolUseBlocks.map((b) => {
  if (b.type !== 'tool_use') throw new Error('unreachable');
  return { id: b.id, name: b.name, input: b.input };
});

// Update result construction:
const result: CompletionResponse = {
  content,
  ...(toolCalls.length > 0 ? { toolCalls } : {}),
  stopReason: response.stop_reason === 'tool_use' ? 'tool_use'
    : response.stop_reason === 'max_tokens' ? 'max_tokens'
    : 'end_turn',
  inputTokens: usage.input_tokens,
  // ... rest unchanged
};
```

Also update the `messages` mapping to handle `ToolResultMessage`:

```typescript
// Replace the existing messages mapping:
const messages: Anthropic.Messages.MessageParam[] = request.messages.map((m) => {
  if (m.role === 'tool') {
    return {
      role: 'user' as const,
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: m.toolCallId,
          content: m.content,
        },
      ],
    };
  }
  return { role: m.role, content: m.content };
});
```

Add tool definitions to the Claude request params when provided:

```typescript
// In params construction, add:
...(request.tools && request.tools.length > 0
  ? {
      tools: request.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Messages.Tool['input_schema'],
      })),
    }
  : {}),
```

- [ ] **Step 4: Update OpenAI provider similarly**

In `src/providers/openai.ts`, map tools to OpenAI format and extract tool_calls from response:

```typescript
// In complete(), add to the request params:
...(request.tools && request.tools.length > 0
  ? {
      tools: request.tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    }
  : {}),
```

Map tool result messages:
```typescript
const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.messages.map((m) => {
  if (m.role === 'tool') {
    return {
      role: 'tool' as const,
      tool_call_id: m.toolCallId,
      content: m.content,
    };
  }
  // ... existing mapping
});
```

Extract tool calls from response:
```typescript
const rawToolCalls = choice.message.tool_calls ?? [];
const toolCalls: import('./types.js').ToolCall[] = rawToolCalls.map((tc) => ({
  id: tc.id,
  name: tc.function.name,
  input: JSON.parse(tc.function.arguments) as unknown,
}));
```

Update return:
```typescript
return {
  content: choice.message.content ?? '',
  ...(toolCalls.length > 0 ? { toolCalls } : {}),
  stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use'
    : choice.finish_reason === 'length' ? 'max_tokens'
    : 'end_turn',
  // ... rest unchanged
};
```

- [ ] **Step 5: Add tool-use loop to callAgent in agents/utils.ts**

Update the `callAgent` options and add the tool loop before JSON extraction:

```typescript
// Updated options type for callAgent:
options?: {
  skills?: Skill[];
  plugins?: Plugin[];
  pluginContext?: PluginContext;
}
```

Add these imports:
```typescript
import type { ToolResultMessage } from '../providers/types.js';
import type { Plugin, PluginContext } from '../plugins/types.js';
```

Inside the main `for (;;)` loop, after getting `response`, add tool handling before JSON extraction:

```typescript
// ── Tool use loop ──────────────────────────────────────────────────────────
if (response.stopReason === 'tool_use' && response.toolCalls && response.toolCalls.length > 0) {
  const activePlugins = options?.plugins ?? [];
  const pluginContext = options?.pluginContext ?? {
    runId: 'unknown',
    outputDir: process.cwd(),
    cwd: process.cwd(),
  };

  // Add the assistant message (with tool calls) to history
  messages.push({
    role: 'assistant' as const,
    content: response.content || '',
    // Note: tool call info is tracked via ToolResultMessages sent back
  } as Message);

  // Execute each tool call and collect results
  for (const tc of response.toolCalls) {
    const plugin = activePlugins.find((p) => p.id === tc.name);
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

    const toolResult: ToolResultMessage = {
      role: 'tool' as const,
      toolCallId: tc.id,
      content: result,
    };
    messages.push(toolResult);
  }

  // Continue the loop — provider will get tool results and produce next response
  continue;
}
```

Important: place this block BEFORE the JSON extraction try/catch.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: 80+ tests PASS.

- [ ] **Step 7: Typecheck**

```bash
./node_modules/.bin/tsc.cmd --noEmit -p tsconfig.test.json
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/providers/claude.ts src/providers/openai.ts src/agents/utils.ts tests/plugins/runner.test.ts
git commit -m "feat(plugins): add tool-use loop in callAgent + provider tool support"
```

---

## Task 7: Project config + pipeline wiring

**Files:**
- Create: `src/config/types.ts`
- Create: `src/config/project.ts`
- Modify: `src/pipeline/runner.ts` — load config, inject skills+plugins into AgentOptions
- Create: `tests/config/project.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/config/project.test.ts
import { describe, it, expect } from 'vitest';
import { loadProjectConfig, defaultConfig } from '../../src/config/project.js';

describe('loadProjectConfig', () => {
  it('returns defaultConfig when no aiwb.config.json exists', async () => {
    const config = await loadProjectConfig('/nonexistent/path');
    expect(config).toEqual(defaultConfig);
  });

  it('merges partial config with defaults', async () => {
    // Uses a fixture file
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'aiwb-test-'));
    try {
      await writeFile(
        join(dir, 'aiwb.config.json'),
        JSON.stringify({ skills: { dev: ['typescript-strict'] } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.skills.dev).toContain('typescript-strict');
      // Other defaults preserved
      expect(config.plugins).toEqual(defaultConfig.plugins);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns defaultConfig on invalid JSON', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'aiwb-test-'));
    try {
      await writeFile(join(dir, 'aiwb.config.json'), 'not json');
      const config = await loadProjectConfig(dir);
      expect(config).toEqual(defaultConfig);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- tests/config/project.test.ts
```

- [ ] **Step 3: Create config types**

```typescript
// src/config/types.ts
import type { AgentRole } from '../types/index.js';

export interface ProjectConfig {
  skills: Partial<Record<AgentRole | 'all', string[]>>;
  plugins: Partial<Record<AgentRole | 'all', string[]>>;
  models?: Partial<Record<AgentRole, string>>;
}
```

- [ ] **Step 4: Create project config loader**

```typescript
// src/config/project.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectConfig } from './types.js';

export const defaultConfig: ProjectConfig = {
  skills: {},
  plugins: {},
};

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig> {
  const configPath = join(cwd, 'aiwb.config.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ProjectConfig>;
    return {
      skills: parsed.skills ?? {},
      plugins: parsed.plugins ?? {},
      ...(parsed.models ? { models: parsed.models } : {}),
    };
  } catch {
    return defaultConfig;
  }
}
```

- [ ] **Step 5: Wire config into pipeline runner**

In `src/pipeline/runner.ts`, import the registries and config loader:

```typescript
import { loadProjectConfig } from '../config/project.js';
import { SkillRegistry } from '../skills/registry.js';
import { PluginRegistry } from '../plugins/registry.js';
```

At the start of `runPipeline`, load config and build registries once:

```typescript
const projectConfig = await loadProjectConfig(process.cwd());
const skillRegistry = new SkillRegistry();
const pluginRegistry = new PluginRegistry();
```

Where each agent's `AgentOptions` is built, resolve active skills and plugins:

```typescript
// Helper inside runPipeline:
function getActiveSkills(role: AgentRole) {
  const ids = [
    ...(projectConfig.skills.all ?? []),
    ...(projectConfig.skills[role] ?? []),
  ];
  return ids.map((id) => skillRegistry.getById(id)).filter(Boolean);
}

function getActivePlugins(role: AgentRole) {
  const ids = [
    ...(projectConfig.plugins.all ?? []),
    ...(projectConfig.plugins[role] ?? []),
  ];
  return ids.map((id) => pluginRegistry.getById(id)).filter(Boolean);
}
```

Pass these into each agent options call:
```typescript
const agentOptions: AgentOptions = {
  provider: getProvider(step.provider),
  modelId: step.modelId ?? getDefaultModel(step.role).id,
  skills: getActiveSkills(step.role),
  plugins: getActivePlugins(step.role),
};
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/config/ tests/config/ src/pipeline/runner.ts
git commit -m "feat(config): add aiwb.config.json project config + wire skills/plugins into pipeline"
```

---

## Task 8: TUI ConfigScreen

**Files:**
- Create: `src/ui/screens/ConfigScreen.tsx`
- Modify: `src/ui/App.tsx` — add ConfigScreen between Prompt and Pipeline screens

> Before starting this task, read `src/ui/App.tsx` to understand the screen transition pattern, and the existing screen components (PromptScreen, PipelineScreen) to follow the same Ink component conventions.

- [ ] **Step 1: Read existing TUI screens for patterns**

```bash
cat src/ui/App.tsx
ls src/ui/screens/   # or wherever screens live
```

- [ ] **Step 2: Create ConfigScreen**

ConfigScreen displays available skills and plugins, lets the user toggle each on/off with space bar, then press Enter to continue.

```tsx
// src/ui/screens/ConfigScreen.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SkillRegistry } from '../../skills/registry.js';
import { PluginRegistry } from '../../plugins/registry.js';
import type { Skill } from '../../skills/types.js';
import type { Plugin } from '../../plugins/types.js';

interface ConfigScreenProps {
  onConfirm: (activeSkillIds: string[], activePluginIds: string[]) => void;
  onBack: () => void;
}

type Item = { kind: 'skill'; item: Skill } | { kind: 'plugin'; item: Plugin };

const skillRegistry = new SkillRegistry();
const pluginRegistry = new PluginRegistry();

export function ConfigScreen({ onConfirm, onBack }: ConfigScreenProps) {
  const allItems: Item[] = [
    ...skillRegistry.getAll().map((s): Item => ({ kind: 'skill', item: s })),
    ...pluginRegistry.getAll().map((p): Item => ({ kind: 'plugin', item: p })),
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

  useInput((input, key) => {
    if (key.upArrow) setSelectedIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIdx((i) => Math.min(allItems.length - 1, i + 1));
    if (input === ' ') {
      const id = allItems[selectedIdx]?.item.id ?? '';
      setActiveIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    if (key.return) {
      const activeSkillIds = allItems
        .filter((x) => x.kind === 'skill' && activeIds.has(x.item.id))
        .map((x) => x.item.id);
      const activePluginIds = allItems
        .filter((x) => x.kind === 'plugin' && activeIds.has(x.item.id))
        .map((x) => x.item.id);
      onConfirm(activeSkillIds, activePluginIds);
    }
    if (key.escape || input === 'q') onBack();
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold>Skills & Plugins</Text>
      <Text dimColor>Space = toggle · Enter = confirm · q = back</Text>
      <Box marginTop={1} flexDirection="column">
        {allItems.map((entry, idx) => {
          const { item } = entry;
          const isSelected = idx === selectedIdx;
          const isActive = activeIds.has(item.id);
          return (
            <Box key={item.id}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '▸ ' : '  '}
                {isActive ? '[✓] ' : '[ ] '}
                <Text bold={isActive}>{item.name}</Text>
                <Text dimColor>  {entry.kind === 'skill' ? 'skill' : 'plugin'} · role: {item.role}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Add ConfigScreen to App.tsx flow**

Read `src/ui/App.tsx`. Add `'config'` as a screen state between `'prompt'` and `'pipeline'`:

The App's screen type goes from:
```typescript
type Screen = 'prompt' | 'pipeline' | 'results';
```
To:
```typescript
type Screen = 'prompt' | 'config' | 'pipeline' | 'results';
```

When the user confirms the prompt, transition to `'config'` instead of `'pipeline'`. When ConfigScreen calls `onConfirm`, store the active skill/plugin IDs in App state and transition to `'pipeline'`, passing them as props. The pipeline step options use these to override the project config.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 5: Typecheck**

```bash
./node_modules/.bin/tsc.cmd --noEmit -p tsconfig.test.json
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/ConfigScreen.tsx src/ui/App.tsx
git commit -m "feat(ui): add ConfigScreen for skills/plugins toggle before pipeline run"
```

---

## Self-Review

### Spec coverage

| Spec item | Task |
|---|---|
| T2a — Skill registry + 5-skill catalog | Tasks 2 + 3 |
| T2b — Skills injection + Claude prompt caching | Task 4 (injection via enrichedPrompt + existing cacheSystemPrompt) |
| T2c — Skill compression for non-caching providers | Not implemented — catalog skills are all <200 tokens, no compression needed for v1 |
| T2d — Plugin types + registry + handler runner | Tasks 5 + 6 |
| T2e — 4 plugins: file_write, read_file, web_search, github_create_issue | Task 5 |
| T2f — aiwb.config.json project config | Task 7 |
| T2g — TUI config screen | Task 8 |

> **T2c gap**: The synthesis mentions compression for providers without caching. For v1, skills in the catalog are all under 200 tokens so it's a non-issue. Mark as "deferred — implement when skills exceed 500 tokens" and leave a TODO in `registry.ts`.

### Placeholder scan

- Task 6 Step 3/4: `rest unchanged` references need to be resolved by reading the actual files before implementing — this is expected in a plan document.
- Task 8 Step 3: "Read App.tsx first" instruction — required before modifying to avoid guessing screen transition logic.

### Type consistency

- `ToolResultMessage` is defined in `providers/types.ts` (Task 1) and used in `agents/utils.ts` (Task 6) ✓
- `Plugin` has `handler: (input: unknown, context: PluginContext) => Promise<string>` — used consistently in catalog files ✓
- `AgentOptions.skills?: Skill[]` and `AgentOptions.plugins?: Plugin[]` — added in Task 4 Step 3 and used in Task 7 Step 5 ✓
- `callAgent` options type `{ skills?: Skill[], plugins?: Plugin[], pluginContext?: PluginContext }` — defined in Task 6 Step 5, used in runner test (Task 6 Step 1) ✓
