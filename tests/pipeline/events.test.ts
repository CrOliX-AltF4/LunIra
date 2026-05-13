import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider } from '../../src/providers/types.js';
import type { PipelineStep } from '../../src/types/index.js';
import type { PipelineEvent } from '../../src/types/events.js';
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

const { getProvider } = await import('../../src/providers/registry.js');
const { runPOAgent, runPlannerAgent, runDevAgent, runQAAgent } =
  await import('../../src/agents/index.js');
const { runPipeline } = await import('../../src/pipeline/runner.js');
const { loadProjectConfig } = await import('../../src/config/project.js');

const mockGetProvider = vi.mocked(getProvider);
const mockRunPOAgent = vi.mocked(runPOAgent);
const mockRunPlannerAgent = vi.mocked(runPlannerAgent);
const mockRunDevAgent = vi.mocked(runDevAgent);
const mockRunQAAgent = vi.mocked(runQAAgent);
const mockLoadProjectConfig = vi.mocked(loadProjectConfig);

function makeProvider(): LLMProvider {
  return { name: 'groq', isConfigured: () => true, complete: vi.fn() };
}

const BASE_META = {
  role: 'po' as const,
  modelId: 'llama-3.3-70b-versatile',
  provider: 'groq' as const,
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  costUsd: 0.0001,
  durationMs: 200,
  toolCalls: [],
};

const PO_RESULT: AgentResult<POOutput> = {
  output: {
    clarifiedGoal: 'Build a CLI',
    requirements: ['req1'],
    constraints: [],
    acceptanceCriteria: ['ac1'],
    complexity: 'medium',
    assumptions: [],
  },
  meta: { ...BASE_META, role: 'po' },
};
const PLANNER_RESULT: AgentResult<PlannerOutput> = {
  output: {
    architecture: 'Simple CLI',
    techStack: ['Node.js'],
    tasks: [{ id: 't1', description: 'init', dependsOn: [] }],
    estimatedFiles: ['src/index.ts'],
    risks: [],
  },
  meta: { ...BASE_META, role: 'planner' },
};
const DEV_RESULT: AgentResult<DevOutput> = {
  output: {
    files: [{ path: 'src/index.ts', content: 'console.log("hi")', description: 'entry' }],
    entryPoints: ['src/index.ts'],
    implementationNotes: [],
  },
  meta: { ...BASE_META, role: 'dev' },
};
const QA_RESULT: AgentResult<QAOutput> = {
  output: {
    verdict: 'pass',
    score: 95,
    issues: [],
    suggestions: [],
    requirementsCoverage: { req1: true },
  },
  meta: { ...BASE_META, role: 'qa' },
};

const STEPS: PipelineStep[] = [
  {
    id: 'po',
    role: 'po',
    taskType: 'clarification',
    status: 'pending',
    modelId: 'llama-3.3-70b-versatile',
    provider: 'groq',
  },
  {
    id: 'planner',
    role: 'planner',
    taskType: 'architecture',
    status: 'pending',
    modelId: 'gemini-2.0-flash',
    provider: 'gemini',
  },
  {
    id: 'dev',
    role: 'dev',
    taskType: 'code',
    status: 'pending',
    modelId: 'claude-sonnet-4-6',
    provider: 'claude',
  },
  {
    id: 'qa',
    role: 'qa',
    taskType: 'analysis',
    status: 'pending',
    modelId: 'llama-3.3-70b-versatile',
    provider: 'groq',
  },
];

const DEFAULT_CONFIG = {
  skills: { external: [] },
  plugins: { external: [] },
  providers: { fallback: [] as string[] },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProvider.mockReturnValue(makeProvider());
  mockRunPOAgent.mockResolvedValue(PO_RESULT);
  mockRunPlannerAgent.mockResolvedValue(PLANNER_RESULT);
  mockRunDevAgent.mockResolvedValue(DEV_RESULT);
  mockRunQAAgent.mockResolvedValue(QA_RESULT);
  mockLoadProjectConfig.mockResolvedValue(DEFAULT_CONFIG);
});

describe('runPipeline() — onEvent callback', () => {
  it('emits step_started and step_completed for each step', async () => {
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const started = events.filter((e) => e.type === 'step_started');
    const completed = events.filter((e) => e.type === 'step_completed');
    expect(started).toHaveLength(4);
    expect(completed).toHaveLength(4);
  });

  it('emits step_started with role and provider', async () => {
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const poStarted = events.find((e) => e.type === 'step_started' && e.stepId === 'po');
    expect(poStarted).toBeDefined();
    if (poStarted?.type === 'step_started') {
      expect(poStarted.role).toBe('po');
      expect(poStarted.provider).toBeTruthy();
    }
  });

  it('emits step_completed with cost and tokens', async () => {
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const poCompleted = events.find((e) => e.type === 'step_completed' && e.stepId === 'po');
    if (poCompleted?.type === 'step_completed') {
      expect(poCompleted.costUsd).toBe(0.0001);
      expect(poCompleted.tokensUsed).toBe(150);
    }
  });

  it('emits step_skipped for pre-skipped steps', async () => {
    const stepsWithSkip = STEPS.map((s) =>
      s.role === 'qa' ? { ...s, status: 'skipped' as const } : s,
    );
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', stepsWithSkip, undefined, undefined, undefined, (e) =>
      events.push(e),
    );

    const qaSkipped = events.find((e) => e.type === 'step_skipped' && e.stepId === 'qa');
    expect(qaSkipped).toBeDefined();
  });

  it('emits step_failed on agent error', async () => {
    mockRunPlannerAgent.mockRejectedValueOnce(new Error('LLM timeout'));
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const plannerFailed = events.find((e) => e.type === 'step_failed' && e.stepId === 'planner');
    expect(plannerFailed).toBeDefined();
    if (plannerFailed?.type === 'step_failed') {
      expect(plannerFailed.error).toContain('LLM timeout');
    }
  });

  it('emits plugin_called events when a step used plugins', async () => {
    mockRunPOAgent.mockResolvedValueOnce({
      ...PO_RESULT,
      meta: { ...PO_RESULT.meta, toolCalls: ['read_file', 'read_file', 'web_search'] },
    });
    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const pluginEvents = events.filter((e) => e.type === 'plugin_called' && e.stepId === 'po');
    expect(pluginEvents).toHaveLength(2); // read_file (count=2) + web_search (count=1) = 2 unique
    const readFileEvt = pluginEvents.find(
      (e) => e.type === 'plugin_called' && e.pluginId === 'read_file',
    );
    if (readFileEvt?.type === 'plugin_called') expect(readFileEvt.callCount).toBe(2);
  });
});

describe('runPipeline() — provider_switched event', () => {
  it('emits provider_switched when fallback chain is used', async () => {
    mockGetProvider.mockReturnValue(makeProvider());
    mockRunPOAgent.mockRejectedValueOnce(new Error('429 rate limit')).mockResolvedValue(PO_RESULT);

    mockLoadProjectConfig.mockResolvedValue({
      ...DEFAULT_CONFIG,
      providers: { fallback: ['openai'] },
    });

    const events: PipelineEvent[] = [];
    await runPipeline('Build a CLI', STEPS, undefined, undefined, undefined, (e) => events.push(e));

    const switchEvt = events.find((e) => e.type === 'provider_switched');
    expect(switchEvt).toBeDefined();
    if (switchEvt?.type === 'provider_switched') {
      expect(switchEvt.from).toBe('groq');
      expect(switchEvt.to).toBe('openai');
    }
  });
});
