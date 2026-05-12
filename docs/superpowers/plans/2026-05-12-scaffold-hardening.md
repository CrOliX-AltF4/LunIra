# Scaffold Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal `lunatar init` with a production-grade scaffold — interactive wizard TUI, `lunatar.config.json` generation, fullstack type (Next.js 15), README.md, fixed CI template (master branch), and post-scaffold guidance.

**Architecture:** Add an Ink-based wizard (`src/init/wizard.ts`) that triggers when `lunatar init` is called without `--name`/`--type` flags. The scaffolder gains a `lunatar.config.json` template and a fullstack implementation. All templates in `src/init/templates/` are updated independently of the scaffolder logic.

**Tech Stack:** TypeScript strict, Ink (already installed), Node.js `fs/promises`, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/init/wizard.ts` | Ink interactive wizard — collects name + type |
| Modify | `src/init/scaffolder.ts` | Generate lunatar.config.json, README.md, post-scaffold guidance |
| Modify | `src/init/templates/core.ts` | Fix CI (master), add lunatar.config.json template, add README.md template |
| Create | `src/init/templates/fullstack.ts` | Next.js 15 fullstack scaffold files |
| Modify | `src/cli/commands/init.ts` | Call wizard when flags absent |
| Modify | `src/init/types.ts` | No change needed (fullstack already typed) |
| Create | `tests/init/wizard.test.ts` | Unit tests for wizard data collection logic |
| Modify | `tests/init/scaffolder.test.ts` | Add tests for new generated files |

---

## Task 1 — Fix CI template (master branch)

**Files:**
- Modify: `src/init/templates/core.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/init/scaffolder.test.ts` (create file if absent):

```typescript
import { describe, it, expect } from 'vitest';
import { ciYml } from '../../src/init/templates/core.js';

