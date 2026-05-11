## React + CSS Modules Conventions

- Components are function components — no class components
- CSS Modules: `import styles from './Component.module.css'` — className via `styles.foo`
- One component per file; file name matches component name (PascalCase)
- Props interface declared inline above the component: `interface Props { ... }`
- No inline styles — all styling in `.module.css`
- Framer Motion for animations: `<motion.div animate={{ opacity: 1 }} />`
- Avoid `useEffect` for data fetching — use React Query or server components
