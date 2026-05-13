import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as wc from '../../src/cli/workspace-context.js';
import { readFile } from 'node:fs/promises';

vi.mock('node:fs/promises');

const mockReadFile = vi.mocked(readFile);
const mockExecAsync = vi.spyOn(wc.deps, 'execAsync');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('gatherWorkspaceContext', () => {
  it('includes project name and version from package.json', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: 'my-app',
        version: '1.2.3',
        description: 'A cool app',
        dependencies: { lodash: '*' },
        devDependencies: { vitest: '*' },
      }),
    );
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    const ctx = await wc.gatherWorkspaceContext('/project');
    expect(ctx).toContain('my-app');
    expect(ctx).toContain('1.2.3');
    expect(ctx).toContain('A cool app');
    expect(ctx).toContain('2 deps');
  });

  it('includes git changes when working tree is dirty', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ name: 'x', version: '0.1.0' }));
    mockExecAsync.mockResolvedValue({ stdout: ' M src/index.ts\nA  src/new.ts\n', stderr: '' });
    const ctx = await wc.gatherWorkspaceContext('/project');
    expect(ctx).toContain('src/index.ts');
    expect(ctx).toContain('src/new.ts');
  });

  it('shows "Git: clean" when working tree is clean', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ name: 'x', version: '0.1.0' }));
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    const ctx = await wc.gatherWorkspaceContext('/project');
    expect(ctx).toContain('Git: clean');
  });

  it('falls back gracefully when package.json is missing', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
    const ctx = await wc.gatherWorkspaceContext('/project');
    expect(ctx).toContain('[Workspace context]');
    expect(ctx).toContain('project');
  });

  it('skips git block when not a git repo', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ name: 'x', version: '0.1.0' }));
    mockExecAsync.mockRejectedValue(new Error('not a git repo'));
    const ctx = await wc.gatherWorkspaceContext('/project');
    expect(ctx).not.toContain('Git:');
  });
});
