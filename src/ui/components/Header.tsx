import React from 'react';
import { Box, Text } from 'ink';
import { useSystemMetrics } from '../hooks/useSystemMetrics.js';

const VERSION = '0.3.0';

export function Header() {
  const { cpuUsagePercent, memUsedMb, memTotalMb } = useSystemMetrics();

  const memUsedGb = (memUsedMb / 1024).toFixed(1);
  const memTotalGb = (memTotalMb / 1024).toFixed(1);
  const cpuColor = cpuUsagePercent > 80 ? 'red' : cpuUsagePercent > 50 ? 'yellow' : 'green';

  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Box gap={1}>
        <Text color="cyan" bold>
          ⚡ Lun'Atar
        </Text>
        <Text color="gray">v{VERSION}</Text>
      </Box>
      <Box gap={2}>
        <Box gap={1}>
          <Text color="gray">CPU</Text>
          <Text color={cpuColor} bold>
            {cpuUsagePercent}%
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="gray">RAM</Text>
          <Text color="white">
            {memUsedGb}
            <Text color="gray">/{memTotalGb} GB</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
