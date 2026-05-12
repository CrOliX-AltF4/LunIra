import { describe, it, expect } from 'vitest';
import { ciYml } from '../../src/init/templates/core.js';

describe('ciYml', () => {
  it('targets master branch, not main or dev', () => {
    const yml = ciYml();
    expect(yml).toContain('branches: [master]');
    expect(yml).not.toContain('branches: [main, dev]');
  });
});
