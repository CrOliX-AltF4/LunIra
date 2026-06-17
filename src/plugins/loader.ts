import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type { Plugin, PluginTier } from './types.js';

type PluginShape = Omit<Plugin, 'tier'>;

function isValidPlugin(value: unknown): value is PluginShape {
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

const VALID_TIERS = new Set<string>(['safe', 'restricted', 'dangerous']);

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

  const raw = plugin as Record<string, unknown>;
  const tier: PluginTier =
    typeof raw['tier'] === 'string' && VALID_TIERS.has(raw['tier'])
      ? (raw['tier'] as PluginTier)
      : 'restricted';

  return { ...plugin, tier };
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
