import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PipelineRun } from '../../src/types/index.js';

// ─── Mock node:fs/promises ────────────────────────────────────────────────────

vi.mock('node:fs/promises');

const fsMock = await import('node:fs/promises');
const { saveRun, loadRun, listRuns } = await import('../../src/storage/store.js');

const mockMkdir = vi.mocked(fsMock.mkdir);
const mockWriteFile = vi.mocked(fsMock.writeFile);
const mockReadFile = vi.mocked(fsMock.readFile);
const mockReaddir = vi.mocked(fsMock.readdir);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RUN_A: PipelineRun = {
  id: 'run-a',
  createdAt: '2026-01-02T00:00:00.000Z',
  intent: 'Build a CLI',
  steps: [],
  totalCostUsd: 0.001,
  totalTokens: 500,
  totalDurationMs: 1000,
  status: 'completed',
};

const RUN_B: PipelineRun = {
  ...RUN_A,
  id: 'run-b',
  createdAt: '2026-01-01T00:00:00.000Z', // older
  intent: 'Build an API',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});

// ─── saveRun ──────────────────────────────────────────────────────────────────

describe('saveRun()', () => {
  it('creates the runs directory before writing', async () => {
    await saveRun(RUN_A);
    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringContaining('.lunatar'),
      expect.objectContaining({ recursive: true }),
    );
  });

  it('writes the run as formatted JSON to <id>.json', async () => {
    await saveRun(RUN_A);
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('run-a.json'),
      JSON.stringify(RUN_A, null, 2),
      'utf8',
    );
  });
});

// ─── loadRun ──────────────────────────────────────────────────────────────────

describe('loadRun()', () => {
  it('returns the parsed run when the file exists', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(RUN_A) as never);
    const result = await loadRun('run-a');
    expect(result).toEqual(RUN_A);
  });

  it('returns null when the file does not exist', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
    const result = await loadRun('nonexistent');
    expect(result).toBeNull();
  });

  it('reads from the correct path', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(RUN_A) as never);
    await loadRun('run-a');
    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('run-a.json'), 'utf8');
  });
});

// ─── listRuns ─────────────────────────────────────────────────────────────────

describe('listRuns()', () => {
  it('returns runs sorted by createdAt descending (newest first)', async () => {
    mockReaddir.mockResolvedValueOnce(['run-b.json', 'run-a.json'] as never);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(RUN_B) as never)
      .mockResolvedValueOnce(JSON.stringify(RUN_A) as never);

    const runs = await listRuns();
    expect(runs[0]?.id).toBe('run-a'); // 2026-01-02 is newer
    expect(runs[1]?.id).toBe('run-b');
  });

  it('skips non-.json files', async () => {
    mockReaddir.mockResolvedValueOnce(['run-a.json', '.DS_Store', 'notes.txt'] as never);
    mockReadFile.mockResolvedValueOnce(JSON.stringify(RUN_A) as never);

    const runs = await listRuns();
    expect(runs).toHaveLength(1);
  });

  it('skips corrupted files silently', async () => {
    mockReaddir.mockResolvedValueOnce(['run-a.json', 'corrupt.json'] as never);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(RUN_A) as never)
      .mockResolvedValueOnce('{ not valid json' as never);

    const runs = await listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe('run-a');
  });

  it('returns an empty array when the directory is empty', async () => {
    mockReaddir.mockResolvedValueOnce([] as never);
    const runs = await listRuns();
    expect(runs).toEqual([]);
  });
});
