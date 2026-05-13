import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  onSuccess: async () => {
    // Copy skills catalog
    mkdirSync('dist/catalog', { recursive: true });
    for (const file of readdirSync('src/skills/catalog')) {
      copyFileSync(join('src/skills/catalog', file), join('dist/catalog', file));
    }

    // Copy config schema (dynamic import to get the compiled value)
    const { projectConfigSchema } = await import('./src/config/schema.js');
    writeFileSync(
      'dist/lunatar.config.schema.json',
      JSON.stringify(projectConfigSchema, null, 2),
      'utf-8',
    );
  },
});
