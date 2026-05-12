import { describe, it, expect } from 'vitest';
import { validateProjectName, validateProjectType } from '../../src/init/wizard.js';

describe('validateProjectName', () => {
  it('accepts lowercase-hyphen names', () => {
    expect(validateProjectName('my-project')).toBe(true);
  });

  it('rejects names with uppercase', () => {
    expect(validateProjectName('MyProject')).toMatch(/lowercase/);
  });

  it('rejects empty names', () => {
    expect(validateProjectName('')).toMatch(/required/);
  });

  it('rejects names with spaces', () => {
    expect(validateProjectName('my project')).toMatch(/lowercase/);
  });
});

describe('validateProjectType', () => {
  it('accepts valid types', () => {
    expect(validateProjectType('cli')).toBe(true);
    expect(validateProjectType('frontend')).toBe(true);
    expect(validateProjectType('lib')).toBe(true);
    expect(validateProjectType('fullstack')).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(validateProjectType('backend')).toMatch(/invalid/i);
  });
});
