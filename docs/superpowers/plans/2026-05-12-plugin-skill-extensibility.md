# Plugin & Skill Extensibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to load custom plugins and skills from local paths or npm packages (`lunatar-plugin-*` / `lunatar-skill-*`) without modifying Lunatar's source code.

**Architecture:** Extend `lunatar.config.json` with an `external[]` array for both plugins and skills. A new `loader.ts` module in each domain resolves these references via dynamic `import()` (plugins) or `fs.readFile` (skills). Auto-discovery scans `node_modules` for packages following the naming convention. The existing `PluginRegistry` and `SkillRegistry` are extended — not replaced.

**Tech Stack:** TypeScript strict, Node.js `fs/promises`, dynamic `import()`, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/config/types.ts` | Add `external: string[]` to plugins and skills config |
| Create | `src/plugins/loader.ts` | Resolve + validate external plugin references |
| Create | `src/skills/loader.ts` | Resolve + validate external skill references |
| Modify | `src/plugins/registry.ts` | Accept externally loaded plugins alongside built-ins |
| Modify | `src/skills/registry.ts` | Accept externally loaded skills alongside built-ins |
| Modify | `src/pipeline/runner.ts` | Pass loaded externals to registries |
| Create | `tests/plugins/loader.test.ts` | Tests for plugin resolution + validation |
| Create | `tests/skills/loader.test.ts` | Tests for skill resolution + validation |

---

## Task 1 — Extend config types for external references

**Files:**
- Modify: `src/config/types.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/config/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loadProjectConfig } from '../../src/config/project.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('project config — external field', () => {
  it('parses external plugin and skill paths from lunatar.config.json', async () => {
    const dir = join(tmpdir(), `lunatar-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunatar.config.json'),
      JSON.stringify({
        skills: { all: [], external: ['./my-skill.md'] },
        plugins: { all: [], external: ['./my-plugin.js'] },
      }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.skills.external).toEqual(['./my-skill.md']);
    expect(config.plugins.external).toEqual(['./my-plugin.js']);
    await rm(dir, { recursive: true });
  });

  it('defaults external to empty array when absent', async () => {
    const dir = join(tmpdir(), `lunatar-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunatar.config.json'),
      JSON.stringify({ skills: { all: [] }, plugins: { all: [] } }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.skills.external).toEqual([]);
    expect(config.plugins.external).toEqual([]);
    await rm(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/config/types.test.ts
```

Expected: FAIL — `external` property does not exist on config type

- [ ] **Step 3: Add `external` to config types**

Read `src/config/types.ts` first, then add `external?: string[]` to the `SkillsConfig` and `PluginsConfig` interfaces. Example — locate the existing interfaces and add the field:

```typescript
export interface SkillsConfig {
  all?: string[];
  po?: string[];
  planner?: string[];
  dev?: string[];
  qa?: string[];
  external?: string[];   // ← add
}

export interface PluginsConfig {
  all?: string[];
  po?: string[];
  planner?: string[];
  dev?: string[];
  qa?: string[];
  external?: string[];   // ← add
}
```

Then in `src/config/project.ts`, ensure `external` defaults to `[]` when absent in the parsed JSON. Find the config normalization logic and add:

```typescript
skills: {
  ...parsed.skills,
  external: parsed.skills?.external ?? [],
},
plugins: {
  ...parsed.plugins,
  external: parsed.plugins?.external ?? [],
},
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/config/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/config/project.ts tests/config/types.test.ts
git commit -m "feat(config): add external[] field to skills and plugins config"
```

---

## Task 2 — Plugin loader (resolve + validate external plugins)

**Files:**
- Create: `src/plugins/loader.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/plugins/loader.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadExternalPlugin } from '../../src/plugins/loader.js';

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `lunatar-plugin-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  await writeFile(
    join(tmpDir, 'valid-plugin.mjs'),
    `export const plugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      role: 'dev',
      tool: { name: 'test_tool', description: 'A test tool', inputSchema: { type: 'object', properties: {} } },
      handler: async () => 'result',
    };`,
  );

  await writeFile(
    join(tmpDir, 'invalid-plugin.mjs'),
    `export const plugin = { id: 'bad' }; // missing required fields`,
  );
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true });
});

