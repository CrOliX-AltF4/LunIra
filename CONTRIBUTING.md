# Contributing to Lun'Atar

Thank you for contributing! This guide will help you get started quickly and ensure your contribution fits smoothly into the project.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Contribution workflow](#contribution-workflow)
- [Commit conventions](#commit-conventions)
- [Code standards](#code-standards)
- [Tests](#tests)
- [Submitting a PR](#submitting-a-pr)

---

## Code of conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By contributing, you agree to abide by its terms.

---

## Quick start

### Prerequisites

- **Node.js** >= 20 (see `.nvmrc`)
- **npm** >= 10
- Git

### Setup

```bash
git clone https://github.com/CrOliX-AltF4/AI-Dev-Workbench-CLI.git
cd AI-Dev-Workbench-CLI
npm install
```

Git hooks (pre-commit, commit-msg) are installed automatically via Husky on `npm install`.

### Available commands

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start in development mode         |
| `npm run build`         | Compile TypeScript → `dist/`      |
| `npm run typecheck`     | Type-check without emitting files |
| `npm run lint`          | Run ESLint across the project     |
| `npm run lint:fix`      | Lint + autofix                    |
| `npm run format`        | Run Prettier across the project   |
| `npm run format:check`  | Check formatting without writing  |
| `npm test`              | Run tests once                    |
| `npm run test:watch`    | Run tests in watch mode           |
| `npm run test:coverage` | Run tests with coverage report    |

---

## Project structure

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

## Contribution workflow

1. **Fork** the repo and create a branch from `dev`:

   ```bash
   git checkout -b feat/my-feature dev
   ```

2. **Develop** your feature with atomic commits.

3. **Make sure** all checks pass locally:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

4. **Open a Pull Request** targeting `dev` (never directly to `master`).

> `master` = stable production. `dev` = integration branch.

---

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <short description in lowercase>

[optional body]

[optional footer: Closes #123]
```

### Accepted types

| Type       | Usage                           |
| ---------- | ------------------------------- |
| `feat`     | New feature                     |
| `fix`      | Bug fix                         |
| `docs`     | Documentation only              |
| `style`    | Formatting, no logic change     |
| `refactor` | Refactoring without fix or feat |
| `perf`     | Performance improvement         |
| `test`     | Adding or updating tests        |
| `build`    | Build tools, dependencies       |
| `ci`       | CI/CD                           |
| `chore`    | Maintenance, background tasks   |
| `revert`   | Revert a previous commit        |

### Examples

```bash
feat(models): add groq provider adapter
fix(pipeline): handle timeout on qa step
docs(contributing): add commit conventions section
test(agents): add unit tests for po agent
```

The `commit-msg` hook validates the format automatically. An invalid commit will be rejected.

---

## Code standards

- **Strict TypeScript**: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **ESLint**: `typescript-eslint/strictTypeChecked` + Prettier
- **Formatting**: Prettier, single quotes, trailing commas, 100 chars max
- **Imports**: always use `import type` for type-only imports
- **Modules**: native ESM (`"type": "module"`)

The `pre-commit` hook runs lint-staged automatically before each commit.

---

## Tests

- Framework: **Vitest**
- Tests live in `tests/` (mirroring the `src/` structure)
- Aim for >= 80% coverage on critical modules (pipeline, models, providers)
- Name test files `*.test.ts`

```bash
npm run test:coverage   # full coverage report
npm run test:watch      # watch mode during development
```

---

## Submitting a PR

1. Make sure the target branch is `dev`
2. Fill in the PR template
3. Verify all CI checks pass
4. Request a review from at least one maintainer
5. A squash merge will be performed to keep a clean history on `master`

---

Questions? Open a [GitHub Discussion](../../discussions) or an issue with the `question` label.