describe('ciYml', () => {
  it('targets master branch, not main or dev', () => {
    const yml = ciYml();
    expect(yml).toContain('branches: [master]');
    expect(yml).not.toContain('branches: [main, dev]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: FAIL — "branches: [master]" not found

- [ ] **Step 3: Fix the CI template**

In `src/init/templates/core.ts`, replace the `CI_YML` constant:

```typescript
const CI_YML = `name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    name: Lint · Types · Tests · Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
`;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/init/templates/core.ts tests/init/scaffolder.test.ts
git commit -m "fix(init): ci template targets master branch"
```

---

## Task 2 — Add `lunatar.config.json` template

**Files:**
- Modify: `src/init/templates/core.ts`
- Modify: `src/init/scaffolder.ts`

- [ ] **Step 1: Write the failing test**

In `tests/init/scaffolder.test.ts`, add:

```typescript
import { lunatarConfig } from '../../src/init/templates/core.js';

describe('lunatarConfig', () => {
  it('returns valid JSON with skills and plugins sections', () => {
    const raw = lunatarConfig();
    const parsed = JSON.parse(raw) as unknown;
    expect(parsed).toMatchObject({
      skills: { all: expect.any(Array) as unknown },
      plugins: { all: expect.any(Array) as unknown },
    });
  });

  it('pre-enables typescript-strict and conventional-commits skills', () => {
    const parsed = JSON.parse(lunatarConfig()) as { skills: { all: string[] } };
    expect(parsed.skills.all).toContain('typescript-strict');
    expect(parsed.skills.all).toContain('conventional-commits');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: FAIL — `lunatarConfig` is not exported

- [ ] **Step 3: Add `lunatarConfig` to `core.ts`**

In `src/init/templates/core.ts`, add after the existing functions:

```typescript
export function lunatarConfig(): string {
  return JSON.stringify(
    {
      skills: {
        all: ['typescript-strict', 'conventional-commits'],
        po: [],
        planner: [],
        dev: [],
        qa: [],
        external: [],
      },
      plugins: {
        all: [],
        po: [],
        planner: [],
        dev: ['read-file', 'file-write'],
        qa: [],
        external: [],
      },
    },
    null,
    2,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: PASS

- [ ] **Step 5: Wire into scaffolder**

In `src/init/scaffolder.ts`, add to the imports from `./templates/core.js`:

```typescript
import {
  agentsMd,
  claudeMd,
  ciYml,
  gitignore,
  envExample,
  eslintConfig,
  prettierRc,
  commitlintConfig,
  huskyPreCommit,
  huskyCommitMsg,
  tsconfigTest,
  vitestConfig,
  lunatarConfig,  // add this
} from './templates/core.js';
```

In `coreFiles()`, add:

```typescript
{ path: 'lunatar.config.json', content: lunatarConfig() },
```

- [ ] **Step 6: Commit**

```bash
git add src/init/templates/core.ts src/init/scaffolder.ts tests/init/scaffolder.test.ts
git commit -m "feat(init): generate lunatar.config.json with default skills and plugins"
```

---

## Task 3 — Add README.md template

**Files:**
- Modify: `src/init/templates/core.ts`
- Modify: `src/init/scaffolder.ts`

- [ ] **Step 1: Write the failing test**

In `tests/init/scaffolder.test.ts`, add:

```typescript
import { readmeMd } from '../../src/init/templates/core.js';

describe('readmeMd', () => {
  it('includes the project name in the title', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('# my-project');
  });

  it('includes lunatar usage section', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('lunatar run');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: FAIL — `readmeMd` is not exported

- [ ] **Step 3: Add `readmeMd` to `core.ts`**

```typescript
export function readmeMd(name: string, type: ProjectType): string {
  return render(README_TEMPLATE, { name, type });
}

const README_TEMPLATE = `# {{name}}

> {{type}} project — scaffolded with [lunatar](https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI)

## Usage

\`\`\`bash
lunatar run "<describe what you want to build>"
\`\`\`

## Development

\`\`\`bash
npm install       # install dependencies
npm run dev       # start in development mode
npm run build     # compile to dist/
npm test          # run tests
npm run lint      # lint
npm run typecheck # type check
\`\`\`

## Stack

See \`AGENTS.md\` for agent roles and model configuration.
`;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: PASS

- [ ] **Step 5: Wire into scaffolder**

Add `readmeMd` to the import, then in `coreFiles()`:

```typescript
{ path: 'README.md', content: readmeMd(name, type) },
```

- [ ] **Step 6: Commit**

```bash
git add src/init/templates/core.ts src/init/scaffolder.ts tests/init/scaffolder.test.ts
git commit -m "feat(init): generate README.md with project name and lunatar usage"
```

---

## Task 4 — Fullstack scaffold (Next.js 15)

**Files:**
- Modify: `src/init/templates/fullstack.ts` (currently throws — replace entirely)
- Modify: `src/init/scaffolder.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/init/fullstack.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as fullstack from '../../src/init/templates/fullstack.js';

describe('fullstack templates', () => {
  it('packageJson includes next and react dependencies', () => {
    const pkg = JSON.parse(fullstack.packageJson('my-app')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('react');
  });

  it('packageJson sets the correct project name', () => {
    const pkg = JSON.parse(fullstack.packageJson('my-app')) as { name: string };
    expect(pkg.name).toBe('my-app');
  });

  it('exports tsconfig function', () => {
    expect(typeof fullstack.tsconfig).toBe('function');
    expect(fullstack.tsconfig()).toContain('compilerOptions');
  });

  it('exports appPage function returning valid TSX', () => {
    expect(fullstack.appPage('my-app')).toContain('export default');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/fullstack.test.ts
```

Expected: FAIL — fullstack.ts throws

- [ ] **Step 3: Implement fullstack templates**

Replace `src/init/templates/fullstack.ts` entirely:

```typescript
export function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        typecheck: 'tsc --noEmit',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        typescript: '^5.0.0',
        vitest: '^4.0.0',
        '@vitejs/plugin-react': '^4.0.0',
      },
    },
    null,
    2,
  );
}

export function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  );
}

export function nextConfig(): string {
  return `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
`;
}

export function appPage(name: string): string {
  return `export default function Home() {
  return (
    <main>
      <h1>${name}</h1>
      <p>Scaffolded with lunatar. Run <code>lunatar run &quot;&lt;intent&gt;&quot;</code> to build.</p>
    </main>
  );
}
`;
}

export function appLayout(name: string): string {
  return `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${name}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}
```

- [ ] **Step 4: Wire into scaffolder**

In `src/init/scaffolder.ts`, replace the `fullstack` case in `layerFiles()`:

```typescript
case 'fullstack':
  return [
    { path: 'package.json', content: fullstackTemplates.packageJson(name) },
    { path: 'tsconfig.json', content: fullstackTemplates.tsconfig() },
    { path: 'next.config.ts', content: fullstackTemplates.nextConfig() },
    { path: 'src/app/page.tsx', content: fullstackTemplates.appPage(name) },
    { path: 'src/app/layout.tsx', content: fullstackTemplates.appLayout(name) },
    { path: 'vitest.config.ts', content: vitestConfig() },
  ];
```

Also add the import at the top of `scaffolder.ts`:

```typescript
import * as fullstackTemplates from './templates/fullstack.js';
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --reporter=verbose tests/init/fullstack.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/init/templates/fullstack.ts src/init/scaffolder.ts tests/init/fullstack.test.ts
git commit -m "feat(init): implement fullstack scaffold with Next.js 15"
```

---

## Task 5 — Post-scaffold guidance

**Files:**
- Modify: `src/init/scaffolder.ts`

- [ ] **Step 1: Write the failing test**

In `tests/init/scaffolder.test.ts`, add:

```typescript
import { buildGuidance } from '../../src/init/scaffolder.js';

describe('buildGuidance', () => {
  it('includes cd command with project name', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('cd my-proj');
  });

  it('mentions lunatar setup', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunatar setup');
  });

  it('mentions lunatar run', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunatar run');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: FAIL — `buildGuidance` not exported

- [ ] **Step 3: Implement `buildGuidance`**

In `src/init/scaffolder.ts`, add and export:

```typescript
export function buildGuidance(name: string, type: ProjectType): string {
  return [
    `\n✓ Project "${name}" (${type}) ready.\n`,
    `Next steps:`,
    `  cd ${name}`,
    `  lunatar setup          # configure LLM API keys`,
    `  lunatar run "<intent>" # run your first pipeline`,
    `\nEdit lunatar.config.json to activate skills and plugins.\n`,
  ].join('\n');
}
```

Then call it at the end of `scaffold()`, replacing the final `process.stdout.write('\n')`:

```typescript
process.stdout.write(buildGuidance(name, type));
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/init/scaffolder.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/init/scaffolder.ts tests/init/scaffolder.test.ts
git commit -m "feat(init): print post-scaffold guidance with next steps"
```

---

## Task 6 — Interactive wizard (no flags = TUI prompt)

**Files:**
- Create: `src/init/wizard.ts`
- Modify: `src/cli/commands/init.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/init/wizard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateProjectName, validateProjectType } from '../../src/init/wizard.js';

describe('validateProjectName', () => {
  it('accepts lowercase-hyphen names', () => {
    expect(validateProjectName('my-project')).toBe(true);
  });

  it('rejects names with uppercase', () => {
    expect(validateProjectName('MyProject')).toMatch(/lowercase/);
  });

  it('rejects empty names', () => {
    expect(validateProjectName('')).toMatch(/required/);
  });

  it('rejects names with spaces', () => {
    expect(validateProjectName('my project')).toMatch(/lowercase/);
  });
});

describe('validateProjectType', () => {
  it('accepts valid types', () => {
    expect(validateProjectType('cli')).toBe(true);
    expect(validateProjectType('frontend')).toBe(true);
    expect(validateProjectType('lib')).toBe(true);
    expect(validateProjectType('fullstack')).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(validateProjectType('backend')).toMatch(/invalid/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/init/wizard.test.ts
```

Expected: FAIL — wizard.ts not found

- [ ] **Step 3: Create `src/init/wizard.ts`**

```typescript
import { createInterface } from 'node:readline/promises';
import type { ProjectType } from './types.js';

const VALID_TYPES: ProjectType[] = ['cli', 'frontend', 'lib', 'fullstack'];

export function validateProjectName(name: string): true | string {
  if (!name) return 'Project name is required';
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    return 'Project name must be lowercase letters, numbers, and hyphens only';
  return true;
}

export function validateProjectType(type: string): true | string {
  if (!VALID_TYPES.includes(type as ProjectType)) {
    return `Invalid type. Choose one of: ${VALID_TYPES.join(', ')}`;
  }
  return true;
}

export interface WizardResult {
  name: string;
  type: ProjectType;
}

export async function runWizard(): Promise<WizardResult> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write("\nLun'Atar — New Project\n\n");

  let name = '';
  while (true) {
    name = (await rl.question('Project name (lowercase-hyphen): ')).trim();
    const valid = validateProjectName(name);
    if (valid === true) break;
    process.stdout.write(`  ✗ ${valid}\n`);
  }

  process.stdout.write(`\nProject type:\n  1) cli\n  2) frontend\n  3) lib\n  4) fullstack\n`);
  let type: ProjectType = 'cli';
  while (true) {
    const input = (await rl.question('Type (cli/frontend/lib/fullstack): ')).trim();
    const valid = validateProjectType(input);
    if (valid === true) {
      type = input as ProjectType;
      break;
    }
    process.stdout.write(`  ✗ ${valid}\n`);
  }

  rl.close();
  return { name, type };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/init/wizard.test.ts
```

Expected: PASS

- [ ] **Step 5: Wire wizard into `init.ts`**

Read `src/cli/commands/init.ts` first, then modify `initCommand` so that when `opts.name` or `opts.type` is absent, the wizard runs:

```typescript
import { runWizard } from '../../init/wizard.js';
import type { ProjectType } from '../../init/types.js';

export async function initCommand(opts: {
  name?: string;
  type?: string;
  skipInstall?: boolean;
  dir?: string;
}): Promise<void> {
  let name = opts.name;
  let type = opts.type as ProjectType | undefined;

  if (!name || !type) {
    const result = await runWizard();
    name ??= result.name;
    type ??= result.type;
  }

  const targetDir = opts.dir ?? `./${name}`;
  await scaffold({ name, type, targetDir, skipInstall: opts.skipInstall });
}
```

- [ ] **Step 6: Build and smoke test**

```bash
npm run build
node dist/index.js init --name test-proj --type cli --dir /tmp/test-proj --skip-install
```

Expected: scaffold creates files in `/tmp/test-proj` including `lunatar.config.json` and `README.md`

- [ ] **Step 7: Commit**

```bash
git add src/init/wizard.ts src/cli/commands/init.ts tests/init/wizard.test.ts
git commit -m "feat(init): add interactive wizard when --name or --type flags are absent"
```

---

## Task 7 — Full test run + PR

- [ ] **Step 1: Run full test suite**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all pass

- [ ] **Step 2: Open PR**

```bash
git push -u origin feat/scaffold-hardening
gh pr create --title "feat(init): harden scaffold with wizard, config, fullstack, readme" \
  --body "Closes scaffold gaps: interactive wizard, lunatar.config.json generation, fullstack (Next.js 15), README.md, post-scaffold guidance, CI template fixed to master."
```
