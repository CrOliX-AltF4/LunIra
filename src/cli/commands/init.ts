import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { scaffold } from '../../init/scaffolder.js';
import { VALID_PROJECT_TYPES, PROJECT_TYPE_STACKS } from '../../init/types.js';
import type { ProjectType } from '../../init/types.js';

// ─── Interactive prompt ───────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

function isProjectType(value: string): value is ProjectType {
  return (VALID_PROJECT_TYPES as string[]).includes(value);
}

// ─── Command ──────────────────────────────────────────────────────────────────

interface InitOptions {
  name?: string;
  type?: string;
  skipInstall?: boolean;
  dir?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  // ── Resolve name ────────────────────────────────────────────────────────────
  let name = options.name?.trim() ?? '';

  if (!name) {
    name = await prompt('Project name: ');
  }

  if (!isValidName(name)) {
    process.stderr.write(
      `Invalid project name "${name}". Use lowercase letters, numbers, and hyphens only.\n`,
    );
    process.exit(1);
  }

  // ── Resolve type ────────────────────────────────────────────────────────────
  let type = options.type?.trim().toLowerCase() ?? '';

  if (!type) {
    process.stdout.write('\nAvailable types:\n');
    for (const t of VALID_PROJECT_TYPES) {
      process.stdout.write(`  ${t.padEnd(12)} ${PROJECT_TYPE_STACKS[t]}\n`);
    }
    type = await prompt('\nProject type: ');
  }

  if (!isProjectType(type)) {
    process.stderr.write(
      `Invalid project type "${type}". Valid types: ${VALID_PROJECT_TYPES.join(', ')}\n`,
    );
    process.exit(1);
  }

  // ── Resolve target directory ─────────────────────────────────────────────────
  const targetDir = options.dir ? resolve(options.dir) : resolve(join(process.cwd(), name));

  // ── Scaffold ─────────────────────────────────────────────────────────────────
  try {
    await scaffold({
      name,
      type,
      targetDir,
      skipInstall: options.skipInstall ?? false,
    });

    process.stdout.write(`✓ Project "${name}" ready at ${targetDir}\n\n`);
    process.stdout.write('Next steps:\n');
    process.stdout.write(`  cd ${name}\n`);
    if (options.skipInstall) {
      process.stdout.write(`  npm install\n`);
    }
    process.stdout.write(`  cp .env.example .env   # add your API keys\n`);
    process.stdout.write(`  lunatar run "your first feature"\n\n`);

    if (type !== 'fullstack') {
      process.stdout.write('GitHub: gh repo create ' + name + ' --public --source=. --push\n\n');
    }
  } catch (err) {
    process.stderr.write(`Error: ${String(err instanceof Error ? err.message : err)}\n`);
    process.exit(1);
  }
}
