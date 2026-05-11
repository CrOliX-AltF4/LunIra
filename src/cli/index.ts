#!/usr/bin/env node

// Load .env from the current working directory before anything else.
// getApiKey() reads process.env, so dotenv vars are picked up automatically.
import 'dotenv/config';

import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { historyCommand } from './commands/history.js';
import { setupCommand } from './commands/setup.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('lunatar')
  .description("Lun'Atar — multi-agent AI development pipeline CLI")
  .version('0.3.0');

// ─── run ──────────────────────────────────────────────────────────────────────

program
  .command('run [intent]')
  .description('Run a development pipeline from a user intent')
  .option('--json', 'headless mode: write JSON result to stdout, progress to stderr')
  .option('--skip <roles>', 'comma-separated roles to skip: po, planner, dev, qa')
  .option('--dry', 'preview models and estimated cost without running')
  .option(
    '--from-po <source>',
    'inject PO output JSON from a file or stdin ("-"); auto-skips PO agent',
  )
  .action(
    async (
      intent?: string,
      opts?: { json?: boolean; skip?: string; dry?: boolean; fromPo?: string },
    ) => {
      await runCommand({
        ...(intent ? { intent } : {}),
        ...(opts?.json ? { json: true } : {}),
        ...(opts?.skip ? { skip: opts.skip } : {}),
        ...(opts?.dry ? { dry: true } : {}),
        ...(opts?.fromPo ? { fromPo: opts.fromPo } : {}),
      });
    },
  );

// ─── history ──────────────────────────────────────────────────────────────────

program
  .command('history')
  .description('List previous pipeline runs')
  .action(async () => {
    await historyCommand();
  });

// ─── setup ────────────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('Configure LLM provider API keys interactively')
  .action(async () => {
    await setupCommand();
  });

// ─── config ───────────────────────────────────────────────────────────────────

program
  .command('config <action> [key] [value]')
  .description('Manage configuration: get/set/unset <provider>.apiKey, list')
  .action((action: string, key?: string, value?: string) => {
    // "list" needs no key; all others require one
    if (action !== 'list' && !key) {
      console.error(
        `Key is required for action "${action}". Example: lunatar config ${action} groq.apiKey`,
      );
      process.exit(1);
    }
    configCommand(action, key ?? '', value);
  });

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Scaffold a new project with lunatar conventions')
  .option('-n, --name <name>', 'project name (lowercase, hyphens)')
  .option('-t, --type <type>', 'project type: frontend | fullstack | cli | lib')
  .option('--skip-install', 'skip npm install after scaffolding')
  .option('--dir <path>', 'target directory (defaults to ./<name>)')
  .action(async (opts: { name?: string; type?: string; skipInstall?: boolean; dir?: string }) => {
    await initCommand(opts);
  });

// ─── Default: open prompt screen ─────────────────────────────────────────────

if (process.argv.length <= 2) {
  await runCommand({});
} else {
  program.parse();
}
