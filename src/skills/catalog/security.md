# Security Best Practices

## Input validation

- Validate and sanitise ALL user input at system boundaries.
- Use an allow-list, not a deny-list.
- Reject or escape HTML entities to prevent XSS.

## Secrets management

- Never hardcode API keys, passwords, or tokens in source code.
- Load secrets from environment variables or a secrets manager.
- Never commit `.env` files; add them to `.gitignore`.

## SQL / injection

- Use parameterised queries or an ORM — never string-concatenate SQL.
- Validate file paths; reject `..` traversal segments.

## Authentication and authorisation

- Hash passwords with bcrypt or argon2 (cost factor ≥ 12).
- Use short-lived JWTs (≤ 15 min access token, refresh token rotation).
- Enforce least-privilege: deny by default, grant explicitly.

## HTTP security headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Dependencies

- Run `npm audit` in CI; block on critical vulnerabilities.
- Pin or lock dependency versions; review `dependabot` PRs promptly.
