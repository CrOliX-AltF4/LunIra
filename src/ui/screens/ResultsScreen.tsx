import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
import { Separator } from '../components/Separator.js';
import type { OnCompanionChange } from '../workspace/types.js';
import { STATUS_COLORS } from '../theme.js';
import type { PipelineRun, AgentRole } from '../../types/index.js';
import type { DevOutput, POOutput, PlannerOutput, QAOutput, QAIssue } from '../../agents/types.js';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'files' | 'plan' | 'diff';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStepOutput(run: PipelineRun, role: AgentRole): unknown {
  const step = run.steps.find((s) => s.role === role && s.status === 'completed');
  if (!step?.output) return null;
  try {
    return JSON.parse(step.output);
  } catch {
    return null;
  }
}

function formatCost(usd: number): string {
  return usd < 0.01 ? `$${(usd * 1000).toFixed(3)}m` : `$${usd.toFixed(4)}`;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${String(ms)}ms`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictBadge({ verdict, score }: { verdict: QAOutput['verdict']; score: number }) {
  const color = verdict === 'pass' ? 'green' : verdict === 'partial' ? 'yellow' : 'red';
  const icon = verdict === 'pass' ? '✓' : verdict === 'partial' ? '~' : '✗';
  return (
    <Box gap={2}>
      <Text color={color} bold>
        {icon} {verdict.toUpperCase()}
      </Text>
      <Text color="gray">
        score <Text color="white">{score}/100</Text>
      </Text>
    </Box>
  );
}

function IssueRow({ issue }: { issue: QAIssue }) {
  const color =
    issue.severity === 'critical' ? 'red' : issue.severity === 'major' ? 'yellow' : 'gray';
  const tag =
    issue.severity === 'critical' ? '[CRIT]' : issue.severity === 'major' ? '[MAJOR]' : '[minor]';
  return (
    <Box gap={1}>
      <Text color={color}>{tag}</Text>
      <Text color="white">{issue.description}</Text>
      {issue.file && <Text color="gray">({issue.file})</Text>}
    </Box>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  files: 'Files',
  plan: 'Plan',
  diff: 'Diff',
};

function TabBar({ active }: { active: Tab }) {
  const tabs: Tab[] = ['overview', 'files', 'plan', 'diff'];
  return (
    <Box gap={0}>
      {tabs.map((tab, i) => {
        const isActive = tab === active;
        const key = String(i + 1);
        return (
          <Box key={tab} paddingX={1}>
            <Text color={isActive ? 'cyan' : 'gray'} bold={isActive}>
              [{key}] {TAB_LABELS[tab]}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  run: PipelineRun;
  qa: QAOutput | null;
}

function OverviewTab({ run, qa }: OverviewTabProps) {
  const criticalIssues = qa?.issues.filter((i) => i.severity === 'critical') ?? [];
  const majorIssues = qa?.issues.filter((i) => i.severity === 'major') ?? [];
  const minorIssues = qa?.issues.filter((i) => i.severity === 'minor') ?? [];

  return (
    <Box flexDirection="column" gap={1}>
      {/* QA verdict */}
      {qa ? (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            QA verdict
          </Text>
          <VerdictBadge verdict={qa.verdict} score={qa.score} />
          {[...criticalIssues, ...majorIssues, ...minorIssues].map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
          {qa.issues.length === 0 && (
            <Text color="gray" dimColor>
              No issues found
            </Text>
          )}
          {qa.suggestions.length > 0 && (
            <Box flexDirection="column" gap={0} marginTop={1}>
              <Text color="gray" bold>
                Suggestions
              </Text>
              {qa.suggestions.map((s, i) => (
                <Text key={i} color="gray">
                  · {s}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Text color={STATUS_COLORS.failed}>QA step did not complete</Text>
      )}

      {/* Summary */}
      <Box gap={3} marginTop={1}>
        <Text color="gray">
          Cost <Text color="white">{formatCost(run.totalCostUsd)}</Text>
        </Text>
        <Text color="gray">
          Tokens <Text color="white">{run.totalTokens.toLocaleString()}</Text>
        </Text>
        <Text color="gray">
          Time <Text color="white">{formatDuration(run.totalDurationMs)}</Text>
        </Text>
        {run.iterations !== undefined && (
          <Text color="gray">
            Iterations <Text color="yellow">{run.iterations}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ─── Files tab ────────────────────────────────────────────────────────────────

// Max content lines shown in the inline preview
const PREVIEW_LINES = 20;

interface FilesTabProps {
  dev: DevOutput | null;
  selectedIndex: number;
}

function FilesTab({ dev, selectedIndex }: FilesTabProps) {
  if (!dev || dev.files.length === 0) {
    return <Text color="gray">No generated files.</Text>;
  }

  const file = dev.files[selectedIndex];

  return (
    <Box flexDirection="column" gap={1}>
      {/* File list */}
      <Box flexDirection="column" gap={0}>
        {dev.files.map((f, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={f.path} gap={2}>
              <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '▶' : ' '}</Text>
              <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                {f.path}
              </Text>
              {!isSelected && (
                <Text color="gray" dimColor>
                  {f.description}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Content preview of selected file */}
      {file && (
        <Box
          flexDirection="column"
          gap={0}
          marginTop={1}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Text color="gray" dimColor>
            {file.description}
          </Text>
          {file.content
            .split('\n')
            .slice(0, PREVIEW_LINES)
            .map((line, i) => (
              <Text key={i} color="white" dimColor={i === PREVIEW_LINES - 1}>
                {line}
              </Text>
            ))}
          {file.content.split('\n').length > PREVIEW_LINES && (
            <Text color="gray" dimColor>
              … {file.content.split('\n').length - PREVIEW_LINES} more lines (save to view full
              file)
            </Text>
          )}
        </Box>
      )}

      <Text color="gray" dimColor>
        ↑↓ navigate files
      </Text>
    </Box>
  );
}

// ─── Plan tab ─────────────────────────────────────────────────────────────────

interface PlanTabProps {
  planner: PlannerOutput | null;
}

function PlanTab({ planner }: PlanTabProps) {
  if (!planner) {
    return <Text color="gray">Planner step did not complete.</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {/* Architecture */}
      <Box flexDirection="column" gap={0}>
        <Text color="gray" bold>
          Architecture
        </Text>
        <Text color="white">{planner.architecture}</Text>
      </Box>

      {/* Tech stack */}
      {planner.techStack.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            Tech Stack
          </Text>
          <Box gap={2} flexWrap="wrap">
            {planner.techStack.map((t, i) => (
              <Text key={i} color="cyan">
                {t}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Tasks */}
      {planner.tasks.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            Tasks ({planner.tasks.length})
          </Text>
          {planner.tasks.map((task, i) => {
            const deps =
              task.dependsOn.length > 0 ? (
                <Text color="gray" dimColor>
                  {' '}
                  ← {task.dependsOn.join(', ')}
                </Text>
              ) : null;
            return (
              <Box key={task.id} gap={1}>
                <Text color="gray">{String(i + 1)}.</Text>
                <Text color="white">{task.description}</Text>
                {deps}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Estimated files */}
      {planner.estimatedFiles.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            Estimated Files
          </Text>
          {planner.estimatedFiles.map((f, i) => (
            <Text key={i} color="gray">
              · {f}
            </Text>
          ))}
        </Box>
      )}

      {/* Risks */}
      {planner.risks.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            Risks
          </Text>
          {planner.risks.map((r, i) => (
            <Text key={i} color="yellow">
              ⚠ {r}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Artifact rendering ───────────────────────────────────────────────────────

function renderRequirements(po: POOutput): string {
  const lines: string[] = ['# Requirements', ''];

  lines.push('## Goal', po.clarifiedGoal, '');

  if (po.requirements.length > 0) {
    lines.push('## Requirements');
    po.requirements.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  if (po.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    po.acceptanceCriteria.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  if (po.constraints.length > 0) {
    lines.push('## Constraints');
    po.constraints.forEach((c) => lines.push(`- ${c}`));
    lines.push('');
  }

  if (po.assumptions.length > 0) {
    lines.push('## Assumptions');
    po.assumptions.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  lines.push(`## Complexity`, po.complexity);
  return lines.join('\n');
}

