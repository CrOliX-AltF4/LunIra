import { describe, it, expectTypeOf } from 'vitest';
import type { PipelineStep } from '../../src/types/index.js';

describe('PipelineStep type', () => {
  it('has optional skillsTokens field', () => {
    expectTypeOf<PipelineStep>().toHaveProperty('skillsTokens');
  });

  it('has optional pluginsCalls field', () => {
    expectTypeOf<PipelineStep>().toHaveProperty('pluginsCalls');
  });
});
