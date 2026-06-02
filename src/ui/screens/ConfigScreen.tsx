import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';
import { Separator } from '../components/Separator.js';
import { GOLD } from '../theme.js';
import type { OnCompanionChange } from '../workspace/types.js';
import { SkillRegistry } from '../../skills/registry.js';
import { PluginRegistry } from '../../plugins/registry.js';
import type { Skill } from '../../skills/types.js';
import type { Plugin } from '../../plugins/types.js';

interface ConfigScreenProps {
  onConfirm: (activeSkillIds: string[], activePluginIds: string[]) => void;
  onBack: () => void;
  onCompanionChange?: OnCompanionChange;
}

type Item = { kind: 'skill'; item: Skill } | { kind: 'plugin'; item: Plugin };

const skillRegistry = new SkillRegistry();
const pluginRegistry = new PluginRegistry();

export function ConfigScreen({ onConfirm, onBack, onCompanionChange }: ConfigScreenProps) {
  const allItems: Item[] = [
    ...skillRegistry.getAll().map((s): Item => ({ kind: 'skill', item: s })),
    ...pluginRegistry.getAll().map((p): Item => ({ kind: 'plugin', item: p })),
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    onCompanionChange?.({ state: 'thinking', poSpeech: 'Pesant ton arsenal...' });
  }, []);

  useInput((input, key) => {
    if (key.upArrow) setSelectedIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIdx((i) => Math.min(allItems.length - 1, i + 1));
    if (input === ' ') {
      const id = allItems[selectedIdx]?.item.id ?? '';
      if (!id) return;
      setActiveIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    if (key.return) {
      const activeSkillIds = allItems
        .filter((x) => x.kind === 'skill' && activeIds.has(x.item.id))
        .map((x) => x.item.id);
      const activePluginIds = allItems
        .filter((x) => x.kind === 'plugin' && activeIds.has(x.item.id))
        .map((x) => x.item.id);
      onConfirm(activeSkillIds, activePluginIds);
    }
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        <Text color="white" bold>
          Arsenal — skills & plugins
        </Text>

        <Box flexDirection="column" gap={0}>
          {allItems.map((entry, idx) => {
            const { item } = entry;
            const isSelected = idx === selectedIdx;
            const isActive = activeIds.has(item.id);
            const prevKind = idx > 0 ? allItems[idx - 1]?.kind : null;
            const showCategoryHeader = prevKind !== entry.kind;
            return (
              <Box key={item.id} flexDirection="column">
                {showCategoryHeader && (
                  <Box marginTop={idx > 0 ? 1 : 0}>
                    <Text color="gray" dimColor>
                      {'─'.repeat(3)} {entry.kind === 'skill' ? 'SKILLS' : 'PLUGINS'}{' '}
                      {'─'.repeat(3)}
                    </Text>
                  </Box>
                )}
                <Box gap={2}>
                  <Text>{isSelected ? chalk.hex(GOLD)('▶') : ' '}</Text>
                  <Text color={isActive ? 'white' : 'gray'}>
                    {isActive ? chalk.hex(GOLD)('[✓]') : chalk.gray('[ ]')}
                  </Text>
                  <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                    {item.name}
                  </Text>
                  {isSelected ? (
                    <Text color="gray">{item.description}</Text>
                  ) : (
                    <Text color="gray" dimColor>
                      {item.role}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box gap={3} marginTop={1}>
          <Text color="gray" dimColor>
            <Text>{chalk.hex(GOLD)('[↑↓]')}</Text>
            <Text color="gray"> navigate</Text>
          </Text>
          <Text color="gray" dimColor>
            <Text>{chalk.hex(GOLD)('[space]')}</Text>
            <Text color="gray"> toggle</Text>
          </Text>
          <Text color="gray" dimColor>
            <Text>{chalk.hex(GOLD)('[↵]')}</Text>
            <Text color="gray"> confirm</Text>
          </Text>
          <Text color="gray" dimColor>
            <Text>{chalk.hex(GOLD)('[Esc]')}</Text>
            <Text color="gray"> back</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
