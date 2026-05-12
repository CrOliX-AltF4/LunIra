import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type { Plugin } from './types.js';

function isValidPlugin(value: unknown): value is Plugin {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p['id'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['role'] === 'string' &&
    typeof p['tool'] === 'object' &&
    p['tool'] !== null &&
    typeof p['handler'] === 'function'
  );
}

export async function loadExternalPlugin(ref: string, cwd = process.cwd()): Promise<Plugin> {
  const isLocalPath = ref.startsWith('.') || ref.startsWith('/');
  const absPath = ref.startsWith('.') ? resolve(cwd, ref) : ref;

  if (isLocalPath && !existsSync(absPath)) {
    throw new Error(`External plugin not found: ${absPath}`);
  }

  const mod = (await import(absPath)) as { plugin?: unknown };
  const plugin = mod.plugin;

  if (!isValidPlugin(plugin)) {
    throw new Error(`Invalid plugin at "${ref}": must export { id, name, role, tool, handler }`);
  }

  return plugin;
}

export async function discoverNpmPlugins(cwd = process.cwd()): Promise<Plugin[]> {
  const nodeModules = resolve(cwd, 'node_modules');
  if (!existsSync(nodeModules)) return [];

  const entries = readdirSync(nodeModules);
  const pluginPkgs = entries.filter((e) => e.startsWith('lunatar-plugin-'));

  const loaded: Plugin[] = [];
  for (const pkg of pluginPkgs) {
    try {
      const plugin = await loadExternalPlugin(pkg, cwd);
      loaded.push(plugin);
    } catch {
      // Skip invalid packages silently
    }
  }
  return loaded;
}
