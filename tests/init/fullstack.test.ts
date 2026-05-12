import { describe, it, expect } from 'vitest';
import * as fullstack from '../../src/init/templates/fullstack.js';

describe('fullstack templates', () => {
  it('packageJson includes next and react dependencies', () => {
    const pkg = JSON.parse(fullstack.packageJson('my-app')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('react');
  });

  it('packageJson sets the correct project name', () => {
    const pkg = JSON.parse(fullstack.packageJson('my-app')) as { name: string };
    expect(pkg.name).toBe('my-app');
  });

  it('exports tsconfig function returning valid JSON', () => {
    expect(typeof fullstack.tsconfig).toBe('function');
    const parsed = JSON.parse(fullstack.tsconfig()) as unknown;
    expect(parsed).toHaveProperty('compilerOptions');
  });

  it('exports appPage function returning TSX with export default', () => {
    expect(fullstack.appPage('my-app')).toContain('export default');
  });

  it('exports appLayout function returning TSX with RootLayout', () => {
    expect(fullstack.appLayout('my-app')).toContain('RootLayout');
  });

  it('exports nextConfig function', () => {
    expect(typeof fullstack.nextConfig).toBe('function');
    expect(fullstack.nextConfig()).toContain('NextConfig');
  });
});
