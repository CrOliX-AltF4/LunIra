import type { AgentRole } from '../types/index.js';

export interface Skill {
  id: string;
  name: string;
  role: AgentRole | 'all';
  content: string;
  tokenEstimate: number;
  cacheable: boolean;
}
