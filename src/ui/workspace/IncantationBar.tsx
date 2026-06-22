// src/ui/workspace/IncantationBar.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { GOLD } from '../theme.js';
import { Separator } from '../components/Separator.js';
import { matchCommands, resolveCommand, SLASH_COMMANDS } from './commandMatcher.js';

const MAX_HINTS = 5;

interface IncantationBarProps {
  locked: boolean;
  onSubmit: (intent: string) => void;
  onCommand?: (cmd: string, args: string) => void;
  activeCount?: number;
  intentHistory?: string[];
}

export function IncantationBar({
  locked,
  onSubmit,
  onCommand,
  activeCount,
  intentHistory = [],
}: IncantationBarProps) {
  const [value, setValue] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const inSlashMode = value.startsWith('/');
  const matchedCommands = inSlashMode ? matchCommands(value, SLASH_COMMANDS, MAX_HINTS) : [];

  useInput(
    (_input, key) => {
      if (inSlashMode) {
        if (key.upArrow && matchedCommands.length > 0) {
          setPickerIndex((i) => (i === null || i === 0 ? matchedCommands.length - 1 : i - 1));
          return;
        }
        if (key.downArrow && matchedCommands.length > 0) {
          setPickerIndex((i) => (i === null || i >= matchedCommands.length - 1 ? 0 : i + 1));
          return;
        }
        if (key.escape) {
          setValue('');
          setPickerIndex(null);
          return;
        }
        return; // don't fall through to history navigation in slash mode
      }

      // Intent history navigation
      if (intentHistory.length === 0) return;
      if (key.upArrow) {
        const newIndex =
          historyIndex === null ? intentHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setValue(intentHistory[newIndex] ?? '');
      } else if (key.downArrow) {
        if (historyIndex === null || historyIndex === intentHistory.length - 1) return;
        const newIndex = historyIndex + 1;
        if (newIndex >= intentHistory.length) {
          setHistoryIndex(null);
          setValue('');
        } else {
          setHistoryIndex(newIndex);
          setValue(intentHistory[newIndex] ?? '');
        }
      }
    },
    { isActive: !locked },
  );

  const handleChange = (val: string) => {
    setValue(val);
    setHistoryIndex(null);
    setPickerIndex(null); // reset picker when user types
  };

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setValue('');
    setHistoryIndex(null);
    setPickerIndex(null);

    if (trimmed.startsWith('/')) {
      const resolved = resolveCommand(trimmed, SLASH_COMMANDS, pickerIndex, MAX_HINTS);
      if (resolved) {
        onCommand?.(resolved.cmd, resolved.args);
      }
      // if ambiguous (null), do nothing — user needs to be more specific or use ↑/↓
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={0}>
        {locked ? (
          <Box gap={1}>
            <Text color="gray" dimColor>
              ▣ Forging — incantation locked
            </Text>
          </Box>
        ) : (
          <>
            {/* Slash command picker */}
            {matchedCommands.length > 0 && (
              <Box flexDirection="column" marginBottom={1}>
                {matchedCommands.map(({ cmd, desc }, idx) => {
                  const isActive = idx === pickerIndex;
                  return (
                    <Box key={cmd} gap={2}>
                      <Text color={isActive ? 'white' : GOLD} bold={isActive}>
                        {isActive ? '▶ ' : '  '}
                        {cmd}
                      </Text>
                      <Text color="gray" dimColor={!isActive}>
                        {desc}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            )}

            <Box borderStyle="single" borderColor={GOLD} paddingX={1}>
              <Box gap={1}>
                <Text>{chalk.hex(GOLD)('›')}</Text>
                <TextInput
                  value={value}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  placeholder="a REST API to manage users… or /command"
                />
              </Box>
            </Box>

            <Box gap={3} marginTop={1}>
              <Text color="gray" dimColor>
                <Text>{chalk.hex(GOLD)('[↵]')}</Text>
                <Text color="gray"> fire the forge</Text>
              </Text>
              <Text color="gray" dimColor>
                <Text>{chalk.hex(GOLD)('[/]')}</Text>
                <Text color="gray"> commands · ↑↓ navigate · Esc cancel</Text>
              </Text>
              {intentHistory.length > 0 && (
                <Text color="gray" dimColor>
                  <Text>{chalk.hex(GOLD)('[↑/↓]')}</Text>
                  <Text color="gray"> history</Text>
                </Text>
              )}
              {activeCount !== undefined && activeCount > 0 && (
                <Text color="yellow">⚙ {String(activeCount)} active</Text>
              )}
              <Text color="gray" dimColor>
                <Text>{chalk.hex(GOLD)('[ctrl+c]')}</Text>
                <Text color="gray"> quit</Text>
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
