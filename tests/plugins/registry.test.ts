import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../../src/plugins/registry.js';

describe('PluginRegistry', () => {
  it('has all 4 built-in plugins', () => {
    const registry = new PluginRegistry();
    const names = registry.getAll().map((p) => p.id);
    expect(names).toContain('file_write');
    expect(names).toContain('read_file');
    expect(names).toContain('web_search');
    expect(names).toContain('github_create_issue');
  });

  it('forRole("dev") includes file_write and read_file', () => {
    const registry = new PluginRegistry();
    const ids = registry.forRole('dev').map((p) => p.id);
    expect(ids).toContain('file_write');
    expect(ids).toContain('read_file');
  });

  it('getById returns the correct plugin', () => {
    const registry = new PluginRegistry();
    expect(registry.getById('file_write')).toBeDefined();
    expect(registry.getById('file_write')?.id).toBe('file_write');
  });

  it('getById returns undefined for unknown id', () => {
    const registry = new PluginRegistry();
    expect(registry.getById('nonexistent')).toBeUndefined();
  });

  it('each plugin has a valid JSON Schema inputSchema', () => {
    const registry = new PluginRegistry();
    for (const plugin of registry.getAll()) {
      expect(plugin.tool.inputSchema).toHaveProperty('type', 'object');
      expect(plugin.tool.inputSchema).toHaveProperty('properties');
    }
  });
});
