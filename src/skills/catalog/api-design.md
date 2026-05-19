# REST API Design

## Resource naming

- Use plural nouns: `/users`, `/orders`, `/products`.
- Nest resources for ownership: `/users/:id/orders`.
- Never use verbs in URLs.

## HTTP methods

- GET — read (idempotent, no body)
- POST — create (returns 201 + Location header)
- PUT — full replace (idempotent)
- PATCH — partial update
- DELETE — remove (returns 204)

## Status codes

- 200 OK, 201 Created, 204 No Content
- 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden, 404 Not Found
- 409 Conflict (duplicate), 422 Unprocessable Entity
- 500 Internal Server Error (never leak stack traces)

## Versioning

- Prefix with `/v1/`, `/v2/` etc.
- Keep v1 alive until clients migrate; deprecate with `Deprecation` header.

## Response envelope

```json
{ "data": {}, "meta": { "requestId": "uuid" } }
```

Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`
