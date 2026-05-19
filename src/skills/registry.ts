import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentRole } from '../types/index.js';
import type { Skill } from './types.js';

const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), 'catalog');

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

function loadMd(filename: string): string {
  return readFileSync(join(CATALOG_DIR, filename), 'utf-8');
}

const CATALOG: Omit<Skill, 'content' | 'tokenEstimate'>[] = [
  { id: 'typescript-strict', name: 'TypeScript Strict', role: 'all', cacheable: true },
  { id: 'react-css-modules', name: 'React + CSS Modules', role: 'dev', cacheable: true },
  { id: 'conventional-commits', name: 'Conventional Commits', role: 'all', cacheable: true },
  { id: 'project-context', name: 'Project Context', role: 'all', cacheable: false },
  { id: 'laravel-conventions', name: 'Laravel Conventions', role: 'dev', cacheable: true },
  { id: 'test-conventions', name: 'Testing Conventions', role: 'all', cacheable: true },
  { id: 'api-design', name: 'REST API Design', role: 'all', cacheable: true },
  { id: 'i18n', name: 'Internationalisation', role: 'all', cacheable: true },
  { id: 'security', name: 'Security Best Practices', role: 'all', cacheable: true },
];

export class SkillRegistry {
  private readonly skills: Skill[];

  constructor(externals: Skill[] = []) {
    this.skills = [
      ...CATALOG.map((entry) => {
        const content = loadMd(`${entry.id}.md`);
        return { ...entry, content, tokenEstimate: estimateTokens(content) };
      }),
      ...externals,
    ];
  }

  getAll(): Skill[] {
    return this.skills;
  }

  getById(id: string): Skill | undefined {
    return this.skills.find((s) => s.id === id);
  }

  forRole(role: AgentRole): Skill[] {
    return this.skills.filter((s) => s.role === role || s.role === 'all');
  }
}
