import { describe, it, expect } from 'vitest';
import { loadProjectConfig } from '../../src/config/project.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('project config — external field', () => {
  it('parses external plugin and skill paths from lunatar.config.json', async () => {
    const dir = join(tmpdir(), `lunatar-test-${String(Date.now())}`);
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
    const dir = join(tmpdir(), `lunatar-test-${String(Date.now())}`);
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
