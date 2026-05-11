import React, { useState } from 'react';
import { PromptScreen } from './screens/PromptScreen.js';
import { PipelineScreen } from './screens/PipelineScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { SetupScreen } from './screens/SetupScreen.js';
import { ConfigScreen } from './screens/ConfigScreen.js';
import { listConfiguredProviders } from '../providers/config.js';
import type { AgentRole, PipelineRun } from '../types/index.js';

type Screen = 'setup' | 'prompt' | 'config' | 'pipeline' | 'results';

interface AppProps {
  initialIntent?: string;
  skipRoles?: ReadonlySet<AgentRole>;
}

export function App({ initialIntent, skipRoles }: AppProps) {
  const [screen, setScreen] = useState<Screen>(() => {
    if (listConfiguredProviders().length === 0) return 'setup';
    return initialIntent ? 'pipeline' : 'prompt';
  });
  const [intent, setIntent] = useState(initialIntent ?? '');
  const [completedRun, setCompletedRun] = useState<PipelineRun | null>(null);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [activePluginIds, setActivePluginIds] = useState<string[]>([]);

  const handleIntentSubmit = (value: string) => {
    setIntent(value);
    setScreen('config');
  };

  const handleConfigConfirm = (skillIds: string[], pluginIds: string[]) => {
    setActiveSkillIds(skillIds);
    setActivePluginIds(pluginIds);
    setScreen('pipeline');
  };

  const handlePipelineComplete = (run: PipelineRun) => {
    setCompletedRun(run);
    setScreen('results');
  };

  const handleNewPipeline = () => {
    setCompletedRun(null);
    setIntent('');
    setActiveSkillIds([]);
    setActivePluginIds([]);
    setScreen('prompt');
  };

  if (screen === 'setup') {
    return (
      <SetupScreen
        onComplete={() => {
          setScreen('prompt');
        }}
      />
    );
  }

  if (screen === 'prompt') {
    return <PromptScreen onSubmit={handleIntentSubmit} />;
  }

  if (screen === 'config') {
    return (
      <ConfigScreen
        onConfirm={handleConfigConfirm}
        onBack={() => {
          setScreen('prompt');
        }}
      />
    );
  }

  if (screen === 'results' && completedRun) {
    return <ResultsScreen run={completedRun} onNewPipeline={handleNewPipeline} />;
  }

  return (
    <PipelineScreen
      intent={intent}
      onComplete={handlePipelineComplete}
      {...(skipRoles ? { skipRoles } : {})}
      {...(activeSkillIds.length > 0 ? { activeSkillIds } : {})}
      {...(activePluginIds.length > 0 ? { activePluginIds } : {})}
    />
  );
}