describe('loadExternalPlugin', () => {
  it('loads a valid plugin from an absolute path', async () => {
    const plugin = await loadExternalPlugin(join(tmpDir, 'valid-plugin.mjs'));
    expect(plugin.id).toBe('test-plugin');
    expect(typeof plugin.handler).toBe('function');
  });

  it('throws on invalid plugin shape', async () => {
    await expect(
      loadExternalPlugin(join(tmpDir, 'invalid-plugin.mjs')),
    ).rejects.toThrow(/invalid plugin/i);
  });

  it('throws on non-existent path', async () => {
    await expect(
      loadExternalPlugin(join(tmpDir, 'does-not-exist.mjs')),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/plugins/loader.test.ts
```

Expected: FAIL — loader.ts not found

- [ ] **Step 3: Create `src/plugins/loader.ts`**

```typescript
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Plugin } from './types.js';

function isValidPlugin(value: unknown): value is Plugin {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p['id'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['role'] === 'string' &&
    typeof p['tool'] === 'object' &&
    typeof p['handler'] === 'function'
  );
}

export async function loadExternalPlugin(ref: string, cwd = process.cwd()): Promise<Plugin> {
  const absPath = ref.startsWith('.') ? resolve(cwd, ref) : ref;

  if (ref.startsWith('.') && !existsSync(absPath)) {
    throw new Error(`External plugin not found: ${absPath}`);
  }

  const mod = await import(absPath) as { plugin?: unknown };
  const plugin = mod.plugin;

  if (!isValidPlugin(plugin)) {
    throw new Error(
      `Invalid plugin at "${ref}": must export { id, name, role, tool, handler }`,
    );
  }

  return plugin;
}

export async function discoverNpmPlugins(cwd = process.cwd()): Promise<Plugin[]> {
  const nodeModules = resolve(cwd, 'node_modules');
  if (!existsSync(nodeModules)) return [];

  const { readdirSync } = await import('node:fs');
  const entries = readdirSync(nodeModules);
  const pluginPkgs = entries.filter((e) => e.startsWith('lunatar-plugin-'));

  const loaded: Plugin[] = [];
  for (const pkg of pluginPkgs) {
    try {
      const plugin = await loadExternalPlugin(pkg, cwd);
      loaded.push(plugin);
    } catch {
      // Skip invalid packages silently — log if debug mode added later
    }
  }
  return loaded;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/plugins/loader.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/plugins/loader.ts tests/plugins/loader.test.ts
git commit -m "feat(plugins): add external plugin loader with validation and npm auto-discovery"
```

---

## Task 3 — Skill loader (resolve external skills)

**Files:**
- Create: `src/skills/loader.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/skills/loader.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadExternalSkill } from '../../src/skills/loader.js';

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `lunatar-skill-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  await writeFile(join(tmpDir, 'my-skill.md'), '# My Skill\n\nDo things in a specific way.');
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true });
});

describe('loadExternalSkill', () => {
  it('loads a .md file as a skill with id derived from filename', async () => {
    const skill = await loadExternalSkill(join(tmpDir, 'my-skill.md'));
    expect(skill.id).toBe('my-skill');
    expect(skill.content).toContain('My Skill');
    expect(skill.role).toBe('all');
    expect(skill.cacheable).toBe(true);
  });

  it('throws on non-existent path', async () => {
    await expect(loadExternalSkill('/does/not/exist.md')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/skills/loader.test.ts
```

Expected: FAIL — loader.ts not found

- [ ] **Step 3: Create `src/skills/loader.ts`**

```typescript
import { readFile, access } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import type { Skill } from './types.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export async function loadExternalSkill(ref: string, cwd = process.cwd()): Promise<Skill> {
  const absPath = ref.startsWith('.') ? resolve(cwd, ref) : ref;

  await access(absPath); // throws if not found

  const content = await readFile(absPath, 'utf-8');
  const id = basename(absPath, extname(absPath));

  return {
    id,
    name: id,
    role: 'all',
    content,
    tokenEstimate: estimateTokens(content),
    cacheable: true,
  };
}

export async function discoverNpmSkills(cwd = process.cwd()): Promise<Skill[]> {
  const nodeModules = resolve(cwd, 'node_modules');
  if (!existsSync(nodeModules)) return [];

  const { readdirSync } = await import('node:fs');
  const entries = readdirSync(nodeModules);
  const skillPkgs = entries.filter((e) => e.startsWith('lunatar-skill-'));

  const loaded: Skill[] = [];
  for (const pkg of skillPkgs) {
    try {
      const pkgMain = resolve(nodeModules, pkg, 'skill.md');
      const skill = await loadExternalSkill(pkgMain, cwd);
      loaded.push({ ...skill, id: pkg });
    } catch {
      // Skip invalid packages silently
    }
  }
  return loaded;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/skills/loader.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/skills/loader.ts tests/skills/loader.test.ts
git commit -m "feat(skills): add external skill loader from .md files and npm auto-discovery"
```

---

## Task 4 — Wire external loading into registries and runner

**Files:**
- Modify: `src/plugins/registry.ts`
- Modify: `src/skills/registry.ts`
- Modify: `src/pipeline/runner.ts`

- [ ] **Step 1: Write the failing test**

In `tests/plugins/loader.test.ts`, add:

```typescript
import { PluginRegistry } from '../../src/plugins/registry.js';

describe('PluginRegistry with externals', () => {
  it('includes externally loaded plugins in getAll()', () => {
    const external = {
      id: 'ext-plugin',
      name: 'External',
      role: 'all' as const,
      tool: { name: 'ext', description: 'ext', inputSchema: { type: 'object' as const, properties: {} } },
      handler: async () => 'ok',
    };
    const registry = new PluginRegistry([external]);
    expect(registry.getAll().map((p) => p.id)).toContain('ext-plugin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/plugins/loader.test.ts
```

Expected: FAIL — PluginRegistry constructor doesn't accept externals

- [ ] **Step 3: Update `PluginRegistry` to accept externals**

Read `src/plugins/registry.ts` then modify:

```typescript
import type { AgentRole } from '../types/index.js';
import type { Plugin } from './types.js';
import { fileWritePlugin } from './catalog/file-write.js';
import { readFilePlugin } from './catalog/read-file.js';
import { webSearchPlugin } from './catalog/web-search.js';
import { githubCreateIssuePlugin } from './catalog/github-create-issue.js';

const BUILT_IN: Plugin[] = [
  fileWritePlugin,
  readFilePlugin,
  webSearchPlugin,
  githubCreateIssuePlugin,
];

export class PluginRegistry {
  private readonly plugins: Plugin[];

  constructor(externals: Plugin[] = []) {
    this.plugins = [...BUILT_IN, ...externals];
  }

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

- [ ] **Step 4: Update `SkillRegistry` to accept externals**

Read `src/skills/registry.ts` then modify the constructor:

```typescript
export class SkillRegistry {
  private readonly skills: Skill[];

  constructor(externals: Skill[] = []) {
    this.skills = [
      ...CATALOG.map((entry) => {
        const content = loadMd(`${entry.id}.md`);
        return { ...entry, content, tokenEstimate: estimateTokens(content) };
      }),
      ...externals,
    ];
  }
  // getAll, getById, forRole unchanged
}
```

- [ ] **Step 5: Update `runner.ts` to load and pass externals**

Read `src/pipeline/runner.ts`, then in the pipeline init block (around line 95 where registries are created), replace:

```typescript
skillRegistry = new SkillRegistry();
pluginRegistry = new PluginRegistry();
```

with:

```typescript
const { loadExternalSkill, discoverNpmSkills } = await import('../skills/loader.js');
const { loadExternalPlugin, discoverNpmPlugins } = await import('../plugins/loader.js');

const externalSkillPaths = projectConfig.skills.external ?? [];
const externalPluginPaths = projectConfig.plugins.external ?? [];

const [externalSkills, npmSkills, externalPlugins, npmPlugins] = await Promise.all([
  Promise.all(externalSkillPaths.map((p) => loadExternalSkill(p, process.cwd()))),
  discoverNpmSkills(process.cwd()),
  Promise.all(externalPluginPaths.map((p) => loadExternalPlugin(p, process.cwd()))),
  discoverNpmPlugins(process.cwd()),
]);

skillRegistry = new SkillRegistry([...externalSkills, ...npmSkills]);
pluginRegistry = new PluginRegistry([...externalPlugins, ...npmPlugins]);
```

- [ ] **Step 6: Run full test suite**

```bash
npm run typecheck && npm test
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/plugins/registry.ts src/skills/registry.ts src/pipeline/runner.ts tests/plugins/loader.test.ts
git commit -m "feat(registry): wire external plugin and skill loading into pipeline runner"
```

---

## Task 5 — Build, smoke test, open PR

- [ ] **Step 1: Full check**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass

- [ ] **Step 2: Manual smoke test**

```bash
# Create a test external plugin
echo 'export const plugin = { id: "hello", name: "Hello", role: "dev", tool: { name: "hello_tool", description: "Says hello", inputSchema: { type: "object", properties: {} } }, handler: async () => "hello world" };' > /tmp/hello-plugin.mjs

# Add it to lunatar.config.json in a test project
# plugins.external: ["/tmp/hello-plugin.mjs"]
# Then run: lunatar run --dry "test"
```

Expected: no crash, plugin appears available

- [ ] **Step 3: Open PR**

```bash
git push -u origin feat/plugin-skill-extensibility
gh pr create --title "feat: external plugin and skill loading with npm auto-discovery" \
  --body "Adds external[] config field for local paths, dynamic import() loading, shape validation, and lunatar-plugin-*/lunatar-skill-* auto-discovery from node_modules."
```
