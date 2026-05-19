import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises');

import { mkdir } from 'node:fs/promises';
import { createDirectoryPlugin } from '../../../src/plugins/catalog/create-directory.js';

const mockMkdir = vi.mocked(mkdir);
const CTX = { runId: 'r1', outputDir: '/out', cwd: '/project' };

beforeEach(() => {
  vi.resetAllMocks();
  mockMkdir.mockResolvedValue(undefined);
});

describe('createDirectoryPlugin', () => {
  it('creates directory recursively and returns confirmation', async () => {
    const result = await createDirectoryPlugin.handler({ path: 'src/utils' }, CTX);
    expect(result).toContain('src/utils');
    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('src'), { recursive: true });
  });

  it('resolves path relative to context.cwd', async () => {
    await createDirectoryPlugin.handler({ path: 'new-dir' }, CTX);
    const { join } = await import('node:path');
    expect(mockMkdir).toHaveBeenCalledWith(join('/project', 'new-dir'), { recursive: true });
  });

  it('returns error message on failure', async () => {
    mockMkdir.mockRejectedValue(new Error('EACCES: permission denied'));
    const result = await createDirectoryPlugin.handler({ path: '/root/nope' }, CTX);
    expect(result).toContain('Error');
    expect(result).toContain('EACCES');
  });

  it('has role "all" and id "create_directory"', () => {
    expect(createDirectoryPlugin.id).toBe('create_directory');
    expect(createDirectoryPlugin.role).toBe('all');
  });
});