function renderPlan(planner: PlannerOutput): string {
  const lines: string[] = ['# Architecture Plan', ''];

  lines.push('## Overview', planner.architecture, '');

  if (planner.techStack.length > 0) {
    lines.push('## Tech Stack');
    planner.techStack.forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  }

  if (planner.tasks.length > 0) {
    lines.push('## Tasks');
    planner.tasks.forEach((t, i) => {
      const deps = t.dependsOn.length > 0 ? ` (depends: ${t.dependsOn.join(', ')})` : '';
      lines.push(`${String(i + 1)}. [${t.id}] ${t.description}${deps}`);
    });
    lines.push('');
  }

  if (planner.estimatedFiles.length > 0) {
    lines.push('## Estimated Files');
    planner.estimatedFiles.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }

  if (planner.risks.length > 0) {
    lines.push('## Risks');
    planner.risks.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  return lines.join('\n');
}

// ─── File save ────────────────────────────────────────────────────────────────

async function saveArtifacts(
  run: PipelineRun,
  dev: DevOutput,
  po: POOutput | null,
  planner: PlannerOutput | null,
): Promise<string> {
  const outputDir = join(process.cwd(), 'output', run.id);

  // Code files from Dev agent
  for (const file of dev.files) {
    const dest = join(outputDir, file.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, file.content, 'utf8');
  }

  await mkdir(outputDir, { recursive: true });

  // Markdown artifacts
  if (po) {
    await writeFile(join(outputDir, 'requirements.md'), renderRequirements(po), 'utf8');
  }
  if (planner) {
    await writeFile(join(outputDir, 'plan.md'), renderPlan(planner), 'utf8');
  }

  return outputDir;
}

// ─── Diff tab ─────────────────────────────────────────────────────────────────

const MAX_DIFF_LINES = 150;

function DiffTab() {
  const [stat, setStat] = useState<string>('');
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [statResult, diffResult] = await Promise.all([
          execAsync('git diff HEAD --stat'),
          execAsync('git diff HEAD'),
        ]);
        setStat(statResult.stdout.trim());
        setDiff(diffResult.stdout.trim());
      } catch {
        setStat('');
        setDiff('');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Text color="gray" dimColor>
        Lecture du diff…
      </Text>
    );
  }

  if (!diff) {
    return (
      <Text color="gray" dimColor>
        Aucune modification Git. Utilisez --apply pour appliquer les changements.
      </Text>
    );
  }

  const lines = diff.split('\n').slice(0, MAX_DIFF_LINES);

  return (
    <Box flexDirection="column" gap={1}>
      {stat.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color="gray" bold>
            Résumé
          </Text>
          {stat.split('\n').map((line, i) => (
            <Text key={i} color="gray">
              {line}
            </Text>
          ))}
        </Box>
      )}
      <Box flexDirection="column" gap={0}>
        <Text color="gray" bold>
          Diff
        </Text>
        {lines.map((line, i) => {
          const color = line.startsWith('+')
            ? 'green'
            : line.startsWith('-')
              ? 'red'
              : line.startsWith('@@')
                ? 'cyan'
                : 'gray';
          const dim = !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@@');
          return (
            <Text key={i} color={color} {...(dim ? { dimColor: true } : {})}>
              {line}
            </Text>
          );
        })}
        {diff.split('\n').length > MAX_DIFF_LINES && (
          <Text color="gray" dimColor>
            … {diff.split('\n').length - MAX_DIFF_LINES} lignes supplémentaires
          </Text>
        )}
      </Box>
    </Box>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface ResultsScreenProps {
  run: PipelineRun;
  onNewPipeline?: () => void;
  readOnly?: boolean;
  onCompanionChange?: OnCompanionChange;
}

