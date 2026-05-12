import { readFile, access } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import type { Skill } from './types.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export async function loadExternalSkill(ref: string, cwd = process.cwd()): Promise<Skill> {
  const absPath = ref.startsWith('.') ? resolve(cwd, ref) : ref;

  await access(absPath); // throws ENOENT if not found

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
