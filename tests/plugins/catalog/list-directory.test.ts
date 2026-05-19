import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises');

import { readdir } from 'node:fs/promises';
import { listDirectoryPlugin } from '../../../src/plugins/catalog/list-directory.js';

const mockReaddir = vi.mocked(readdir);
const CTX = { runId: 'r1', outputDir: '/out', cwd: '/project' };

beforeEach(() => vi.resetAllMocks());

describe('listDirectoryPlugin', () => {
  it('returns entries as newline-separated list', async () => {
    mockReaddir.mockResolvedValue(['index.ts', 'utils.ts', 'README.md'] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);
    const result = await listDirectoryPlugin.handler({ path: 'src' }, CTX);
    expect(result).toBe('index.ts\nutils.ts\nREADME.md');
  });

  it('resolves path relative to context.cwd', async () => {
    mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);
    await listDirectoryPlugin.handler({ path: 'src' }, CTX);
    const { join } = await import('node:path');
    expect(mockReaddir).toHaveBeenCalledWith(join('/project', 'src'));
  });

  it('returns "(empty)" for an empty directory', async () => {
    mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);
    const result = await listDirectoryPlugin.handler({ path: '.' }, CTX);
    expect(result).toBe('(empty)');
  });

  it('returns error message when directory does not exist', async () => {
    mockReaddir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const result = await listDirectoryPlugin.handler({ path: 'missing' }, CTX);
    expect(result).toContain('Error');
    expect(result).toContain('ENOENT');
  });

  it('has role "all" and id "list_directory"', () => {
    expect(listDirectoryPlugin.id).toBe('list_directory');
    expect(listDirectoryPlugin.role).toBe('all');
  });
});
