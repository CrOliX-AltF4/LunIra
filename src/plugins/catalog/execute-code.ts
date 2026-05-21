import { spawn } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Plugin } from '../types.js';

interface ExecuteCodeInput {
  file: string;
  args?: string[];
  timeoutMs?: number;
}

interface ExecuteCodeOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export const executeCodePlugin: Plugin = {
  id: 'execute_code',
  name: 'Execute Code',
  role: 'qa',
  tool: {
    name: 'execute_code',
    description:
      'Execute a file in an isolated subprocess. Returns stdout, stderr, exit code, and duration. Use to validate that generated code runs without errors.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Absolute or relative path to the file to execute' },
        args: { type: 'array', items: { type: 'string' }, description: 'CLI arguments to pass' },
        timeoutMs: {
          type: 'number',
          description: 'Execution timeout in milliseconds (default: 10000)',
        },
      },
      required: ['file'],
    },
  },
  async handler(input, context): Promise<string> {
    const { file, args = [], timeoutMs = 10_000 } = input as ExecuteCodeInput;
    const tmpFile = join(tmpdir(), `lunatar-exec-${randomUUID()}-${basename(file)}`);

    try {
      await copyFile(file, tmpFile);
    } catch (err) {
      return JSON.stringify({
        stdout: '',
        stderr: `Could not copy file: ${String(err)}`,
        exitCode: 1,
        durationMs: 0,
      } satisfies ExecuteCodeOutput);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    const start = Date.now();

    return new Promise<string>((resolve) => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      const child = spawn(process.execPath, [tmpFile, ...args], {
        cwd: context.cwd,
        signal: controller.signal,
        stdio: ['ignore', 'pipe', 'pipe'] as const,
      });

      /* eslint-disable @typescript-eslint/no-unnecessary-condition */
      child.stdout?.on('data', (d: Buffer) => stdoutChunks.push(d.toString()));
      child.stderr?.on('data', (d: Buffer) => stderrChunks.push(d.toString()));
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - start;
        const result: ExecuteCodeOutput = {
          stdout: stdoutChunks.join('').slice(0, 4096),
          stderr: stderrChunks.join('').slice(0, 4096),
          exitCode: code ?? 1,
          durationMs,
        };
        rm(tmpFile, { force: true }).catch(() => undefined);
        resolve(JSON.stringify(result));
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Date.now() - start;
        const isTimeout = controller.signal.aborted;
        const result: ExecuteCodeOutput = {
          stdout: stdoutChunks.join(''),
          stderr: isTimeout ? `Execution timed out after ${timeoutMs.toString()}ms` : err.message,
          exitCode: 1,
          durationMs,
        };
        rm(tmpFile, { force: true }).catch(() => undefined);
        resolve(JSON.stringify(result));
      });
    });
  },
};
