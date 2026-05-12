import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { PipelineStep } from '../../types/index.js';
import { STATUS_ICONS, STATUS_COLORS, PROVIDER_COLORS, ROLE_LABELS } from '../theme.js';
import { getModelById } from '../../models/catalog.js';
import { formatStepBreakdown } from '../formatters.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => {
      clearInterval(t);
    };
  }, []);
  return <Text color="cyan">{SPINNER_FRAMES[frame]}</Text>;
}

/** Counts elapsed seconds from the moment it becomes active. Resets on deactivation. */
function ElapsedTimer({ active }: { active: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, [active]);

  if (!active) return null;
  return <Text color="cyan"> · {elapsed}s</Text>;
}

interface StepRowProps {
  step: PipelineStep;
  focused: boolean;
  /** 1-based position in the pipeline (e.g. 2 of 4). */
  stepNumber: number;
  totalSteps: number;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${String(ms)}ms`;
}

function formatCost(usd: number): string {
  return usd < 0.001 ? `$${(usd * 1000).toFixed(3)}m` : `$${usd.toFixed(4)}`;
}

export function StepRow({ step, focused, stepNumber, totalSteps }: StepRowProps) {
  const isRunning = step.status === 'running';
  const iconColor = STATUS_COLORS[step.status];
  const model = step.modelId ? getModelById(step.modelId) : undefined;
  const providerColor = model ? PROVIDER_COLORS[model.provider] : 'gray';
  const breakdown = formatStepBreakdown(step);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        {/* Focus indicator */}
        <Text color="cyan">{focused ? '▶' : ' '}</Text>

        {/* Status icon / spinner */}
        <Box width={2}>
          {isRunning ? <Spinner /> : <Text color={iconColor}>{STATUS_ICONS[step.status]}</Text>}
        </Box>

        {/* [N/total] badge — visible only while this step is running */}
        <Box width={6}>
          {isRunning ? (
            <Text color="cyan" bold>
              [{stepNumber}/{totalSteps}]
            </Text>
          ) : (
            <Text> </Text>
          )}
        </Box>

        {/* Role */}
        <Text bold color={step.status === 'pending' ? 'gray' : 'white'}>
          {ROLE_LABELS[step.role]}
        </Text>

        {/* Model badge */}
        <Box width={22}>
          {model ? (
            <Text color={providerColor}>[{model.displayName}]</Text>
          ) : (
            <Text color="gray">[no model]</Text>
          )}
        </Box>

        {/* Status message + live elapsed timer */}
        <Box>
          <Text color={iconColor} dimColor={step.status === 'pending'}>
            {step.status === 'pending' && 'Waiting'}
            {isRunning && 'Running'}
            {step.status === 'completed' && 'Done'}
            {step.status === 'failed' && (step.error ?? 'Failed')}
            {step.status === 'skipped' && 'Skipped'}
          </Text>
          <ElapsedTimer active={isRunning} />
        </Box>

        {/* Final metrics (shown after completion) */}
        {step.durationMs !== undefined && (
          <Text color="gray"> {formatDuration(step.durationMs)}</Text>
        )}
        {step.tokensUsed !== undefined && (
          <Text color="gray"> {step.tokensUsed.toLocaleString()} tok</Text>
        )}
        {step.costUsd !== undefined && <Text color="gray"> {formatCost(step.costUsd)}</Text>}
      </Box>
      {breakdown.length > 0 && <Text dimColor>{breakdown}</Text>}
    </Box>
  );
}
