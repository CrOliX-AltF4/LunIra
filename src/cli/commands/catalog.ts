import { SkillRegistry } from '../../skills/registry.js';
import { PluginRegistry } from '../../plugins/registry.js';

export function catalogCommand(): void {
  const skills = new SkillRegistry().getAll();
  const plugins = new PluginRegistry().getAll();

  const pad = (s: string, n: number) => s.padEnd(n);

  process.stdout.write(`\nSkills (${String(skills.length)}):\n`);
  for (const skill of skills) {
    process.stdout.write(`  ${pad(skill.id, 28)} [${pad(skill.role, 8)}]  ${skill.name}\n`);
  }

  process.stdout.write(`\nPlugins (${String(plugins.length)}):\n`);
  for (const plugin of plugins) {
    process.stdout.write(`  ${pad(plugin.id, 28)} [${pad(plugin.role, 8)}]  ${plugin.name}\n`);
  }

  process.stdout.write('\n');
}
