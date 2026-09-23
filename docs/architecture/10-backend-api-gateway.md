# 10. Backend, API Gateway and Service Boundaries

`apps/api` is a gateway/BFF entrypoint that handles only cross-cutting concerns: request/correlation/trace IDs, tenant/workspace context propagation, rate limiting, request size/time limits, JSON schema validation, API versioning, security headers, idempotency and observability context. Domain business logic remains in services/application modules.

Errors always use `{ error: { code, message, requestId } }` and never serialize stack traces, SQL, internal paths, hostnames or secrets. Collection APIs use bounded cursor-style pagination. Critical creation routes require an idempotency key. Contract tests cover error envelopes, bounded pagination and idempotent replay.

In AWS, Section 15 places this API behind CloudFront/WAF and ALB/API Gateway before internal services.
