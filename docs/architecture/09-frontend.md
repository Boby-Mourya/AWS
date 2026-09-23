# 9. Frontend Architecture

`apps/web` is a React/Next.js TypeScript application using the required module/core/shared structure. Browser-facing code reasons about product capabilities and permissions, not infrastructure providers. The centralized API client supports cancellation, timeouts, bounded safe retries, idempotency keys, stable API errors and response validation. Cursor pagination helpers, loading/error states, responsive layouts and accessible navigation are included.

Feature visibility is combined with permissions. Hiding a route/component is never treated as authorization; the backend remains authoritative. Security headers include CSP, HSTS in production, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. Auth session state uses secure server-side cookies rather than browser-stored cloud credentials, and redirects are normalized to same-origin paths.
