import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  onSuccess: async () => {
    mkdirSync('dist/catalog', { recursive: true });
    for (const file of readdirSync('src/skills/catalog')) {
      copyFileSync(join('src/skills/catalog', file), join('dist/catalog', file));
    }
  },
});
