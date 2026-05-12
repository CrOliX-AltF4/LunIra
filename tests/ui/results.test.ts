import { describe, it, expect } from 'vitest';
import { formatStepBreakdown } from '../../src/ui/formatters.js';
import type { PipelineStep } from '../../src/types/index.js';

describe('formatStepBreakdown', () => {
  it('includes skill token count when present', () => {
    const step: PipelineStep = {
      id: 'step-1',
      role: 'dev',
      taskType: 'code',
      status: 'completed',
      tokensUsed: 500,
      skillsTokens: 120,
      pluginsCalls: { file_write: 2 },
    };
    const output = formatStepBreakdown(step);
    expect(output).toContain('120');
    expect(output).toContain('file_write');
  });

  it('omits breakdown when skillsTokens is absent', () => {
    const step: PipelineStep = {
      id: 'step-2',
      role: 'po',
      taskType: 'clarification',
      status: 'completed',
      tokensUsed: 200,
    };
    const output = formatStepBreakdown(step);
    expect(output).toBe('');
  });
});
