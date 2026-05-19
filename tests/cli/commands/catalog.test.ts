import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/skills/registry.js', () => ({
  SkillRegistry: class {
    getAll() {
      return [
        {
          id: 'typescript-strict',
          name: 'TypeScript Strict',
          role: 'all',
          cacheable: true,
          content: '',
          tokenEstimate: 100,
        },
        {
          id: 'react-css-modules',
          name: 'React + CSS Modules',
          role: 'dev',
          cacheable: true,
          content: '',
          tokenEstimate: 80,
        },
      ];
    }
  },
}));

vi.mock('../../../src/plugins/registry.js', () => ({
  PluginRegistry: class {
    getAll() {
      return [
        {
          id: 'file_write',
          name: 'Write File',
          role: 'dev',
          tool: {},
          handler: () => Promise.resolve(''),
        },
        {
          id: 'run_command',
          name: 'Run Command',
          role: 'dev',
          tool: {},
          handler: () => Promise.resolve(''),
        },
      ];
    }
  },
}));

import { catalogCommand } from '../../../src/cli/commands/catalog.js';

describe('catalogCommand', () => {
  let output: string;

  beforeEach(() => {
    output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('prints skills section with count', () => {
    catalogCommand();
    expect(output).toContain('Skills (2)');
  });

  it('prints each skill id and name', () => {
    catalogCommand();
    expect(output).toContain('typescript-strict');
    expect(output).toContain('TypeScript Strict');
  });

  it('prints plugins section with count', () => {
    catalogCommand();
    expect(output).toContain('Plugins (2)');
  });

  it('prints each plugin id and name', () => {
    catalogCommand();
    expect(output).toContain('file_write');
    expect(output).toContain('Write File');
  });

  it('shows role for each entry', () => {
    catalogCommand();
    expect(output).toContain('all');
    expect(output).toContain('dev');
  });
});
