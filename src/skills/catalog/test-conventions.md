# Testing Conventions

## Framework

Use Vitest. Always import from `vitest`, never from `@jest/globals`.

## Structure

- One `describe` block per module.
- One `it`/`test` per behaviour, named "does X when Y".
- `beforeEach` for setup; `afterEach` for teardown.

## Mocking

- Mock external modules with `vi.mock('module-name')`.
- Place module-level `vi.fn()` references **before** the `vi.mock()` call so Vitest hoisting picks them up.
- Use named function constructors (not arrow functions) when mocking classes used with `new`.

## Coverage

- Target ≥70 % statements and functions.
- Don't test implementation details — test observable behaviour.
- Assert on the error message, not just that an error was thrown.

## File naming

- Test files live in `tests/` mirroring `src/` structure.
- File name: `<module-name>.test.ts`.
