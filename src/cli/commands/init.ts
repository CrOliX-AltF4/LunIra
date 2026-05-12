import { scaffold } from '../../init/scaffolder.js';
import type { ProjectType } from '../../init/types.js';
import { runWizard } from '../../init/wizard.js';

// ─── Command ──────────────────────────────────────────────────────────────────

export async function initCommand(opts: {
  name?: string;
  type?: string;
  skipInstall?: boolean;
  dir?: string;
}): Promise<void> {
  let name = opts.name;
  let type = opts.type as ProjectType | undefined;

  if (!name || !type) {
    const result = await runWizard();
    name ??= result.name;
    type ??= result.type;
  }

  const targetDir = opts.dir ?? `./${name}`;
  await scaffold({ name, type, targetDir, skipInstall: opts.skipInstall ?? false });
}
