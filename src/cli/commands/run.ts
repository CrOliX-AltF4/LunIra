import { readFile } from 'node:fs/promises';
import { render } from 'ink';
import React from 'react';
import { App } from '../../ui/App.js';
import { buildDefaultSteps, parseSkipRoles } from '../../pipeline/steps.js';
import type { PipelinePreload } from '../../pipeline/index.js';
import { getModelById } from '../../models/catalog.js';
import * as orchestrator from '../../orchestrator/index.js';
import type { POOutput, CodeFile } from '../../agents/types.js';
import type { AgentRole, PipelineStep } from '../../types/index.js';
import type { PipelineEvent } from '../../types/events.js';
import { gatherWorkspaceContext } from '../workspace-context.js';
import { writeOutputFiles } from '../output-writer.js';

// ─── Shared role labels for progress output ───────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  po: 'Product Owner',
  planner: 'Planner',
  dev: 'Developer',
  qa: 'QA Engineer',
};

// ─── Command options ──────────────────────────────────────────────────────────

interface RunOptions {
  intent?: string;
  json?: boolean;
  skip?: string;
  dry?: boolean;
  fromPo?: string;
  output?: string;
  workspace?: boolean;
}

// ─── PO output loader ─────────────────────────────────────────────────────────

interface FromPoPayload {
  po: POOutput;
  cwd?: string;
  projectType?: string;
}

/**
 * Reads and validates a POOutput from a file path or stdin ('-').
 * Validates that required fields are present — throws on invalid input.
 */
