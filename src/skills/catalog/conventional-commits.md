## Conventional Commits

Format: `<type>(<scope>): <lowercase subject>`

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

Rules:

- Subject in lowercase, no period at end, ≤ 100 chars total header
- Body optional — use to explain WHY, not WHAT
- Breaking changes: add `!` after type: `feat!: rename api`

Examples:

- `feat(auth): add jwt refresh token endpoint`
- `fix(pipeline): handle empty qa output gracefully`
- `refactor(providers): extract base openai client`
