import type { AgentRole } from '../types/index.js';
import type { Plugin } from './types.js';
import { fileWritePlugin } from './catalog/file-write.js';
import { readFilePlugin } from './catalog/read-file.js';
import { webSearchPlugin } from './catalog/web-search.js';
import { githubCreateIssuePlugin } from './catalog/github-create-issue.js';

const CATALOG: Plugin[] = [
  fileWritePlugin,
  readFilePlugin,
  webSearchPlugin,
  githubCreateIssuePlugin,
];

export class PluginRegistry {
  private readonly plugins = CATALOG;

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
