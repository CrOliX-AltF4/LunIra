<div align="center">

# ◆ Lun'Atar

[![Version](https://img.shields.io/npm/v/lunatar?style=flat-square&color=C8A415)](https://www.npmjs.com/package/lunatar)
[![License](https://img.shields.io/badge/license-MIT-333333?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/CrOliX-AltF4/LunAtar/ci.yml?style=flat-square&label=CI)](https://github.com/CrOliX-AltF4/LunAtar/actions)
[![Node](https://img.shields.io/badge/node-%3E%3D20-555555?style=flat-square)](.)

**intent → code**

_A multi-agent AI pipeline CLI — four specialized agents, one clean result._

</div>

---

## Quick start

```bash
npm install -g lunatar
lunatar               # opens the interactive TUI, guides you through setup
```

No API key? Run the built-in demo:

```bash
lunatar               # type /demo in the forge bar
```

---

## How it works

One plain-text intent enters. Four agents process it in sequence — each focused on one thing, passing only what the next step needs. On failure, the work goes back into the fire.

```
  "build a REST API to manage users"
           │
           ▼
  ┌──────────────────┐
  │   Product Owner  │  clarifies goal, requirements, constraints
  └────────┬─────────┘
           │  structured requirements
           ▼
  ┌──────────────────┐
  │     Planner      │  architecture, tech stack, task breakdown
  └────────┬─────────┘
           │  architecture + tasks
           ▼
  ┌──────────────────┐
  │    Developer     │  generates complete, runnable files
  └────────┬─────────┘
           │  code files
           ▼
  ┌──────────────────┐
  │   QA Engineer    │  verdict + score + issues
  └────────┬─────────┘
           │  fail? → back to Developer (up to N times)
           ▼
      artifact sealed
```

Why four agents instead of one? Context pollution. A single LLM handling PO + architecture + code + QA in one context degrades fast. Lun'Atar splits each responsibility, keeps outputs typed, and gives you full traceability per run.

---

## Features

**Pipeline**

- Automatic model selection per role — each agent gets the model best suited for its task
- QA iteration loop — on fail, issues are fed back to Dev for a retry (`--max-iterations`)
- Budget guard — abort if total cost exceeds your limit (`--budget-usd`, `--daily-budget-usd`)
- Provider fallback — automatic failover to the next configured provider

**7 Providers**

| Provider   | Free tier | Notes                                  |
| ---------- | --------- | -------------------------------------- |
| Groq       | ✓         | Ultra-fast LPU — default for PO and QA |
| Gemini     | ✓         | 1M context, strong reasoning           |
| OpenRouter | ✓         | Gateway to 200+ models, one key        |
| Ollama     | ✓         | Local models, no API key               |
| Claude     | —         | Best code quality                      |
| OpenAI     | —         | GPT-4o, o1                             |
| NVIDIA NIM | ✓         | Hosted NVIDIA models                   |

**Skills & Plugins**

_Skills_ inject expertise into agent prompts — TypeScript conventions, React patterns, Laravel, security rules, REST design, and more.

_Plugins_ give agents tool-use capabilities — write files, read context, web search, run commands, execute code, open GitHub issues.

Both are per-project via `lunatar.config.json` and selectable per-run from the TUI (`/arsenal`).

**TUI**

- Animated living flame mascot on the idle screen
- Slash command navigation — `/history`, `/arsenal`, `/setup`, `/demo`
- Live pipeline view with forge fire animation per active step
- Tabbed results: Verdict · Artefacts · Stratégie · Diff
- Apply generated files directly to your project (`[a]` key)
- Run history with re-run support
- RPG lexicon throughout — Incantation, Dungeon, Forge, Blacksmith level

---

## Setup

On first launch, Lun'Atar detects no provider and opens setup automatically.

```bash
lunatar setup                              # interactive provider configuration
lunatar config set groq.apiKey <key>       # or set directly
lunatar config set openrouter.apiKey <key> # one key for 200+ models
```

Environment variables always take precedence:

```bash
GROQ_API_KEY=<key> lunatar run "..."
```

---

## CLI

```bash
lunatar                                         # interactive TUI
lunatar run "build a REST API"                  # headless run
lunatar run "..." --dry                         # preview cost, no LLM calls
lunatar run "..." --apply                       # write output to current directory
lunatar run "..." --skip qa                     # bypass a role
lunatar run "..." --model gemini-2.5-pro        # override model
lunatar run "..." --provider openrouter         # override provider
lunatar run "..." --budget-usd 0.10             # abort above $0.10
lunatar run "..." --max-iterations 3            # allow 3 Dev→QA retries
lunatar run "..." --json                        # machine-readable output
lunatar ask "what does this file do" --file x   # direct LLM question
lunatar history                                 # browse past runs
lunatar costs                                   # spending summary
lunatar watch ./src --intent intent.txt         # re-run on file change
lunatar catalog                                 # list skills and plugins
lunatar init                                    # scaffold a new project
```

## TUI controls

| Key        | Action                                                       |
| ---------- | ------------------------------------------------------------ |
| `/`        | Slash commands — type to filter                              |
| `/demo`    | Run demo pipeline (no API key needed)                        |
| `/history` | Browse past runs                                             |
| `/arsenal` | Select skills & plugins for next run                         |
| `/setup`   | Configure API keys                                           |
| `↑ ↓`      | Navigate                                                     |
| `m`        | Swap model on focused step                                   |
| `↵`        | Fire the forge                                               |
| `1 2 3 4`  | Switch results tabs (Verdict / Artefacts / Stratégie / Diff) |
| `a`        | Apply generated files to current directory                   |
| `s`        | Seal artifacts (save to `./output/<run-id>/`)                |
| `r / q`    | New forge                                                    |

---

## Project config

```json
{
  "skills": {
    "all": ["conventional-commits", "typescript-strict"],
    "dev": ["react-css-modules"]
  },
  "plugins": {
    "dev": ["file_write", "read_file"],
    "qa": ["execute_code"]
  }
}
```

**Skills:** `typescript-strict` · `react-css-modules` · `conventional-commits` · `project-context` · `laravel-conventions` · `test-conventions` · `api-design` · `i18n` · `security`

**Plugins:** `file_write` · `read_file` · `web_search` · `run_command` · `list_directory` · `create_directory` · `execute_code` · `github_create_issue`

External skills and plugins are discoverable via npm (`lunatar-skill-*`, `lunatar-plugin-*`).

---

> [!WARNING]
> Lun'Atar generates code. It does not execute it. The QA agent audits for issues but is not a substitute for human review.

---

> _"Atar" is the Zoroastrian deity of sacred fire — the forge that purifies and transforms._
> _Part of the [Lun' ecosystem](https://github.com/CrOliX-AltF4)._

<div align="center">

Built by **[CrOliX-AltF4](https://github.com/CrOliX-AltF4)** · MIT License · © 2026

</div>
