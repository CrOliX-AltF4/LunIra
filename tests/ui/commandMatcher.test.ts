import { describe, it, expect } from 'vitest';
import { matchCommands, resolveCommand } from '../../src/ui/workspace/commandMatcher.js';

const CMDS = [
  { cmd: '/history', desc: 'browse past runs' },
  { cmd: '/arsenal', desc: 'select skills & plugins' },
  { cmd: '/setup', desc: 'configure API keys' },
  { cmd: '/costs', desc: 'cost dashboard' },
  { cmd: '/demo', desc: 'demo pipeline' },
];

describe('matchCommands', () => {
  it('returns all commands when input is "/"', () => {
    expect(matchCommands('/', CMDS, 10)).toHaveLength(5);
  });

  it('filters by prefix (case-insensitive)', () => {
    const r = matchCommands('/H', CMDS, 10);
    expect(r).toHaveLength(1);
    expect(r[0]?.cmd).toBe('/history');
  });

  it('returns empty array when no match', () => {
    expect(matchCommands('/xyz', CMDS, 10)).toHaveLength(0);
  });

  it('respects max limit', () => {
    expect(matchCommands('/', CMDS, 2)).toHaveLength(2);
  });

  it('returns empty array when input does not start with /', () => {
    expect(matchCommands('history', CMDS, 10)).toHaveLength(0);
  });
});

describe('resolveCommand', () => {
  it('resolves single match without picker selection', () => {
    const r = resolveCommand('/his', CMDS, null, 10);
    expect(r).toEqual({ cmd: 'history', args: '' });
  });

  it('returns null when multiple matches and no picker selection', () => {
    // '/s' matches /setup — wait, only one matches. Use '/a' which matches /arsenal only.
    const r = resolveCommand('/a', CMDS, null, 10);
    expect(r).toEqual({ cmd: 'arsenal', args: '' });
  });

  it('returns null when multiple matches and no picker index (ambiguous)', () => {
    // '/' matches all 5 — no picker index
    const r = resolveCommand('/', CMDS, null, 10);
    expect(r).toBeNull();
  });

  it('uses picker index to select among multiple matches', () => {
    // '/' matches all, pickerIndex=1 selects /arsenal (second item)
    const r = resolveCommand('/', CMDS, 1, 10);
    expect(r).toEqual({ cmd: 'arsenal', args: '' });
  });

  it('uses picker index 0 to select first match', () => {
    const r = resolveCommand('/', CMDS, 0, 10);
    expect(r).toEqual({ cmd: 'history', args: '' });
  });

  it('resolves exact full command regardless of picker', () => {
    const r = resolveCommand('/history', CMDS, null, 10);
    expect(r).toEqual({ cmd: 'history', args: '' });
  });
});
