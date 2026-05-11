import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import type { PipelineRun } from '../types/index.js';

// ─── Paths ────────────────────────────────────────────────────────────────────

const RUNS_DIR = join(homedir(), '.lunatar', 'runs');

async function ensureDir(): Promise<void> {
  await mkdir(RUNS_DIR, { recursive: true });
}

function runPath(id: string): string {
  return join(RUNS_DIR, `${id}.json`);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveRun(run: PipelineRun): Promise<void> {
  await ensureDir();
  await writeFile(runPath(run.id), JSON.stringify(run, null, 2), 'utf8');
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function loadRun(id: string): Promise<PipelineRun | null> {
  try {
    const raw = await readFile(runPath(id), 'utf8');
    return JSON.parse(raw) as PipelineRun;
  } catch {
    return null;
  }
}

/**
 * Returns all persisted runs sorted by `createdAt` descending (newest first).
 * Silently skips files that cannot be parsed.
 */
export async function listRuns(): Promise<PipelineRun[]> {
  await ensureDir();

  let files: string[];
  try {
    files = await readdir(RUNS_DIR);
  } catch {
    return [];
  }

  const runs: PipelineRun[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await readFile(join(RUNS_DIR, file), 'utf8');
      runs.push(JSON.parse(raw) as PipelineRun);
    } catch {
      // corrupted file — skip silently
    }
  }

  return runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
