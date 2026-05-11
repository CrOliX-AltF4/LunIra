import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Plugin } from '../types.js';

interface FileWriteInput {
  path: string;
  content: string;
}

export const fileWritePlugin: Plugin = {
  id: 'file_write',
  name: 'Write File',
  role: 'dev',
  tool: {
    name: 'file_write',
    description: 'Write a file to the output directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path within the output directory' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['path', 'content'],
    },
  },
  async handler(input, context) {
    const { path, content } = input as FileWriteInput;
    const absPath = join(context.outputDir, path);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, content, 'utf-8');
    return `Written: ${path}`;
  },
};
