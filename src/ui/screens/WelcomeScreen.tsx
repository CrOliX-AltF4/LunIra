import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Header } from '../components/Header.js';
import { SetupScreen } from './SetupScreen.js';
import { setApiKey } from '../../providers/config.js';

type WelcomeMode = 'choose' | 'simple-key' | 'expert';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const MODES = [
  {
    key: 'simple' as const,
    label: 'Simple',
    desc: 'Une seule clé OpenRouter — accès à 200+ modèles dont des gratuits',
  },
  {
    key: 'expert' as const,
    label: 'Expert',
    desc: 'Configurer chaque provider séparément (Groq, Claude, OpenAI…)',
  },
];

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [mode, setMode] = useState<WelcomeMode>('choose');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');

  useInput((input, key) => {
    if (mode !== 'choose') return;
    if (key.upArrow) setFocusedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusedIndex((i) => Math.min(MODES.length - 1, i + 1));
    if (input === '1') {
      setFocusedIndex(0);
    }
    if (input === '2') {
      setFocusedIndex(1);
    }
    if (key.return) {
      if (focusedIndex === 0) setMode('simple-key');
      else setMode('expert');
    }
  });

  const handleKeySubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      setApiKey('openrouter', trimmed);
    }
    onComplete();
  };

  if (mode === 'expert') {
    return React.createElement(SetupScreen, { onComplete });
  }

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Header />

      <Box flexDirection="column" paddingX={1} gap={1}>
        <Text color="cyan" bold>
          Bienvenue dans LunAtar !
        </Text>
        <Text color="gray">
          Pipeline multi-agent IA pour générer du code production-ready depuis une intention.
        </Text>

        {mode === 'choose' && (
          <>
            <Text color="white" bold>
              Choisissez votre mode de configuration :
            </Text>
            <Box flexDirection="column" marginTop={1} gap={1}>
              {MODES.map((m, i) => (
                <Box key={m.key} flexDirection="column">
                  <Box gap={2}>
                    <Text color="cyan">{focusedIndex === i ? '▶' : ' '}</Text>
                    <Text color={focusedIndex === i ? 'white' : 'gray'} bold={focusedIndex === i}>
                      [{i + 1}] {m.label}
                    </Text>
                  </Box>
                  <Box marginLeft={4}>
                    <Text color="gray" dimColor={focusedIndex !== i}>
                      {m.desc}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box gap={3} marginTop={1}>
              <Text color="gray">
                <Text color="cyan">[↑↓]</Text> naviguer
              </Text>
              <Text color="gray">
                <Text color="cyan">[↵]</Text> confirmer
              </Text>
              <Text color="gray">
                <Text color="cyan">[1][2]</Text> sélection rapide
              </Text>
            </Box>
          </>
        )}

        {mode === 'simple-key' && (
          <Box flexDirection="column" gap={1}>
            <Text color="white" bold>
              Clé OpenRouter
            </Text>
            <Text color="gray">
              Créez un compte sur <Text color="cyan">openrouter.ai</Text> et copiez votre clé API.
            </Text>
            <Text color="gray" dimColor>
              Des modèles gratuits sont disponibles — pas de CB requise pour commencer.
            </Text>
            <Box
              flexDirection="column"
              marginTop={1}
              borderStyle="round"
              borderColor="cyan"
              paddingX={2}
              paddingY={1}
            >
              <Box gap={1}>
                <Text color="cyan">›</Text>
                <TextInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleKeySubmit}
                  placeholder="sk-or-v1-..."
                  mask="*"
                />
              </Box>
              <Text color="gray" dimColor>
                Appuyez sur <Text color="cyan">Entrée</Text> pour continuer · vide pour passer
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
