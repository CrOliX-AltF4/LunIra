import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeOutputFiles } from '../../src/cli/output-writer.js';
import { join } from 'node:path';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');

const mockMkdir = vi.mocked(fs.mkdir);
const mockWriteFile = vi.mocked(fs.writeFile);

beforeEach(() => {
  vi.resetAllMocks();
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});

describe('writeOutputFiles', () => {
  it('returns list of written relative paths', async () => {
    const files = [
      { path: 'src/index.ts', content: 'export {}', description: 'entry' },
      { path: 'README.md', content: '# Hello', description: 'readme' },
    ];
    const written = await writeOutputFiles(files, '/out');
    expect(written).toEqual(['src/index.ts', 'README.md']);
  });

  it('creates parent directory before writing each file', async () => {
    const files = [{ path: 'src/utils/helper.ts', content: '', description: '' }];
    await writeOutputFiles(files, '/out');
    expect(mockMkdir).toHaveBeenCalledWith(join('/out', 'src', 'utils'), { recursive: true });
  });

  it('writes content to the absolute path under outputDir', async () => {
    const files = [{ path: 'index.ts', content: 'hello', description: '' }];
    await writeOutputFiles(files, '/out');
    expect(mockWriteFile).toHaveBeenCalledWith(join('/out', 'index.ts'), 'hello', 'utf-8');
  });

  it('returns empty array for empty files list', async () => {
    const written = await writeOutputFiles([], '/out');
    expect(written).toEqual([]);
  });
});
