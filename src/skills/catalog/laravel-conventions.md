## Laravel / PHP Conventions

- **Eloquent** for database access — no raw SQL unless performance-critical
- **Form Requests** for validation — never validate in controllers
- **Resources** for API responses — never expose Eloquent models directly
- **Service classes** for business logic — thin controllers
- Route model binding for CRUD endpoints
- PHPDoc for all public methods
- Tests in `tests/Feature/` (HTTP) and `tests/Unit/` (logic)
- `php artisan make:` for all scaffolding
