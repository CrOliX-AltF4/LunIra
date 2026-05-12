import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadExternalSkill } from '../../src/skills/loader.js';

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `lunatar-skill-test-${String(Date.now())}`);
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
