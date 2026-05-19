import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process');

import { exec } from 'node:child_process';
import { runCommandPlugin } from '../../../src/plugins/catalog/run-command.js';

const mockExec = vi.mocked(exec);
const CTX = { runId: 'r1', outputDir: '/out', cwd: '/project' };

function mockExecResult(stdout: string, stderr = '') {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, cb: unknown) => {
    (cb as (err: null, stdout: string, stderr: string) => void)(null, stdout, stderr);
    return {} as ReturnType<typeof exec>;
  });
}

function mockExecError(message: string) {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, cb: unknown) => {
    (cb as (err: Error) => void)(new Error(message));
    return {} as ReturnType<typeof exec>;
  });
}

beforeEach(() => vi.resetAllMocks());

describe('runCommandPlugin', () => {
  it('returns stdout on success', async () => {
    mockExecResult('hello world\n');
    const result = await runCommandPlugin.handler({ command: 'echo hello world' }, CTX);
    expect(result).toContain('hello world');
  });

  it('includes stderr in output when non-empty', async () => {
    mockExecResult('', 'warning: something\n');
    const result = await runCommandPlugin.handler({ command: 'make' }, CTX);
    expect(result).toContain('warning: something');
  });

  it('returns error message when command fails', async () => {
    mockExecError('command not found: foo');
    const result = await runCommandPlugin.handler({ command: 'foo' }, CTX);
    expect(result).toContain('Error');
    expect(result).toContain('command not found');
  });

  it('runs in context.cwd', async () => {
    mockExecResult('');
    await runCommandPlugin.handler({ command: 'ls' }, CTX);
    expect(mockExec).toHaveBeenCalledWith(
      'ls',
      expect.objectContaining({ cwd: '/project' }),
      expect.any(Function),
    );
  });

  it('has role "dev" and id "run_command"', () => {
    expect(runCommandPlugin.id).toBe('run_command');
    expect(runCommandPlugin.role).toBe('dev');
  });
});
