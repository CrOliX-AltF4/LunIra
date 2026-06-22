// src/ui/workspace/commandMatcher.ts
export interface SlashCommand {
  cmd: string;
  desc: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/history', desc: 'annales — browse past runs' },
  { cmd: '/arsenal', desc: 'select skills & plugins for next run' },
  { cmd: '/setup', desc: 'arm the forge — configure API keys' },
  { cmd: '/costs', desc: 'combustible — cost dashboard' },
  { cmd: '/demo', desc: 'demo pipeline — no API key needed' },
  { cmd: '/ask', desc: 'single-turn question to LLM' },
];

export function matchCommands(
  input: string,
  commands: SlashCommand[],
  max: number,
): SlashCommand[] {
  if (!input.startsWith('/')) return [];
  const lower = input.toLowerCase();
  return commands.filter((c) => c.cmd.startsWith(lower)).slice(0, max);
}

/**
 * Resolves which command to execute given partial input and picker state.
 * Returns null when input is ambiguous and no picker index is set.
 */
export function resolveCommand(
  input: string,
  commands: SlashCommand[],
  pickerIndex: number | null,
  max: number,
): { cmd: string; args: string } | null {
  if (!input.startsWith('/')) return null;
  const matches = matchCommands(input, commands, max);
  if (matches.length === 0) return null;

  const selected =
    (pickerIndex !== null && pickerIndex < matches.length ? matches[pickerIndex] : null) ??
    (matches.length === 1 ? matches[0] : null);

  if (!selected) return null;

  const parts = selected.cmd.slice(1).split(' ');
  return { cmd: parts[0] ?? '', args: parts.slice(1).join(' ') };
}
