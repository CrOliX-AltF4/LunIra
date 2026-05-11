## TypeScript Strict Conventions

- **No `any`** — use `unknown` + type guards: `if (typeof x === 'string') { ... }`
- **`import type`** for type-only imports: `import type { Foo } from './foo.js'`
- **`exactOptionalPropertyTypes`** — never explicitly set optional props to `undefined`
- **`noUncheckedIndexedAccess`** — always check array/record access before use
- **Prefer discriminated unions** over nullable types for domain objects
- **No non-null assertion (`!`)** — narrow the type instead
- All public function parameters and return types must be explicitly annotated
