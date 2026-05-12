import type { PipelineStep } from '../types/index.js';

export function formatStepBreakdown(step: PipelineStep): string {
  const parts: string[] = [];

  if (step.skillsTokens !== undefined) {
    parts.push(`skills: ~${String(step.skillsTokens)} tokens`);
  }

  if (step.pluginsCalls && Object.keys(step.pluginsCalls).length > 0) {
    const callSummary = Object.entries(step.pluginsCalls)
      .map(([name, count]) => `${name}×${String(count)}`)
      .join(', ');
    parts.push(`plugins: ${callSummary}`);
  }

  return parts.length > 0 ? `  ↳ ${parts.join(' | ')}` : '';
}
