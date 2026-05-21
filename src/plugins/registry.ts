import type { AgentRole } from '../types/index.js';
import type { Plugin } from './types.js';
import { fileWritePlugin } from './catalog/file-write.js';
import { readFilePlugin } from './catalog/read-file.js';
import { webSearchPlugin } from './catalog/web-search.js';
import { githubCreateIssuePlugin } from './catalog/github-create-issue.js';
import { runCommandPlugin } from './catalog/run-command.js';
import { listDirectoryPlugin } from './catalog/list-directory.js';
import { createDirectoryPlugin } from './catalog/create-directory.js';
import { executeCodePlugin } from './catalog/execute-code.js';

const CATALOG: Plugin[] = [
  fileWritePlugin,
  readFilePlugin,
  webSearchPlugin,
  githubCreateIssuePlugin,
  runCommandPlugin,
  listDirectoryPlugin,
  createDirectoryPlugin,
  executeCodePlugin,
];

export class PluginRegistry {
  private readonly plugins: Plugin[];

  constructor(externals: Plugin[] = []) {
    this.plugins = [...CATALOG, ...externals];
  }

  getAll(): Plugin[] {
    return this.plugins;
  }

  getById(id: string): Plugin | undefined {
    return this.plugins.find((p) => p.id === id);
  }

  forRole(role: AgentRole): Plugin[] {
    return this.plugins.filter((p) => p.role === role || p.role === 'all');
  }
}
