import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectConfig } from './types.js';

export const defaultConfig: ProjectConfig = {
  skills: { external: [] },
  plugins: { external: [] },
};

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig> {
  const configPath = join(cwd, 'lunatar.config.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ...defaultConfig };
    }
    const parsed = value as Partial<ProjectConfig>;
    return {
      skills: {
        ...parsed.skills,
        external: parsed.skills?.external ?? [],
      },
      plugins: {
        ...parsed.plugins,
        external: parsed.plugins?.external ?? [],
      },
      ...(parsed.models ? { models: parsed.models } : {}),
    };
  } catch {
    return { ...defaultConfig };
  }
}
