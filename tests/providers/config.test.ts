import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type OsType from 'os';

// Mock 'os' (not 'node:os') because config.ts imports from 'os'.
// We spread the real module so tmpdir/other exports keep working,
// and override only homedir to point at a temp directory.
const fakeHome = join(tmpdir(), 'lunatar-test-config');
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof OsType>();
  return {
    ...actual,
    homedir: () => join(actual.tmpdir(), 'lunatar-test-config'),
  };
});

const { getApiKey, setApiKey, removeApiKey, listConfiguredProviders } =
  await import('../../src/providers/config.js');

describe('providers/config', () => {
  beforeEach(() => {
    delete process.env['GROQ_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['OPENAI_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];
    delete process.env['NIM_API_KEY'];
    delete process.env['NVIDIA_API_KEY'];
    if (existsSync(fakeHome)) rmSync(fakeHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(fakeHome)) rmSync(fakeHome, { recursive: true });
  });

  it('getApiKey returns undefined when no key set', () => {
    expect(getApiKey('groq')).toBeUndefined();
  });

  it('getApiKey resolves GROQ_API_KEY env var', () => {
    process.env['GROQ_API_KEY'] = 'env-groq-key';
    expect(getApiKey('groq')).toBe('env-groq-key');
  });

  it('getApiKey resolves ANTHROPIC_API_KEY for claude', () => {
    process.env['ANTHROPIC_API_KEY'] = 'env-claude-key';
    expect(getApiKey('claude')).toBe('env-claude-key');
  });

  it('getApiKey resolves GEMINI_API_KEY for gemini', () => {
    process.env['GEMINI_API_KEY'] = 'env-gemini-key';
    expect(getApiKey('gemini')).toBe('env-gemini-key');
  });

  it('getApiKey resolves GOOGLE_API_KEY as fallback for gemini', () => {
    process.env['GOOGLE_API_KEY'] = 'env-google-key';
    expect(getApiKey('gemini')).toBe('env-google-key');
  });

  it('env var takes precedence over persisted config', () => {
    setApiKey('groq', 'persisted-key');
    process.env['GROQ_API_KEY'] = 'env-key';
    expect(getApiKey('groq')).toBe('env-key');
  });

  it('setApiKey persists key and getApiKey reads it back', () => {
    setApiKey('openai', 'my-openai-key');
    expect(getApiKey('openai')).toBe('my-openai-key');
  });

  it('removeApiKey removes a previously set key', () => {
    setApiKey('groq', 'test-key');
    removeApiKey('groq');
    expect(getApiKey('groq')).toBeUndefined();
  });

  it('listConfiguredProviders returns only configured ones', () => {
    process.env['GROQ_API_KEY'] = 'key';
    setApiKey('openai', 'openai-key');
    const list = listConfiguredProviders();
    expect(list).toContain('groq');
    expect(list).toContain('openai');
    expect(list).not.toContain('claude');
  });

  describe('mock key detection', () => {
    it('setApiKey throws for a key containing "mock"', () => {
      expect(() => {
        setApiKey('groq', 'gsk_mock_ui_test_only');
      }).toThrow(/placeholder or mock/);
    });

    it('getApiKey returns undefined for an env var containing "mock"', () => {
      process.env['GROQ_API_KEY'] = 'gsk_mock_dev_key';
      expect(getApiKey('groq')).toBeUndefined();
    });

    it('setApiKey throws for a key containing "test_only"', () => {
      expect(() => {
        setApiKey('openai', 'sk-test_only-key');
      }).toThrow(/placeholder or mock/);
    });

    it('setApiKey throws for a key containing "placeholder"', () => {
      expect(() => {
        setApiKey('claude', 'placeholder-key');
      }).toThrow(/placeholder or mock/);
    });

    it('getApiKey returns undefined for an env var containing "fake"', () => {
      process.env['GROQ_API_KEY'] = 'fake-api-key';
      expect(getApiKey('groq')).toBeUndefined();
    });

    it('listConfiguredProviders excludes providers with mock env vars', () => {
      process.env['GROQ_API_KEY'] = 'gsk_mock_ui_test_only';
      setApiKey('openai', 'real-openai-key');
      const list = listConfiguredProviders();
      expect(list).not.toContain('groq');
      expect(list).toContain('openai');
    });
  });
});
