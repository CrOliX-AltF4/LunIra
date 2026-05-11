import type { AgentRole } from '../types/index.js';

export interface ProjectConfig {
  skills: Partial<Record<AgentRole | 'all', string[]>>;
  plugins: Partial<Record<AgentRole | 'all', string[]>>;
  models?: Partial<Record<AgentRole, string>>;
}