async function loadPoOutput(source: string): Promise<FromPoPayload> {
  let raw: string;
  if (source === '-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    raw = Buffer.concat(chunks).toString('utf8');
  } else {
    raw = await readFile(source, 'utf8');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--from-po: invalid JSON in "${source}"`);
  }

  const obj = parsed as Record<string, unknown>;
  const required = [
    'clarifiedGoal',
    'requirements',
    'constraints',
    'acceptanceCriteria',
    'complexity',
    'assumptions',
  ];
  const missing = required.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`--from-po: missing required field(s): ${missing.join(', ')}`);
  }

  return {
    po: parsed as POOutput,
    ...(typeof obj['cwd'] === 'string' ? { cwd: obj['cwd'] } : {}),
    ...(typeof obj['projectType'] === 'string' ? { projectType: obj['projectType'] } : {}),
  };
}

// ─── Token estimates per role (medium complexity baseline) ────────────────────
// Used only for --dry cost preview — not binding for actual runs.

const ROLE_TOKEN_ESTIMATES: Record<AgentRole, { input: number; output: number }> = {
  po: { input: 800, output: 400 },
  planner: { input: 1500, output: 1200 },
  dev: { input: 2500, output: 3500 },
  qa: { input: 4000, output: 600 },
};

// ─── Dry run ──────────────────────────────────────────────────────────────────

/**
 * Prints a cost/model preview without making any LLM call.
 * Skipped roles are listed but excluded from the total estimate.
 */
function dryRun(intent: string | undefined, skipRoles: ReadonlySet<AgentRole>): void {
  const steps = buildDefaultSteps(skipRoles);

  const header = intent
    ? `lunatar — dry run for: "${intent}"`
    : 'lunatar — dry run (no intent given)';
  process.stdout.write(`\n${header}\n\n`);

  const COL = { role: 16, model: 22, provider: 10, tokens: 16, cost: 10 };

  const pad = (s: string, n: number) => s.padEnd(n);

  process.stdout.write(
    `  ${pad('Role', COL.role)}${pad('Model', COL.model)}${pad('Provider', COL.provider)}${pad('Est. tokens', COL.tokens)}Est. cost\n`,
  );
  process.stdout.write(
    `  ${'─'.repeat(COL.role + COL.model + COL.provider + COL.tokens + COL.cost)}\n`,
  );

  let totalCost = 0;

  for (const step of steps) {
    const label = ROLE_LABELS[step.role] ?? step.role;

    if (step.status === 'skipped') {
      process.stdout.write(
        `  ${pad(label, COL.role)}${pad('—', COL.model)}${pad('—', COL.provider)}${'skipped'.padEnd(COL.tokens + COL.cost)}\n`,
      );
      continue;
    }

    const model = step.modelId ? getModelById(step.modelId) : undefined;
    const est = ROLE_TOKEN_ESTIMATES[step.role];
    const cost = model
      ? est.input * model.costPerInputToken + est.output * model.costPerOutputToken
      : 0;
    totalCost += cost;

    const tokStr = `~${(est.input + est.output).toLocaleString()} tok`;
    const costStr = cost < 0.001 ? `~$${(cost * 1000).toFixed(3)}m` : `~$${cost.toFixed(4)}`;

    process.stdout.write(
      `  ${pad(label, COL.role)}${pad(model?.displayName ?? '?', COL.model)}${pad(model?.provider ?? '?', COL.provider)}${pad(tokStr, COL.tokens)}${costStr}\n`,
    );
  }

  process.stdout.write(
    `  ${'─'.repeat(COL.role + COL.model + COL.provider + COL.tokens + COL.cost)}\n`,
  );

  const totalStr =
    totalCost < 0.001 ? `~$${(totalCost * 1000).toFixed(3)}m` : `~$${totalCost.toFixed(4)}`;
  process.stdout.write(
    `  ${''.padEnd(COL.role + COL.model + COL.provider + COL.tokens)}Total: ${totalStr}\n`,
  );

  if (intent) {
    const skipFlag = skipRoles.size > 0 ? ` --skip ${[...skipRoles].join(',')}` : '';
    process.stdout.write(`\n  Run with: lunatar run "${intent}"${skipFlag}\n`);
  }

  process.stdout.write('\n');
}

// ─── TUI mode ─────────────────────────────────────────────────────────────────

async function tuiRun(intent?: string, skipRoles?: ReadonlySet<AgentRole>): Promise<void> {
  const props = {
    ...(intent ? { initialIntent: intent } : {}),
    ...(skipRoles && skipRoles.size > 0 ? { skipRoles } : {}),
  };
  const { waitUntilExit } = render(React.createElement(App, props));
  await waitUntilExit();
}

// ─── Headless mode ────────────────────────────────────────────────────────────

/**
 * Runs the pipeline without a TUI.
 * Progress is written to stderr so stdout stays clean for JSON consumers.
 * Final PipelineRun JSON is written to stdout on completion.
 * Exits with code 1 if the pipeline fails.
 */
async function headlessRun(
  intent: string,
  skipRoles: ReadonlySet<AgentRole>,
  fromPoPayload?: FromPoPayload,
  outputDir?: string,
): Promise<void> {
  const steps = buildDefaultSteps(skipRoles);
  const total = steps.length;

  const skippedNames = steps
    .filter((s) => s.status === 'skipped')
    .map((s) => ROLE_LABELS[s.role] ?? s.role)
    .join(', ');

  process.stderr.write(`lunatar — running pipeline: "${intent}"\n`);
  if (skippedNames) process.stderr.write(`Skipping: ${skippedNames}\n`);
  process.stderr.write('\n');

  const onUpdate = (step: PipelineStep): void => {
    const idx = steps.findIndex((s) => s.id === step.id) + 1;
    const label = ROLE_LABELS[step.role] ?? step.role;

    if (step.status === 'running') {
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · running...\n`);
    } else if (step.status === 'completed') {
      const dur = step.durationMs !== undefined ? ` · ${(step.durationMs / 1000).toFixed(1)}s` : '';
      const tok = step.tokensUsed !== undefined ? ` · ${step.tokensUsed.toLocaleString()} tok` : '';
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · done${dur}${tok}\n`);
    } else if (step.status === 'failed') {
      process.stderr.write(
        `[${String(idx)}/${String(total)}] ${label} · FAILED: ${step.error ?? 'unknown error'}\n`,
      );
    } else if (step.status === 'skipped') {
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · skipped\n`);
    }
  };

  const onEvent = (event: PipelineEvent): void => {
    process.stdout.write(JSON.stringify(event) + '\n');
  };

  const preload: PipelinePreload | undefined = fromPoPayload
    ? {
        po: fromPoPayload.po,
        ...(fromPoPayload.cwd ? { cwd: fromPoPayload.cwd } : {}),
        ...(fromPoPayload.projectType ? { projectType: fromPoPayload.projectType } : {}),
      }
    : undefined;

  const run = await orchestrator.run(intent, steps, onUpdate, preload, undefined, onEvent);

  process.stderr.write(
    `\nDone — status: ${run.status} · $${run.totalCostUsd.toFixed(4)} · ${run.totalTokens.toLocaleString()} tok · ${(run.totalDurationMs / 1000).toFixed(1)}s\n`,
  );

  // Write generated files to disk if --output was given
  if (outputDir) {
    const devStep = run.steps.find((s) => s.role === 'dev' && s.status === 'completed');
    if (devStep?.output) {
      try {
        const devOutput = JSON.parse(devStep.output) as { files?: CodeFile[] };
        if (Array.isArray(devOutput.files) && devOutput.files.length > 0) {
          const written = await writeOutputFiles(devOutput.files, outputDir);
          process.stderr.write(`\nWrote ${written.length.toString()} file(s) to ${outputDir}:\n`);
          for (const p of written) process.stderr.write(`  ${p}\n`);
        }
      } catch {
        process.stderr.write(`\nWarning: could not parse dev output for --output\n`);
      }
    }
  }

  process.stdout.write(
    JSON.stringify({ type: 'run_completed', run } satisfies PipelineEvent) + '\n',
  );

  if (run.status === 'failed') {
    process.exit(1);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function runCommand(options: RunOptions): Promise<void> {
  // ── Resolve skip roles ──────────────────────────────────────────────────────
  let skipRoles: Set<AgentRole> = new Set();

  if (options.skip) {
    try {
      skipRoles = parseSkipRoles(options.skip);
    } catch (err) {
      process.stderr.write(`${String(err)}\n`);
      process.exit(1);
    }
  }

  // ── Load --from-po input ────────────────────────────────────────────────────
  let fromPoPayload: FromPoPayload | undefined;

  if (options.fromPo) {
    try {
      fromPoPayload = await loadPoOutput(options.fromPo);
    } catch (err) {
      process.stderr.write(`${String(err)}\n`);
      process.exit(1);
    }
    // Auto-skip PO when its output is provided externally
    skipRoles.add('po');
  }

  // ── Apply --workspace context ───────────────────────────────────────────────
  let resolvedIntent = options.intent;
  if (options.workspace) {
    const wsCtx = await gatherWorkspaceContext(process.cwd());
    resolvedIntent = resolvedIntent ? `${wsCtx}\n\nTask: ${resolvedIntent}` : wsCtx;
  }

  // ── Dry run ─────────────────────────────────────────────────────────────────
  if (options.dry) {
    dryRun(resolvedIntent, skipRoles);
    return;
  }

  // ── Headless JSON mode ──────────────────────────────────────────────────────
  if (options.json || options.output) {
    if (!resolvedIntent) {
      process.stderr.write(
        'Error: --json / --output requires an intent argument. Example: lunatar run "build a REST API" --json\n',
      );
      process.exit(1);
    }
    await headlessRun(resolvedIntent, skipRoles, fromPoPayload, options.output);
    return;
  }

  // ── TUI mode ────────────────────────────────────────────────────────────────
  await tuiRun(resolvedIntent, skipRoles);
}
