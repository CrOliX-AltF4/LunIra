import React, { useState, useEffect } from 'react';
import { Box, useStdout } from 'ink';
import { TitleBar } from './TitleBar.js';
import { PanelProvider } from './PanelContext.js';
import { IdleView } from './IdleView.js';
import { IncantationBar } from './IncantationBar.js';
import { PipelineScreen } from '../screens/PipelineScreen.js';
import { ResultsScreen } from '../screens/ResultsScreen.js';
import { SetupScreen } from '../screens/SetupScreen.js';
import { ConfigScreen } from '../screens/ConfigScreen.js';
import { WelcomeScreen } from '../screens/WelcomeScreen.js';
import { HistoryScreen } from '../screens/HistoryScreen.js';
import { CostsView } from './CostsView.js';
import { listConfiguredProviders } from '../../providers/config.js';
import type { WorkspaceView } from './types.js';
import type { CompanionState } from '../theme.js';
import type { AgentRole, PipelineRun, PipelineStep } from '../../types/index.js';

interface WorkspaceProps {
  initialIntent?: string;
  skipRoles?: ReadonlySet<AgentRole>;
  startOnWelcome?: boolean;
}

export function Workspace({ initialIntent, skipRoles, startOnWelcome = false }: WorkspaceProps) {
  const { stdout } = useStdout();
  const [cols, setCols] = useState(stdout.columns || 80);

  useEffect(() => {
    const onResize = () => {
      setCols(stdout.columns || 80);
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.removeListener('resize', onResize);
    };
  }, [stdout]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<WorkspaceView>(() => {
    if (startOnWelcome) return 'welcome';
    if (listConfiguredProviders().length === 0) return 'setup';
    return initialIntent ? 'pipeline' : 'prompt';
  });
  const [intent, setIntent] = useState(initialIntent ?? '');
  const [completedRun, setCompletedRun] = useState<PipelineRun | null>(null);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [activePluginIds, setActivePluginIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number | undefined>(undefined);
  const [totalSteps, setTotalSteps] = useState<number | undefined>(undefined);
  const [runTokens, setRunTokens] = useState<number>(0);
  const [runCostUsd, setRunCostUsd] = useState<number>(0);
  const [isDemo, setIsDemo] = useState(false);

  // ── Companion state ─────────────────────────────────────────────────────────
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  // ── Navigation handlers ─────────────────────────────────────────────────────
  const handleIntentFromBar = (value: string) => {
    setIntent(value);
    setCompletedRun(null);
    setCurrentStep(undefined);
    setTotalSteps(undefined);
    setView('pipeline');
    setCompanionState('forging');
  };

  const handleConfigConfirm = (skillIds: string[], pluginIds: string[]) => {
    setActiveSkillIds(skillIds);
    setActivePluginIds(pluginIds);
    setView('prompt');
    setCompanionState('idle');
  };

  const handlePipelineComplete = (run: PipelineRun) => {
    setCompletedRun(run);
    setView('results');
    setCompanionState('done');
  };

  const handleStepsChange = (steps: PipelineStep[]) => {
    const active = steps.filter((s) => s.status !== 'skipped');
    const done = active.filter((s) => s.status === 'completed' || s.status === 'failed');
    if (active.length > 0) {
      setCurrentStep(Math.min(done.length + 1, active.length));
      setTotalSteps(active.length);
    }
    const tokens = steps.reduce((sum, s) => sum + (s.tokensUsed ?? 0), 0);
    const cost = steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
    if (tokens > 0) setRunTokens(tokens);
    if (cost > 0) setRunCostUsd(cost);
  };

  const handleNewPipeline = () => {
    setCompletedRun(null);
    setIntent('');
    setIsDemo(false);
    setActiveSkillIds([]);
    setActivePluginIds([]);
    setCurrentStep(undefined);
    setTotalSteps(undefined);
    setRunTokens(0);
    setRunCostUsd(0);
    setView('prompt');
    setCompanionState('idle');
  };

  const hasActiveConfig = activeSkillIds.length > 0 || activePluginIds.length > 0;

  // ── Slash command router ─────────────────────────────────────────────────────
  const handleCommand = (cmd: string, _args: string) => {
    switch (cmd) {
      case 'history':
      case 'h':
        setView('history');
        break;
      case 'arsenal':
      case 'config':
      case 'c':
        setView('config');
        break;
      case 'setup':
        setView('setup');
        break;
      case 'costs':
        setView('costs');
        break;
      case 'demo':
        setIntent('Demo: JWT authentication REST API');
        setIsDemo(true);
        setCompletedRun(null);
        setCurrentStep(undefined);
        setTotalSteps(undefined);
        setView('pipeline');
        setCompanionState('forging');
        break;
    }
  };

  // ── View ────────────────────────────────────────────────────────────────────
  function renderView() {
    switch (view) {
      case 'welcome':
        return (
          <WelcomeScreen
            onComplete={() => {
              setView(initialIntent ? 'pipeline' : 'prompt');
              setCompanionState('idle');
            }}
          />
        );
      case 'setup':
        return (
          <SetupScreen
            onComplete={() => {
              setView('prompt');
              setCompanionState('idle');
            }}
            onBack={() => {
              setView('prompt');
              setCompanionState('idle');
            }}
          />
        );
      case 'prompt':
        return <IdleView />;
      case 'config':
        return (
          <ConfigScreen
            onConfirm={handleConfigConfirm}
            onBack={() => {
              setView('prompt');
              setCompanionState('idle');
            }}
          />
        );
      case 'results':
        return completedRun ? (
          <ResultsScreen
            run={completedRun}
            onNewPipeline={handleNewPipeline}
            {...(isDemo ? { readOnly: true } : {})}
          />
        ) : null;
      case 'costs':
        return (
          <CostsView
            onBack={() => {
              setView('prompt');
            }}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            onRerun={(intentStr) => {
              setIntent(intentStr);
              setView('pipeline');
            }}
            onBack={() => {
              setView('prompt');
            }}
          />
        );
      default:
        return (
          <PipelineScreen
            intent={intent}
            onComplete={handlePipelineComplete}
            onStepsChange={handleStepsChange}
            {...(isDemo ? { isDemo: true } : {})}
            {...(skipRoles ? { skipRoles } : {})}
            {...(activeSkillIds.length > 0 ? { activeSkillIds } : {})}
            {...(activePluginIds.length > 0 ? { activePluginIds } : {})}
          />
        );
    }
  }

  return (
    <Box flexDirection="column">
      <TitleBar
        companionState={companionState}
        {...(currentStep !== undefined ? { currentStep } : {})}
        {...(totalSteps !== undefined ? { totalSteps } : {})}
        {...(runTokens > 0 ? { runTokens, runCostUsd } : {})}
      />
      <PanelProvider value={{ cols }}>
        <Box flexDirection="column">{renderView()}</Box>
        <IncantationBar
          key={view === 'prompt' ? 'prompt' : 'other'}
          locked={view !== 'prompt'}
          onSubmit={handleIntentFromBar}
          onCommand={handleCommand}
          {...(hasActiveConfig
            ? { activeCount: activeSkillIds.length + activePluginIds.length }
            : {})}
        />
      </PanelProvider>
    </Box>
  );
}
