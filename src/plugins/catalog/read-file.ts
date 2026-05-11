import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from '../types.js';

interface ReadFileInput {
  path: string;
}

export const readFilePlugin: Plugin = {
  id: 'read_file',
  name: 'Read File',
  role: 'all',
  tool: {
    name: 'read_file',
    description: 'Read an existing file from the project directory for context.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from the project root' },
      },
      required: ['path'],
    },
  },
  async handler(input, context) {
    const { path } = input as ReadFileInput;
    const absPath = resolve(context.cwd, path);
    try {
      const content = await readFile(absPath, 'utf-8');
      return content.slice(0, 8000);
    } catch {
      return `Error: could not read "${path}"`;
    }
  },
};
