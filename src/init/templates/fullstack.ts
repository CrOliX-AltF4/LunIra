// ─── Fullstack (Next.js 15) layer templates ───────────────────────────────────

export function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        typecheck: 'tsc --noEmit',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        typescript: '^5.0.0',
        vitest: '^4.0.0',
        '@vitejs/plugin-react': '^4.0.0',
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
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  );
}

export function nextConfig(): string {
  return `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
`;
}

export function appPage(name: string): string {
  return `export default function Home() {
  return (
    <main>
      <h1>${name}</h1>
      <p>Scaffolded with lunatar. Run <code>lunatar run &quot;&lt;intent&gt;&quot;</code> to build.</p>
    </main>
  );
}
`;
}

export function appLayout(name: string): string {
  return `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${name}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}
