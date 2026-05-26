import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { Header } from '../components/Header.js';
import type { ProviderName } from '../../types/index.js';
import { setApiKey, getApiKey } from '../../providers/config.js';

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderInfo {
  name: ProviderName;
  label: string;
  url: string;
  free: boolean;
  envVar: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'openrouter',
    label: 'OpenRouter',
    url: 'openrouter.ai',
    free: true,
    envVar: 'OPENROUTER_API_KEY',
  },
  { name: 'groq', label: 'Groq', url: 'console.groq.com', free: true, envVar: 'GROQ_API_KEY' },
  {
    name: 'claude',
    label: 'Claude',
    url: 'console.anthropic.com',
    free: false,
    envVar: 'ANTHROPIC_API_KEY',
  },
  {
    name: 'openai',
    label: 'OpenAI',
    url: 'platform.openai.com',
    free: false,
    envVar: 'OPENAI_API_KEY',
  },
  {
    name: 'gemini',
    label: 'Gemini',
    url: 'aistudio.google.com',
    free: true,
    envVar: 'GOOGLE_API_KEY',
  },
  {
    name: 'nim',
    label: 'NIM',
    url: 'build.nvidia.com',
    free: true,
    envVar: 'NIM_API_KEY',
  },
  {
    name: 'ollama',
    label: 'Ollama',
    url: 'localhost:11434',
    free: true,
    envVar: 'OLLAMA_HOST',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const app = useApp();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [entering, setEntering] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [configured, setConfigured] = useState<Set<ProviderName>>(
    () => new Set(PROVIDERS.map((p) => p.name).filter((n) => !!getApiKey(n))),
  );

  const focusedProvider = PROVIDERS[focusedIndex];
  const hasOne = configured.size > 0;

  useInput((input, key) => {
    if (entering) return;
    if (input === 'q') app.exit();
    if (key.upArrow) setFocusedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusedIndex((i) => Math.min(PROVIDERS.length - 1, i + 1));
    if (key.return) setEntering(true);
    if (input === 'c' && hasOne) onComplete();
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (focusedProvider?.name === 'ollama') {
      // Ollama needs no API key — mark as acknowledged
      setConfigured((prev) => new Set([...prev, 'ollama']));
    } else if (trimmed && focusedProvider) {
      setApiKey(focusedProvider.name, trimmed);
      setConfigured((prev) => new Set([...prev, focusedProvider.name]));
    }
    setInputValue('');
    setEntering(false);
  };

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Header />

      <Box flexDirection="column" paddingX={1} gap={1}>
        <Text color="cyan" bold>
          Provider setup
        </Text>
        <Text color="gray">
          You need at least one API key to run pipelines. Groq and Gemini are free.
        </Text>

        {/* Provider list */}
        <Box flexDirection="column" marginTop={1} gap={0}>
          {PROVIDERS.map((p, i) => {
            const isConfigured = configured.has(p.name);
            const isFocused = i === focusedIndex;
            return (
              <Box key={p.name} gap={2}>
                <Text color="cyan">{isFocused ? '▶' : ' '}</Text>
                <Box width={2}>
                  <Text color={isConfigured ? 'green' : 'gray'}>{isConfigured ? '✓' : '○'}</Text>
                </Box>
                <Box width={8}>
                  <Text color={isFocused ? 'white' : 'gray'} bold={isFocused}>
                    {p.label}
                  </Text>
                </Box>
                <Text color="gray" dimColor={!isFocused}>
                  {p.url}
                </Text>
                {p.free && (
                  <Text color="green" dimColor>
                    free
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Key input */}
        {entering && focusedProvider && (
          <Box
            flexDirection="column"
            gap={0}
            marginTop={1}
            borderStyle="round"
            borderColor="cyan"
            paddingX={2}
            paddingY={1}
          >
            <Text color="gray">
              {focusedProvider.name === 'ollama'
                ? 'Ollama doit tourner localement. Installez-le sur ollama.ai. Pas de clé requise.'
                : `Get your key at ${focusedProvider.url} or set env var ${focusedProvider.envVar}`}
            </Text>
            <Box gap={1} marginTop={1}>
              <Text color="cyan">›</Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                placeholder="paste your API key and press Enter"
                mask="*"
              />
            </Box>
            <Text color="gray" dimColor>
              Press <Text color="cyan">Enter</Text> to save · leave empty to cancel
            </Text>
          </Box>
        )}

        {/* Alt: .env file */}
        {!entering && (
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Alternatively, create a <Text color="white">.env</Text> file in your project with{' '}
              <Text color="white">GROQ_API_KEY=...</Text>
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box gap={3} paddingX={1} marginTop={1}>
        <Text color="gray">
          <Text color="cyan">[↑↓]</Text> navigate
        </Text>
        <Text color="gray">
          <Text color="cyan">[↵]</Text> enter key
        </Text>
        {hasOne && (
          <Text color="gray">
            <Text color="green">[c]</Text> continue
          </Text>
        )}
        <Text color="gray">
          <Text color="cyan">[q]</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
