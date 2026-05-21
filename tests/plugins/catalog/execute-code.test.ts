import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process');
vi.mock('node:fs/promises');

import { spawn } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import { executeCodePlugin } from '../../../src/plugins/catalog/execute-code.js';

const mockSpawn = vi.mocked(spawn);
const mockCopyFile = vi.mocked(copyFile);
const mockRm = vi.mocked(rm);

const CTX = { runId: 'r1', outputDir: '/out', cwd: '/project' };

type SpawnReturn = ReturnType<typeof spawn>;

function makeChild(exitCode: number, stdout = '', stderr = '') {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const child = {
    stdout: {
      on: (event: string, cb: (data: Buffer) => void) => {
        if (event === 'data' && stdout)
          setTimeout(() => {
            cb(Buffer.from(stdout));
          }, 0);
      },
    },
    stderr: {
      on: (event: string, cb: (data: Buffer) => void) => {
        if (event === 'data' && stderr)
          setTimeout(() => {
            cb(Buffer.from(stderr));
          }, 0);
      },
    },
    on: (event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      if (event === 'close')
        setTimeout(() => {
          cb(exitCode);
        }, 5);
    },
  };
  return child as unknown as SpawnReturn;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCopyFile.mockResolvedValue(undefined);
  mockRm.mockResolvedValue(undefined);
});

describe('executeCodePlugin', () => {
  it('has id execute_code and role qa', () => {
    expect(executeCodePlugin.id).toBe('execute_code');
    expect(executeCodePlugin.role).toBe('qa');
  });

  it('returns stdout and exitCode 0 on success', async () => {
    mockSpawn.mockReturnValue(makeChild(0, 'hello world\n'));
    const raw = await executeCodePlugin.handler({ file: '/tmp/test.js' }, CTX);
    const result = JSON.parse(raw) as { exitCode: number; stdout: string };
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello world');
  });

  it('returns exitCode 1 and stderr on crash', async () => {
    mockSpawn.mockReturnValue(makeChild(1, '', 'ReferenceError: x is not defined'));
    const raw = await executeCodePlugin.handler({ file: '/tmp/bad.js' }, CTX);
    const result = JSON.parse(raw) as { exitCode: number; stderr: string };
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ReferenceError');
  });

  it('returns error output when copyFile fails', async () => {
    mockCopyFile.mockRejectedValue(new Error('ENOENT'));
    const raw = await executeCodePlugin.handler({ file: '/nonexistent/file.js' }, CTX);
    const result = JSON.parse(raw) as { exitCode: number; stderr: string };
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Could not copy file');
  });

  it('cleans up tmp file after execution', async () => {
    mockSpawn.mockReturnValue(makeChild(0));
    await executeCodePlugin.handler({ file: '/tmp/test.js' }, CTX);
    expect(mockRm).toHaveBeenCalledWith(expect.stringContaining('lunatar-exec-'), { force: true });
  });

  it('passes args to spawn', async () => {
    mockSpawn.mockReturnValue(makeChild(0));
    await executeCodePlugin.handler({ file: '/tmp/test.js', args: ['--flag', 'val'] }, CTX);
    expect(mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['--flag', 'val']),
      expect.any(Object),
    );
  });
});
