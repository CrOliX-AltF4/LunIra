import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from '../types.js';

interface ListDirectoryInput {
  path: string;
}

export const listDirectoryPlugin: Plugin = {
  id: 'list_directory',
  name: 'List Directory',
  role: 'all',
  tool: {
    name: 'list_directory',
    description: 'List the contents of a directory relative to the project root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to cwd' },
      },
      required: ['path'],
    },
  },
  async handler(input, context) {
    const { path } = input as ListDirectoryInput;
    try {
      const entries = await readdir(join(context.cwd, path));
      return entries.length > 0 ? entries.join('\n') : '(empty)';
    } catch (e) {
      return `Error listing "${path}": ${String(e instanceof Error ? e.message : e)}`;
    }
  },
};
