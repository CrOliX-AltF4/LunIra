import { listRuns } from '../../storage/index.js';
import type { PipelineRun, AgentRole } from '../../types/index.js';
import type { QAOutput } from '../../agents/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseQAOutput(run: PipelineRun): QAOutput | null {
  const step = run.steps.find((s) => s.role === ('qa' as AgentRole) && s.status === 'completed');
  if (!step?.output) return null;
  try {
    return JSON.parse(step.output) as QAOutput;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-CA') +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatCost(usd: number): string {
  return usd < 0.01 ? `$${(usd * 1000).toFixed(2)}m` : `$${usd.toFixed(4)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str.padEnd(max);
}

function verdictBadge(run: PipelineRun): string {
  if (run.status === 'failed') return 'FAILED ';
  const qa = parseQAOutput(run);
  if (!qa) return 'NO QA  ';
  return qa.verdict === 'pass' ? 'PASS   ' : qa.verdict === 'partial' ? 'PARTIAL' : 'FAIL   ';
}

// ─── Command ──────────────────────────────────────────────────────────────────

export async function historyCommand(limit = 20): Promise<void> {
  const runs = await listRuns();

  if (runs.length === 0) {
    console.log('No pipeline runs found. Run `lunatar run` to get started.');
    return;
  }

  const displayed = runs.slice(0, limit);

  const header = [
    'Date'.padEnd(17),
    'Verdict'.padEnd(9),
    'Intent'.padEnd(45),
    'Cost'.padEnd(9),
    'Tokens',
  ].join('  ');

  const divider = '─'.repeat(header.length);

  console.log('\n' + divider);
  console.log(header);
  console.log(divider);

  for (const run of displayed) {
    const row = [
      formatDate(run.createdAt).padEnd(17),
      verdictBadge(run).padEnd(9),
      truncate(run.intent, 45),
      formatCost(run.totalCostUsd).padEnd(9),
      run.totalTokens.toLocaleString(),
    ].join('  ');
    console.log(row);
  }

  console.log(divider);
  console.log(`${String(displayed.length)} of ${String(runs.length)} runs shown.\n`);
}
