import { describe, it, expect } from 'vitest';
import { ciYml, lunatarConfig, readmeMd } from '../../src/init/templates/core.js';
import { buildGuidance } from '../../src/init/scaffolder.js';

describe('ciYml', () => {
  it('targets master branch, not main or dev', () => {
    const yml = ciYml();
    expect(yml).toContain('branches: [master]');
    expect(yml).not.toContain('branches: [main, dev]');
  });
});

describe('lunatarConfig', () => {
  it('returns valid JSON with skills and plugins sections', () => {
    const raw = lunatarConfig();
    const parsed = JSON.parse(raw) as unknown;
    expect(parsed).toMatchObject({
      skills: expect.any(Object) as unknown,
      plugins: expect.any(Object) as unknown,
    });
  });

  it('pre-enables typescript-strict and conventional-commits skills', () => {
    const parsed = JSON.parse(lunatarConfig()) as { skills: { all: string[] } };
    expect(parsed.skills.all).toContain('typescript-strict');
    expect(parsed.skills.all).toContain('conventional-commits');
  });
});

describe('readmeMd', () => {
  it('includes the project name in the title', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('# my-project');
  });

  it('includes lunatar run usage', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('lunatar run');
  });
});

describe('buildGuidance', () => {
  it('includes cd command with project name', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('cd my-proj');
  });

  it('mentions lunatar setup', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunatar setup');
  });

  it('mentions lunatar run', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunatar run');
  });
});
