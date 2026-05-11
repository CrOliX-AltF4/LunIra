// ─── Frontend layer templates (Vite + React + CSS Modules) ───────────────────

export function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      description: '',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
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
        '*.{json,md,yaml,yml,css}': ['prettier --write'],
      },
      keywords: [],
      license: 'MIT',
      devDependencies: {
        '@commitlint/cli': '^19.0.0',
        '@commitlint/config-conventional': '^19.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        '@vitejs/plugin-react': '^4.0.0',
        '@vitest/coverage-v8': '^4.0.0',
        eslint: '^9.0.0',
        'eslint-config-prettier': '^9.0.0',
        husky: '^9.0.0',
        'lint-staged': '^15.0.0',
        prettier: '^3.0.0',
        typescript: '^5.0.0',
        'typescript-eslint': '^8.0.0',
        vite: '^6.0.0',
        vitest: '^4.0.0',
      },
      dependencies: {
        'framer-motion': '^12.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
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
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        exactOptionalPropertyTypes: true,
        skipLibCheck: true,
        declaration: true,
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

export function viteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

export function indexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export function srcMain(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

export function srcApp(name: string): string {
  return `import styles from './App.module.css';

export default function App() {
  return (
    <main className={styles.container}>
      <h1>${name}</h1>
    </main>
  );
}
`;
}

export function srcAppCss(): string {
  return `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
}
`;
}
