import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ScaffoldOptions, ScaffoldFile, ProjectType } from './types.js';
import { PROJECT_TYPE_STACKS } from './types.js';
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
} from './templates/core.js';
import * as cliTemplates from './templates/cli.js';
import * as frontendTemplates from './templates/frontend.js';
import * as libTemplates from './templates/lib.js';

const exec = promisify(execFile);

// ─── File list builders ───────────────────────────────────────────────────────

function coreFiles(name: string, type: ProjectType): ScaffoldFile[] {
  const stack = PROJECT_TYPE_STACKS[type];
  return [
    { path: '.github/AGENTS.md', content: agentsMd(name, type, stack) },
    { path: 'CLAUDE.md', content: claudeMd(name, type, stack) },
    { path: '.github/workflows/ci.yml', content: ciYml() },
    { path: '.gitignore', content: gitignore() },
    { path: '.env.example', content: envExample() },
    { path: 'eslint.config.js', content: eslintConfig() },
    { path: '.prettierrc', content: prettierRc() },
    { path: 'commitlint.config.cjs', content: commitlintConfig() },
    { path: '.husky/pre-commit', content: huskyPreCommit() },
    { path: '.husky/commit-msg', content: huskyCommitMsg() },
    { path: 'tsconfig.test.json', content: tsconfigTest() },
    { path: 'tests/.gitkeep', content: '' },
  ];
}

function layerFiles(name: string, type: ProjectType): ScaffoldFile[] {
  switch (type) {
    case 'cli':
      return [
        { path: 'package.json', content: cliTemplates.packageJson(name) },
        { path: 'tsconfig.json', content: cliTemplates.tsconfig() },
        { path: 'tsup.config.ts', content: cliTemplates.tsupConfig() },
        { path: 'vitest.config.ts', content: vitestConfig('src/cli/index.ts') },
        { path: 'src/cli/index.ts', content: cliTemplates.srcCliIndex(name) },
        { path: 'src/index.ts', content: cliTemplates.srcIndex() },
      ];

    case 'frontend':
      return [
        { path: 'package.json', content: frontendTemplates.packageJson(name) },
        { path: 'tsconfig.json', content: frontendTemplates.tsconfig() },
        { path: 'vite.config.ts', content: frontendTemplates.viteConfig() },
        { path: 'vitest.config.ts', content: vitestConfig() },
        { path: 'index.html', content: frontendTemplates.indexHtml(name) },
        { path: 'src/main.tsx', content: frontendTemplates.srcMain() },
        { path: 'src/App.tsx', content: frontendTemplates.srcApp(name) },
        { path: 'src/App.module.css', content: frontendTemplates.srcAppCss() },
      ];

    case 'lib':
      return [
        { path: 'package.json', content: libTemplates.packageJson(name) },
        { path: 'tsconfig.json', content: libTemplates.tsconfig() },
        { path: 'tsup.config.ts', content: libTemplates.tsupConfig() },
        { path: 'vitest.config.ts', content: vitestConfig() },
        { path: 'src/index.ts', content: libTemplates.srcIndex() },
      ];

    case 'fullstack':
      throw new Error(
        'fullstack scaffold is not yet implemented.\n' +
          'Hint: use `npx create-next-app@latest` then add AGENTS.md and CLAUDE.md manually.',
      );
  }
}

// ─── Scaffold ─────────────────────────────────────────────────────────────────

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { name, type, targetDir, skipInstall = false } = options;

  if (existsSync(targetDir)) {
    const entries = readdirSync(targetDir);
    const nonHidden = entries.filter((e) => !e.startsWith('.') && e !== '.git');
    if (nonHidden.length > 0) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty.\n` +
          'Choose a different name or run from an empty directory.',
      );
    }
  }

  const files = [...coreFiles(name, type), ...layerFiles(name, type)];

  process.stdout.write(`\nScaffolding ${type} project "${name}" in ${targetDir}\n\n`);

  // Write files
  for (const file of files) {
    const absPath = join(targetDir, file.path);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, file.content, 'utf-8');
    process.stdout.write(`  + ${file.path}\n`);
  }

  // Make husky hooks executable (ignored on Windows but harmless)
  try {
    await chmod(join(targetDir, '.husky/pre-commit'), 0o755);
    await chmod(join(targetDir, '.husky/commit-msg'), 0o755);
  } catch {
    // Non-fatal on Windows
  }

  // git init
  process.stdout.write('\n  git init\n');
  await exec('git', ['init'], { cwd: targetDir });

  // npm install
  if (!skipInstall) {
    process.stdout.write('  npm install  (this may take a minute…)\n');
    await exec('npm', ['install'], { cwd: targetDir });
  }

  // Initial commit
  await exec('git', ['add', '.'], { cwd: targetDir });
  await exec(
    'git',
    ['commit', '-m', 'chore: init project scaffold\n\nGenerated by lunatar init.'],
    {
      cwd: targetDir,
    },
  );

  process.stdout.write('\n');
}
