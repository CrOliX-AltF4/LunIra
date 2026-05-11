import { runPipeline } from '../pipeline/index.js';
import type { PipelinePreload, PipelineOverride } from '../pipeline/index.js';
import { saveRun } from '../storage/index.js';
import type { PipelineRun, PipelineStep } from '../types/index.js';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Public façade over the pipeline runner.
// This is the stable entry point for consumers (TUI, CLI, future API).

export async function run(
  intent: string,
  steps: PipelineStep[],
  onUpdate?: (step: PipelineStep) => void,
  preload?: PipelinePreload,
  override?: PipelineOverride,
): Promise<PipelineRun> {
  const result = await runPipeline(intent, steps, onUpdate, preload, override);
  // Persist regardless of success/failure so history shows failed runs too
  await saveRun(result);
  return result;
}
