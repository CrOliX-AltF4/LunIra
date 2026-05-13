import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const deps = {
  execAsync,
};

export async function gatherWorkspaceContext(cwd: string): Promise<string> {
  const lines: string[] = ['[Workspace context]'];

  try {
    const raw = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as {
      name?: string;
      version?: string;
      description?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const name = pkg.name ?? '(unnamed)';
    const version = pkg.version ?? '?';
    const desc = pkg.description ? ` — ${pkg.description}` : '';
    const depCount =
      Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
    lines.push(`Project: ${name} v${version}${desc} (${depCount.toString()} deps)`);
  } catch {
    lines.push(`Project directory: ${basename(cwd) || cwd}`);
  }

  try {
    const { stdout } = await deps.execAsync('git status --short', { cwd });
    const changed = stdout.trim().split('\n').filter(Boolean);
    if (changed.length === 0) {
      lines.push('Git: clean');
    } else {
      const shown = changed.slice(0, 10).join(', ');
      const extra = changed.length > 10 ? ` (+${(changed.length - 10).toString()} more)` : '';
      lines.push(`Git changes: ${shown}${extra}`);
    }
  } catch {
    // not a git repo — omit git block
  }

  return lines.join('\n');
}
