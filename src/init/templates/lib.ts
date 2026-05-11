// ─── Lib layer templates (pure TypeScript library) ───────────────────────────

export function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      description: '',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      engines: { node: '>=20.0.0' },
      scripts: {
        build: 'tsup',
        dev: 'tsx src/index.ts',
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
        '*.{ts}': ['eslint --fix', 'prettier --write'],
        '*.{json,md,yaml,yml}': ['prettier --write'],
      },
      keywords: [],
      license: 'MIT',
      devDependencies: {
        '@commitlint/cli': '^19.0.0',
        '@commitlint/config-conventional': '^19.0.0',
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
      dependencies: {},
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
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
});
`;
}

export function srcIndex(): string {
  return `// Entry point — export your public API here
`;
}
