import type { AgentRole } from '../types/index.js';

export interface SkillsConfig extends Partial<Record<AgentRole | 'all', string[]>> {
  external?: string[];
}

export interface PluginsConfig extends Partial<Record<AgentRole | 'all', string[]>> {
  external?: string[];
}

export interface ProjectConfig {
  skills: SkillsConfig;
  plugins: PluginsConfig;
  models?: Partial<Record<AgentRole, string>>;
}
