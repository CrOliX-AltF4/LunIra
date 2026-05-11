import { describe, it, expect } from 'vitest';
import { loadProjectConfig, defaultConfig } from '../../src/config/project.js';

describe('loadProjectConfig', () => {
  it('returns defaultConfig when no lunatar.config.json exists', async () => {
    const config = await loadProjectConfig('/nonexistent/path');
    expect(config).toEqual(defaultConfig);
  });

  it('merges partial config with defaults', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(
        join(dir, 'lunatar.config.json'),
        JSON.stringify({ skills: { dev: ['typescript-strict'] } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.skills.dev).toContain('typescript-strict');
      expect(config.plugins).toEqual(defaultConfig.plugins);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns defaultConfig on invalid JSON', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(join(dir, 'lunatar.config.json'), 'not json');
      const config = await loadProjectConfig(dir);
      expect(config).toEqual(defaultConfig);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('parses models field when provided', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(
        join(dir, 'lunatar.config.json'),
        JSON.stringify({ models: { dev: 'llama-3.3-70b-versatile' } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.models?.dev).toBe('llama-3.3-70b-versatile');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns defaultConfig when config is not a plain object', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(join(dir, 'lunatar.config.json'), '"a string"');
      const config = await loadProjectConfig(dir);
      expect(config).toEqual(defaultConfig);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
