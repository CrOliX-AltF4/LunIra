// ─── CLI layer templates ──────────────────────────────────────────────────────

export function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      description: '',
      type: 'module',
      engines: { node: '>=20.0.0', npm: '>=10.0.0' },
      bin: { [name]: './dist/index.js' },
      scripts: {
        build: 'tsup',
        dev: 'tsx src/cli/index.ts',
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        format: 'prettier --write .',
        'format:check': 'prettier --check .',
        typecheck: 'tsc --noEmit -p tsconfig.test.json',
        test: 'vitest run',
        'test:watch': 'vitest',
        'test:coverage': 'vitest run --coverage',
        prepare: 'husky',
      },
      'lint-staged': {
        '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.{json,md,yaml,yml}': ['prettier --write'],
      },
      keywords: [],
      license: 'MIT',
      devDependencies: {
        '@commitlint/cli': '^19.0.0',
        '@commitlint/config-conventional': '^19.0.0',
        '@types/react': '^19.0.0',
        '@vitest/coverage-v8': '^4.0.0',
        eslint: '^9.0.0',
        'eslint-config-prettier': '^9.0.0',
        husky: '^9.0.0',
        'lint-staged': '^15.0.0',
        prettier: '^3.0.0',
        tsup: '^8.0.0',
        tsx: '^4.0.0',
        typescript: '^5.0.0',
        'typescript-eslint': '^8.0.0',
        vitest: '^4.0.0',
      },
      dependencies: {
        commander: '^14.0.0',
        dotenv: '^17.0.0',
        ink: '^7.0.0',
        'ink-text-input': '^6.0.0',
        react: '^19.0.0',
      },
    },
    null,
    2,
  );
}

export function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        exactOptionalPropertyTypes: true,
        skipLibCheck: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        resolveJsonModule: true,
        jsx: 'react-jsx',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'tests'],
    },
    null,
    2,
  );
}

export function tsupConfig(): string {
  return `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
});
`;
}

export function srcCliIndex(name: string): string {
  return `#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';

const program = new Command();

program
  .name('${name}')
  .description('${name} CLI')
  .version('0.1.0');

program.parse();
`;
}

export function srcIndex(): string {
  return `export * from './cli/index.js';
`;
}
