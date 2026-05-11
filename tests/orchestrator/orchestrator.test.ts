import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PipelineStep, PipelineRun } from '../../src/types/index.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/pipeline/index.js');

const { runPipeline } = await import('../../src/pipeline/index.js');
const { run } = await import('../../src/orchestrator/index.js');

const mockRunPipeline = vi.mocked(runPipeline);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STEPS: PipelineStep[] = [
  {
    id: 'po',
    role: 'po',
    taskType: 'clarification',
    status: 'pending',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
  },
];

const COMPLETED_RUN: PipelineRun = {
  id: 'run-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  intent: 'Build a CLI',
  steps: STEPS.map((s) => ({ ...s, status: 'completed' })),
  totalCostUsd: 0.0001,
  totalTokens: 150,
  totalDurationMs: 300,
  status: 'completed',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRunPipeline.mockResolvedValue(COMPLETED_RUN);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('orchestrator.run()', () => {
  it('delegates to runPipeline and returns its result', async () => {
    const result = await run('Build a CLI', STEPS);
    expect(result).toEqual(COMPLETED_RUN);
    expect(mockRunPipeline).toHaveBeenCalledOnce();
  });

  it('forwards intent and steps to runPipeline', async () => {
    await run('Build a CLI', STEPS);
    expect(mockRunPipeline).toHaveBeenCalledWith(
      'Build a CLI',
      STEPS,
      undefined,
      undefined,
      undefined,
    );
  });

  it('forwards the onUpdate callback to runPipeline', async () => {
    const onUpdate = vi.fn();
    await run('Build a CLI', STEPS, onUpdate);
    expect(mockRunPipeline).toHaveBeenCalledWith(
      'Build a CLI',
      STEPS,
      onUpdate,
      undefined,
      undefined,
    );
  });
});
