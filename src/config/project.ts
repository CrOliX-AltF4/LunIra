import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import Ajv from 'ajv';
import { projectConfigSchema } from './schema.js';
import type { ProjectConfig } from './types.js';

export const defaultConfig: ProjectConfig = {
  skills: { external: [] },
  plugins: { external: [] },
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(projectConfigSchema);

export async function loadProjectConfig(cwd: string): Promise<ProjectConfig> {
  const configPath = await findConfig(cwd);
  if (!configPath) return { ...defaultConfig };

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    return { ...defaultConfig };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    process.stderr.write(`lunatar: invalid JSON in ${configPath}\n`);
    return { ...defaultConfig };
  }

  if (!validate(value)) {
    const errors = validate.errors
      ?.map((e) => `  ${e.instancePath || '(root)'} ${e.message ?? ''}`)
      .join('\n');
    process.stderr.write(`lunatar: invalid config at ${configPath}:\n${errors ?? ''}\n`);
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
    providers: {
      fallback: parsed.providers?.fallback ?? [],
    },
  };
}

// Walk up from cwd, stop at the first directory containing package.json.
async function findConfig(startDir: string): Promise<string | null> {
  let dir = startDir;
  let parent = dirname(dir);

  while (parent !== dir) {
    const configPath = join(dir, 'lunatar.config.json');
    try {
      await readFile(configPath, 'utf-8');
      return configPath;
    } catch {
      // not here
    }

    // Stop when we leave the package.json boundary
    try {
      await readFile(join(dir, 'package.json'), 'utf-8');
      return null; // found package.json but no lunatar.config.json here — stop
    } catch {
      // no package.json here, keep going up
    }

    dir = parent;
    parent = dirname(dir);
  }

  // Check the filesystem root itself
  const configPath = join(dir, 'lunatar.config.json');
  try {
    await readFile(configPath, 'utf-8');
    return configPath;
  } catch {
    return null;
  }
}
