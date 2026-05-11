import { describe, it, expect } from 'vitest';
import { SkillRegistry } from '../../src/skills/registry.js';

describe('SkillRegistry', () => {
  it('loads all catalog skills and each has required fields', () => {
    const registry = new SkillRegistry();
    const skills = registry.getAll();
    expect(skills.length).toBeGreaterThan(0);
    for (const s of skills) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.content).toBeTruthy();
      expect(s.tokenEstimate).toBeGreaterThan(0);
    }
  });

  it('forRole("dev") returns only dev or all-role skills', () => {
    const registry = new SkillRegistry();
    const skills = registry.forRole('dev');
    expect(skills.every((s) => s.role === 'dev' || s.role === 'all')).toBe(true);
  });

  it('getById returns the correct skill', () => {
    const registry = new SkillRegistry();
    const skill = registry.getById('typescript-strict');
    expect(skill).toBeDefined();
    expect(skill?.id).toBe('typescript-strict');
  });

  it('getById returns undefined for unknown id', () => {
    const registry = new SkillRegistry();
    expect(registry.getById('does-not-exist')).toBeUndefined();
  });
});
