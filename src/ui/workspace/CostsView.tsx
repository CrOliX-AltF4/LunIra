import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { listRuns } from '../../storage/index.js';
import { Separator } from '../components/Separator.js';
import { GOLD } from '../theme.js';
import type { PipelineRun } from '../../types/index.js';

// ─── Aggregation (mirrors costsCommand logic) ─────────────────────────────────

interface ProviderTotals {
  spentUsd: number;
  tokens: number;
  runs: number;
}

function aggregate(runs: PipelineRun[]): Map<string, ProviderTotals> {
  const map = new Map<string, ProviderTotals>();
  for (const run of runs) {
    for (const step of run.steps) {
      if (!step.provider || step.status !== 'completed') continue;
      const entry = map.get(step.provider) ?? { spentUsd: 0, tokens: 0, runs: 0 };
      entry.spentUsd += step.costUsd ?? 0;
      entry.tokens += step.tokensUsed ?? 0;
      map.set(step.provider, entry);
    }
    const firstProvider = run.steps.find((s) => s.provider && s.status === 'completed')?.provider;
    if (firstProvider) {
      const entry = map.get(firstProvider);
      if (entry) entry.runs += 1;
    }
  }
  return map;
}

function formatUsd(n: number): string {
  return n < 0.001 ? `$${(n * 1000).toFixed(3)}m` : `$${n.toFixed(4)}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface CostsViewProps {
  onBack?: () => void;
  days?: number;
}

export function CostsView({ onBack, days = 7 }: CostsViewProps) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listRuns()
      .then((r) => {
        setRuns(r);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  useInput((input, key) => {
    if ((input === 'q' || key.escape) && onBack) onBack();
  });

  const cutoff = daysAgo(days);
  const today = startOfDay(new Date());
  const windowRuns = runs.filter((r) => new Date(r.createdAt) >= cutoff);
  const todayRuns = runs.filter((r) => new Date(r.createdAt) >= today);

  const todaySpend = todayRuns.reduce((s, r) => s + r.totalCostUsd, 0);
  const todayTokens = todayRuns.reduce((s, r) => s + r.totalTokens, 0);
  const windowSpend = windowRuns.reduce((s, r) => s + r.totalCostUsd, 0);
  const windowTokens = windowRuns.reduce((s, r) => s + r.totalTokens, 0);
  const byProvider = aggregate(windowRuns);
  const sorted = [...byProvider.entries()].sort((a, b) => b[1].spentUsd - a[1].spentUsd);

  const COL = { provider: 14, runs: 8, tokens: 14, cost: 12 };

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        <Text color={GOLD} bold>
          ◈ Cost Summary
        </Text>

        {!loaded ? (
          <Text color="gray">Loading...</Text>
        ) : (
          <>
            <Box flexDirection="column" gap={0}>
              <Text>
                <Text color="gray">Today </Text>
                <Text color="yellow">{formatUsd(todaySpend).padStart(10)}</Text>
                <Text color="gray">{'   '}</Text>
                <Text>{todayTokens.toLocaleString()} tok</Text>
                <Text color="gray">{'   '}</Text>
                <Text>{todayRuns.length} run(s)</Text>
              </Text>
              <Text>
                <Text color="gray">{`Last ${days.toString()} days    `}</Text>
                <Text color="yellow">{formatUsd(windowSpend).padStart(10)}</Text>
                <Text color="gray">{'   '}</Text>
                <Text>{windowTokens.toLocaleString()} tok</Text>
                <Text color="gray">{'   '}</Text>
                <Text>{windowRuns.length} run(s)</Text>
              </Text>
            </Box>

            {sorted.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="gray" dimColor>
                  {'  '}
                  {'Provider'.padEnd(COL.provider)}
                  {'Runs'.padEnd(COL.runs)}
                  {'Tokens'.padEnd(COL.tokens)}
                  {'Cost'}
                </Text>
                <Text color="gray" dimColor>
                  {'─'.repeat(COL.provider + COL.runs + COL.tokens + COL.cost)}
                </Text>
                {sorted.map(([provider, totals]) => (
                  <Text key={provider}>
                    {'  '}
                    <Text color="white">{provider.padEnd(COL.provider)}</Text>
                    <Text color="gray">{totals.runs.toString().padEnd(COL.runs)}</Text>
                    <Text color="gray">{totals.tokens.toLocaleString().padEnd(COL.tokens)}</Text>
                    <Text color="yellow">{formatUsd(totals.spentUsd)}</Text>
                  </Text>
                ))}
              </Box>
            )}

            {runs.length === 0 && <Text color="gray">No runs recorded yet.</Text>}
          </>
        )}
      </Box>

      <Box paddingX={2}>
        <Text color="gray" dimColor>
          <Text color="yellow">q / Esc</Text> back
        </Text>
      </Box>
    </Box>
  );
}
