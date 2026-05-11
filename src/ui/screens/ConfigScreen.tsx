import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SkillRegistry } from '../../skills/registry.js';
import { PluginRegistry } from '../../plugins/registry.js';
import type { Skill } from '../../skills/types.js';
import type { Plugin } from '../../plugins/types.js';

interface ConfigScreenProps {
  onConfirm: (activeSkillIds: string[], activePluginIds: string[]) => void;
  onBack: () => void;
}

type Item = { kind: 'skill'; item: Skill } | { kind: 'plugin'; item: Plugin };

const skillRegistry = new SkillRegistry();
const pluginRegistry = new PluginRegistry();

export function ConfigScreen({ onConfirm, onBack }: ConfigScreenProps) {
  const allItems: Item[] = [
    ...skillRegistry.getAll().map((s): Item => ({ kind: 'skill', item: s })),
    ...pluginRegistry.getAll().map((p): Item => ({ kind: 'plugin', item: p })),
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

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
    if (key.escape || input === 'q') onBack();
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Box paddingX={1}>
        <Text bold color="cyan">
          Skills & Plugins
        </Text>
        <Text dimColor> Space = toggle · Enter = confirm · q = back</Text>
      </Box>
      <Box flexDirection="column" paddingX={1} gap={0}>
        {allItems.map((entry, idx) => {
          const { item } = entry;
          const isSelected = idx === selectedIdx;
          const isActive = activeIds.has(item.id);
          return (
            <Box key={item.id}>
              <Text {...(isSelected ? { color: 'cyan' as const } : {})}>
                {isSelected ? '▸ ' : '  '}
                {isActive ? '[✓] ' : '[ ] '}
                <Text bold={isActive}>{item.name}</Text>
                <Text dimColor>
                  {' '}
                  {entry.kind} · {item.role}
                </Text>
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
