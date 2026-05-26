import { getDefaultModel } from '../models/catalog.js';
import { getConfiguredProviders } from '../providers/registry.js';
import { recommend } from '../models/recommender.js';
import type { AgentRole, ModelSpec, PipelineStep, ProviderName, TaskType } from '../types/index.js';

// ─── Agent sequence ───────────────────────────────────────────────────────────

const AGENT_SEQUENCE: Array<{ role: AgentRole; taskType: TaskType }> = [
  { role: 'po', taskType: 'clarification' },
  { role: 'planner', taskType: 'architecture' },
  { role: 'dev', taskType: 'code' },
  { role: 'qa', taskType: 'analysis' },
];

/**
 * Builds the default pipeline steps using the catalog's recommended model per role.
 * Steps whose role is in `skipRoles` are pre-marked as `skipped` — the runner
 * will bypass them without making any LLM call.
 *
 * Used by both the TUI (PipelineScreen) and the headless CLI runner.
 */
export function buildDefaultSteps(skipRoles: ReadonlySet<AgentRole> = new Set()): PipelineStep[] {
  const configured = getConfiguredProviders();
  const allowedProviders = configured.length > 0 ? configured.map((p) => p.name) : undefined;

  return AGENT_SEQUENCE.map(({ role, taskType }) => {
    let model: ModelSpec;
    if (allowedProviders && allowedProviders.length > 0) {
      const rec = recommend({ role, taskType, complexity: 'medium', allowedProviders });
      model = rec.recommended;
    } else {
      model = getDefaultModel(role);
    }
    return {
      id: role,
      role,
      taskType,
      status: skipRoles.has(role) ? 'skipped' : 'pending',
      modelId: model.id,
      provider: model.provider,
    };
  });
}

// ─── Role parsing ─────────────────────────────────────────────────────────────

const VALID_ROLES = new Set<AgentRole>(['po', 'planner', 'dev', 'qa']);

/**
 * Parses a comma-separated string of role names into a validated Set<AgentRole>.
 * Throws with a clear message if any token is not a valid role.
 *
 * @example parseSkipRoles('po,qa') // → Set { 'po', 'qa' }
 */
export function parseSkipRoles(raw: string): Set<AgentRole> {
  const tokens = raw.split(',').map((t) => t.trim().toLowerCase());
  const invalid = tokens.filter((t) => !VALID_ROLES.has(t as AgentRole));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid role(s) in --skip: "${invalid.join('", "')}". Valid roles: po, planner, dev, qa.`,
    );
  }
  return new Set(tokens as AgentRole[]);
}

// ─── Step overrides ───────────────────────────────────────────────────────────

export interface StepOverrideOptions {
  modelId?: string;
  providerName?: ProviderName;
}

/**
 * Returns a new steps array with the given model/provider applied to every
 * non-skipped step. Skipped steps are returned unchanged.
 */
export function applyStepOverrides(
  steps: PipelineStep[],
  options: StepOverrideOptions,
): PipelineStep[] {
  return steps.map((step) => {
    if (step.status === 'skipped') return step;
    return {
      ...step,
      ...(options.modelId !== undefined ? { modelId: options.modelId } : {}),
      ...(options.providerName !== undefined ? { provider: options.providerName } : {}),
    };
  });
}
