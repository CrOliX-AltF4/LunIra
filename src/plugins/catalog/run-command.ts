import { exec } from 'node:child_process';
import type { Plugin } from '../types.js';

interface RunCommandInput {
  command: string;
}

export const runCommandPlugin: Plugin = {
  id: 'run_command',
  name: 'Run Command',
  role: 'dev',
  tool: {
    name: 'run_command',
    description: 'Run a shell command in the project directory and return its output.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      required: ['command'],
    },
  },
  async handler(input, context) {
    const { command } = input as RunCommandInput;
    return new Promise<string>((resolve) => {
      exec(command, { cwd: context.cwd }, (err, stdout, stderr) => {
        if (err) {
          resolve(`Error running "${command}": ${err.message}`);
          return;
        }
        const out = stdout.trim();
        const errStr = stderr.trim();
        if (out && errStr) {
          resolve(`${out}\n[stderr] ${errStr}`);
          return;
        }
        if (errStr) {
          resolve(`[stderr] ${errStr}`);
          return;
        }
        resolve(out || '(no output)');
      });
    });
  },
};
