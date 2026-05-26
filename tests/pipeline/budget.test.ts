import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider } from '../../src/providers/types.js';
import type {
  AgentResult,
  POOutput,
  PlannerOutput,
  DevOutput,
  QAOutput,
} from '../../src/agents/types.js';

vi.mock('../../src/providers/registry.js');
vi.mock('../../src/agents/index.js');
vi.mock('../../src/config/project.js');
vi.mock('../../src/skills/loader.js', () => ({
  loadExternalSkill: () => Promise.resolve({}),
  discoverNpmSkills: () => Promise.resolve([]),
}));
vi.mock('../../src/plugins/loader.js', () => ({
  loadExternalPlugin: () => Promise.resolve({}),
  discoverNpmPlugins: () => Promise.resolve([]),
}));

const { getProvider, getConfiguredProviders } = await import('../../src/providers/registry.js');
const { runPOAgent, runPlannerAgent, runDevAgent, runQAAgent } =
  await import('../../src/agents/index.js');
const { runPipeline } = await import('../../src/pipeline/runner.js');
const { buildDefaultSteps } = await import('../../src/pipeline/steps.js');
const { loadProjectConfig } = await import('../../src/config/project.js');

const mockGetProvider = vi.mocked(getProvider);
const mockGetConfiguredProviders = vi.mocked(getConfiguredProviders);
const mockRunPO = vi.mocked(runPOAgent);
const mockRunPlanner = vi.mocked(runPlannerAgent);
const mockRunDev = vi.mocked(runDevAgent);
const mockRunQA = vi.mocked(runQAAgent);
const mockLoadProjectConfig = vi.mocked(loadProjectConfig);

function makeProvider(configured = true): LLMProvider {
  return { name: 'groq', isConfigured: () => configured, complete: vi.fn() };
}

function makeAgentResult<T>(costUsd: number, output: T): AgentResult<T> {
  return {
    output,
    meta: {
      role: 'po' as const,
      modelId: 'x',
      provider: 'groq' as const,
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      costUsd,
      durationMs: 100,
      retries: 0,
    },
  };
}

const PO_OUTPUT: POOutput = {
  clarifiedGoal: 'g',
  requirements: ['r'],
  constraints: [],
  acceptanceCriteria: ['a'],
  complexity: 'low',
  assumptions: [],
};
const PLANNER_OUTPUT: PlannerOutput = {
  architecture: 'arch',
  techStack: [],
  tasks: [],
  estimatedFiles: [],
  risks: [],
};
const DEV_OUTPUT: DevOutput = { files: [], entryPoints: [], implementationNotes: [] };
const QA_OUTPUT: QAOutput = {
  verdict: 'pass',
  score: 90,
  issues: [],
  suggestions: [],
  requirementsCoverage: {},
};

const DEFAULT_CONFIG = {
  skills: { external: [] as string[] },
  plugins: { external: [] as string[] },
  providers: { fallback: [] as string[] },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProvider.mockReturnValue(makeProvider(true));
  mockGetConfiguredProviders.mockReturnValue([]);
  mockLoadProjectConfig.mockResolvedValue(DEFAULT_CONFIG);
  mockRunPO.mockResolvedValue(makeAgentResult(0.01, PO_OUTPUT));
  mockRunPlanner.mockResolvedValue(makeAgentResult(0.01, PLANNER_OUTPUT));
  mockRunDev.mockResolvedValue(makeAgentResult(0.01, DEV_OUTPUT));
  mockRunQA.mockResolvedValue(makeAgentResult(0.01, QA_OUTPUT));
});

describe('runPipeline() — budget cap', () => {
  it('completes normally when total cost is under budget', async () => {
    const steps = buildDefaultSteps();
    const run = await runPipeline('test', steps, undefined, undefined, { maxCostUsd: 1.0 });
    expect(run.status).toBe('completed');
    expect(mockRunQA).toHaveBeenCalled();
  });

  it('aborts pipeline when accumulated cost exceeds budget after first step', async () => {
    mockRunPO.mockResolvedValue(makeAgentResult(0.05, PO_OUTPUT));
    const steps = buildDefaultSteps();
    const run = await runPipeline('test', steps, undefined, undefined, { maxCostUsd: 0.04 });
    expect(run.status).toBe('failed');
    expect(mockRunPlanner).not.toHaveBeenCalled();
    const poStep = run.steps.find((s) => s.role === 'po');
    expect(poStep?.error).toContain('budget');
  });

  it('runs all steps when no budget limit is set', async () => {
    const steps = buildDefaultSteps();
    const run = await runPipeline('test', steps, undefined, undefined, {});
    expect(run.status).toBe('completed');
  });
});
