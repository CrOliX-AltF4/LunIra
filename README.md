<div align="center">

# Lun'Atar

[![Version](https://img.shields.io/badge/version-0.3.0-8b0000?style=flat-square)](.)
[![License](https://img.shields.io/badge/license-MIT-333333?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/CrOliX-AltF4/AI-Dev-Workbench-CLI/ci.yml?style=flat-square&label=CI)](https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI/actions)
[![Node](https://img.shields.io/badge/node-%3E%3D20-555555?style=flat-square)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](.)

_Drop an intent. Watch four agents argue about it. Get production-ready code._

</div>

---

## What is this?

**Lun'Atar** is a multi-agent development pipeline CLI. You describe what you want to build — it routes that intent through four specialized AI agents, each on the model best suited for its role, and hands you structured, typed output.

> [!NOTE]
> "Atar" is the Zoroastrian deity of sacred fire. The forge metaphor isn't decoration — a pipeline that heats raw intent through multiple stages and casts it into code. Part of the [Lun'ecosystem](https://github.com/CrOliX-AltF4) alongside **LunArchive**.

The problem it solves: one LLM handling PO + architecture + code + QA in a single context loses quality fast. Context pollution, no cost control, no traceability. Lun'Atar splits each responsibility across dedicated agents, passes only the typed slice the next step needs, and keeps a full record of every run.

| Without Lun'Atar                | With Lun'Atar                                              |
| ------------------------------- | ---------------------------------------------------------- |
| Context overload → quality loss | One model per role, selective context passing              |
| No cost visibility              | Model Recommendation Engine scores cost, latency, task-fit |
| Untraceable output              | Every run persisted, every step logged                     |
| All-or-nothing execution        | Step-level status, per-step model override before run      |

---

## The Pipeline

```
⚡ Intent: "build a REST API to manage users"
           │
           ▼
  ┌─────────────────────┐
  │    Product Owner    │  Clarifies goal, requirements,
  │   (fast, cheap)     │  constraints, complexity
  └──────────┬──────────┘
             │  [structured requirements]
             ▼
  ┌─────────────────────┐
  │       Planner       │  Architecture, tech stack,
  │   (large context)   │  task breakdown, risks
  └──────────┬──────────┘
             │  [architecture + tasks]
             ▼
  ┌─────────────────────┐
  │      Developer      │  Generates complete,
  │    (best at code)   │  production-ready files
  └──────────┬──────────┘
             │  [code + entry points]
             ▼
  ┌─────────────────────┐
  │     QA Engineer     │  Audits against requirements,
  │   (fast, precise)   │  verdict + score + issues
  └──────────┬──────────┘
             ▼
  ╔═════════════════════╗
  ║   Results → disk    ║
  ╚═════════════════════╝
```

---

## Features

**Pipeline & agents**

- Multi-agent pipeline: PO → Planner → Developer → QA, each role on its optimal model
- Skills system — inject knowledge into agent prompts from a catalog (TypeScript conventions, React patterns, Laravel, Conventional Commits, etc.)
- Plugins system — equip agents with tools: write files, read project context, web search, GitHub issues
- `lunatar.config.json` — declare active skills and plugins per role for your project
- Retry + backoff — JSON parse failures trigger corrective multi-turn retry; rate limits use exponential backoff
- Structured JSON output — agents never produce prose; noise eliminated at the source
- Prompt caching — system prompts cached automatically on Claude

**Providers**

- 5 LLM providers: Groq · Gemini · Claude · OpenAI · NVIDIA NIM
- All swappable per step before every run
- Model Recommendation Engine scores every model on task-fit, cost, latency, context window

**TUI**

- Interactive pipeline screen with live step status and elapsed timers
- Per-step model picker (`m` key) — swap model without touching config
- Skills & Plugins toggle screen before each run
- Tabbed results: Overview (verdict + metrics) · Files (inline code preview) · Plan (architecture + tasks)
- Save all generated files to `./output/<run-id>/` with one keypress

**CLI**

- Headless mode (`--json`) — progress to stderr, full `PipelineRun` JSON to stdout
- Skip roles (`--skip po,qa`) — bypass any agent for external integration
- Inject PO output (`--from-po`) — supply pre-computed PO JSON from a file or stdin
- Dry run (`--dry`) — preview models, estimated tokens, and cost without any LLM call
- `lunatar init` — scaffold a new project (cli · frontend · lib) with conventions pre-configured
- Run history — tabular view of past runs with verdict, cost, tokens

> [!WARNING]
> Lun'Atar generates code. It does not execute it. Review everything before running in production. The QA agent audits for issues but is not a substitute for human code review.

---

## Installation

**From npm (recommended once released):**

```bash
npm install -g lunatar
```

**From source:**

```bash
git clone https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI.git
cd AI-Dev-Workbench-CLI
npm install && npm run build
npm link
```

```powershell
# Windows (PowerShell)
.\setup.ps1
```

```bash
# macOS / Linux
bash setup.sh
```

The setup script installs dependencies, builds the project, and registers `aiwb` so it works from any directory. **Restart your terminal after running it.**

**Requirements:** Node.js >= 20 · At least one LLM provider API key

---

## Setup

On first launch, `lunatar` detects no provider is configured and opens an interactive setup screen automatically. Or run it explicitly:

```bash
lunatar setup
```

Configure via CLI:

```bash
lunatar config set groq.apiKey    <your-key>
lunatar config set gemini.apiKey  <your-key>
lunatar config set claude.apiKey  <your-key>
lunatar config set openai.apiKey  <your-key>
lunatar config set nim.apiKey     <your-key>
```

Or drop a `.env` in the directory where you run `lunatar`:

```bash
cp .env.example .env   # fill in at least one key
lunatar
```

> [!TIP]
> Keys are stored in `~/.lunatar/config.json`. Environment variables always take precedence — useful for CI or per-project overrides.

---

## Usage

```bash
lunatar                                          # interactive TUI (recommended)
lunatar run "create a REST API"                  # skip the prompt screen
lunatar run "create a REST API" --dry            # preview cost without running
lunatar run "create a REST API" --skip qa        # bypass the QA agent
lunatar run "create a REST API" --json           # headless: JSON to stdout
lunatar run "intent" --from-po po.json           # inject pre-computed PO output
lunatar history                                  # browse past runs
lunatar config list                              # show configured providers
lunatar init --name my-project --type cli        # scaffold a new project
```

**Natsume / external PO integration:**

```bash
echo '<po-json>' | lunatar run "intent" --skip po,qa --from-po - --json
```

### TUI controls

**Pipeline screen:**

| Key   | Action                                   |
| ----- | ---------------------------------------- |
| `↑ ↓` | Navigate between steps                   |
| `m`   | Change the model for the focused step    |
| `↵`   | Open Skills & Plugins selector, then run |
| `q`   | Quit                                     |

**Results screen:**

| Key   | Action                                         |
| ----- | ---------------------------------------------- |
| `1`   | Overview — QA verdict, issues, metrics         |
| `2`   | Files — generated files with inline preview    |
| `3`   | Plan — architecture, tech stack, tasks, risks  |
| `↑ ↓` | Navigate files (Files tab)                     |
| `s`   | Save all files + `requirements.md` + `plan.md` |
| `r`   | Start a new pipeline                           |
| `q`   | Quit                                           |

---

## Default Models

| Role      | Default              | Rationale                           |
| --------- | -------------------- | ----------------------------------- |
| PO        | Llama 3.3 70B (Groq) | Fast clarification, free tier       |
| Planner   | Gemini 2.5 Flash     | 1M context, strong reasoning, cheap |
| Developer | Claude Sonnet 4.6    | Best code quality                   |
| QA        | Llama 3.3 70B (Groq) | Fast analysis, free tier            |

Every model is swappable via the TUI picker (`m`) before each run.

---

## Project Config

Create `lunatar.config.json` at your project root to activate skills and plugins per role:

```json
{
  "skills": {
    "all": ["conventional-commits"],
    "dev": ["typescript-strict", "react-css-modules"]
  },
  "plugins": {
    "dev": ["file_write", "read_file"]
  }
}
```

**Built-in skills:** `typescript-strict` · `react-css-modules` · `conventional-commits` · `project-context` · `laravel-conventions`

**Built-in plugins:** `file_write` · `read_file` · `web_search` · `github_create_issue`

> [!NOTE]
> Skills inject markdown knowledge into the agent's system prompt. Plugins give agents tool-use capabilities — `file_write` lets the Dev agent write files directly to `./output/<run-id>/` during the pipeline run.

---

## Architecture

```
src/
├── cli/           # Commander.js entry — run, history, setup, config, init
├── ui/            # Ink TUI — Prompt → Config → Pipeline → Results
├── orchestrator/  # Public façade — stable entry point for all callers
├── agents/        # Stateless agents: PO · Planner · Dev · QA
├── pipeline/      # Sequential runner + selective context mappers
├── models/        # Model catalog + recommendation engine
├── providers/     # LLM adapters: Groq · Gemini · Claude · OpenAI · NIM
├── skills/        # Skill registry + markdown catalog
├── plugins/       # Plugin registry + built-in tool implementations
├── config/        # lunatar.config.json loader
└── storage/       # Run persistence (JSON → ~/.lunatar/runs/)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, commit conventions, and code standards.

```bash
git clone https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI.git
cd AI-Dev-Workbench-CLI
npm install
npm run dev
```

---

<div align="center">

Built by **[CrOliX-AltF4](https://github.com/CrOliX-AltF4)**

_Part of the Lun' ecosystem._

© 2026 Loric Worms — MIT License

</div>
