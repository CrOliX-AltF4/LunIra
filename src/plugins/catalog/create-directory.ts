import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from '../types.js';

interface CreateDirectoryInput {
  path: string;
}

export const createDirectoryPlugin: Plugin = {
  id: 'create_directory',
  name: 'Create Directory',
  role: 'all',
  tool: {
    name: 'create_directory',
    description: 'Create a directory (and any missing parents) relative to the project root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to cwd' },
      },
      required: ['path'],
    },
  },
  async handler(input, context) {
    const { path } = input as CreateDirectoryInput;
    try {
      await mkdir(join(context.cwd, path), { recursive: true });
      return `Created directory: ${path}`;
    } catch (e) {
      return `Error creating "${path}": ${String(e instanceof Error ? e.message : e)}`;
    }
  },
};