export function ResultsScreen({
  run,
  onNewPipeline,
  readOnly,
  onCompanionChange,
}: ResultsScreenProps) {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedFile, setSelectedFile] = useState(0);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const qa = parseStepOutput(run, 'qa') as QAOutput | null;
  const dev = parseStepOutput(run, 'dev') as DevOutput | null;
  const po = parseStepOutput(run, 'po') as POOutput | null;
  const planner = parseStepOutput(run, 'planner') as PlannerOutput | null;
  const fileCount = dev?.files.length ?? 0;

  useEffect(() => {
    onCompanionChange?.({ state: 'done' });
  }, []);

  useInput((input, key) => {
    // Tab switching
    if (input === '1') setTab('overview');
    if (input === '2') setTab('files');
    if (input === '3') setTab('plan');
    if (input === '4') setTab('diff');

    // File navigation (only on files tab)
    if (tab === 'files') {
      if (key.upArrow) setSelectedFile((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectedFile((i) => Math.min(Math.max(0, fileCount - 1), i + 1));
    }

    // Actions
    if (input === 'q') app.exit();
    if (input === 'r' && !readOnly && onNewPipeline) onNewPipeline();
    if (input === 's' && !readOnly && dev && !saving && !savedPath) {
      setSaving(true);
      void saveArtifacts(run, dev, po, planner)
        .then((path) => {
          setSavedPath(path);
        })
        .finally(() => {
          setSaving(false);
        });
    }
  });

  const runFailed = run.status === 'failed';

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        {/* Intent */}
        <Box gap={1}>
          <Text color="gray">{runFailed ? 'Failed:' : 'Completed:'}</Text>
          <Text color="white" bold>
            "{run.intent}"
          </Text>
        </Box>

        {/* Tab bar */}
        <TabBar active={tab} />

        {/* Tab content */}
        <Box flexDirection="column" marginTop={1}>
          {tab === 'overview' && <OverviewTab run={run} qa={qa} />}
          {tab === 'files' && <FilesTab dev={dev} selectedIndex={selectedFile} />}
          {tab === 'plan' && <PlanTab planner={planner} />}
          {tab === 'diff' && <DiffTab />}
        </Box>

        {/* Save feedback */}
        {saving && <Text color="cyan">Saving files...</Text>}
        {savedPath && (
          <Box flexDirection="column" gap={0}>
            <Text color="green">✓ Saved to {savedPath}</Text>
            <Text color="gray" dimColor>
              code files{po ? ' · requirements.md' : ''}
              {planner ? ' · plan.md' : ''}
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box gap={3} paddingX={1} marginTop={1}>
        {!readOnly && dev && !savedPath && (
          <Text color="gray">
            <Text color="cyan">[s]</Text> save
          </Text>
        )}
        {!readOnly && (
          <Text color="gray">
            <Text color="cyan">[r]</Text> new
          </Text>
        )}
        <Text color="gray">
          <Text color="cyan">[q]</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
