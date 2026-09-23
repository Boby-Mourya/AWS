# Sections 1–15 Implementation Manifest

Scope boundary: this repository implementation covers the Master Implementation Specification Sections 1 through 15 only. Sections 16–30 are intentionally left for the separate teammate workstream.

| Section | Implemented artifacts |
|---|---|
| 1. Architectural vision | inward dependency guardrails, domain/contracts separation, architecture import test, immutable production image guardrail and non-destructive control semantics |
| 2. Profiles/capabilities | local/minimal/standard/high-availability/enterprise/ai-enterprise profile catalog and required/optional/degraded capability matrix |
| 3. Repository organization | apps/services/packages/adapters/infrastructure/config/tests structure, standard service template and architecture boundary tests |
| 4. Ports/adapters/DI | stable capability contracts, provider registry, validated `CapabilityContainer`, primary health check plus explicit degraded/fallback resolution |
| 5. Central configuration | desired-state layers and precedence, switch classes, provider/fallback/profile validation, dependency/policy validation during config load |
| 6. Dependency/policy | dependency graph for BullMQ/Redis, lock/idempotency fallbacks, outbox/PostgreSQL, PostgreSQL search, pgvector/RAG; locked production policy and migration suggestions |
| 7. Control Center | authenticated privileged control API, all required page data models, live admin page rendering, desired/actual state, config version, change state machine, audit, secret-metadata-only rule and emergency desired state; direct destroy rejected |
| 8. Switch/fallback workflows | Redis, Kafka, OpenSearch, EKS→ECS progressive traffic migration, AI disable/provider switch, explicit disabled-AI provider and capability-aware frontend navigation |
| 9. Frontend | Next.js module/core structure, centralized API client, safe retries/cancellation, feature permissions, loading/error boundaries, CSP/HSTS/security headers, safe redirect helpers, CSRF helpers, browser-safe config and privacy-safe telemetry |
| 10. Backend/gateway | request/correlation/trace context, OIDC auth, tenant propagation, rate limiting, schema validation, versioned APIs, error envelope, bounded pagination, request limits/timeouts and tenant-scoped idempotent creation contract |
| 11. Identity/tenancy | OIDC + privileged MFA, RBAC/ABAC, session revocation/refresh rotation/device registry, TenantContext, tenant key/storage/queue/event/vector/log helpers, tenant-scoped cache/idempotency/lock/search wrappers and cross-tenant tests |
| 12. Persistence | PostgreSQL pooling/TLS/timeouts/slow-query monitoring, transactions and tenant transactions, versioned migrations, RLS, idempotency/advisory-lock fallbacks, pgvector schema, outbox/inbox tables and composite tenant/workspace FK integrity |
| 13. Cache/queue/eventing | bounded LRU memory cache, TTL/cache-aside/single-flight stampede protection/circuit-breaker telemetry, Redis/SQS/RabbitMQ/Kafka/SNS adapters, worker timeout/concurrency/retry+jitter/idempotency/graceful shutdown/DLQ hooks, outbox/inbox and versioned event schema |
| 14. Storage/search/AI | S3 adapter, filesystem and MinIO-compatible non-prod providers, quarantine upload validation, ClamAV contract, parser sandbox, PostgreSQL FTS fallback, OpenSearch, shadow search, Bedrock/OpenAI-compatible adapters, AI Gateway routing/quotas/token limits/timeout/retry/telemetry/fallback and RAG tenant/prompt-injection checks |
| 15. AWS target | Route53/CloudFront/WAF/HTTPS ALB, private ECS/EKS, segmented multi-AZ VPC and endpoints, RDS/S3/SQS plus optional Redis/MSK/OpenSearch, KMS/ECR/CloudWatch, scoped IAM, GuardDuty/Security Hub/CloudTrail/AWS Backup, multi-account strategy documentation and blocking production Terraform guardrails |

Automated tests cover architecture boundaries, profiles, provider contracts and DI fallback, desired-state validation, dependency/policy rules, control state and authenticated control API behavior, switch workflows, frontend security, API contracts, tenant isolation, PostgreSQL schema/workspace integrity, cache/worker hardening, storage/search/AI behavior and AWS target invariants.

The implementation preserves provider pluggability: domain behavior depends on stable contracts while concrete providers are selected from validated desired state. Disabling an optional capability activates a compatible fallback/degraded behavior and never means destructive infrastructure deletion.

## Scope hand-off

No Section 16–30 implementation is added by this workstream. In particular, runtime AWS AppConfig/SSM/Secrets Manager configuration services, container/Kubernetes deployment standards, GitOps/change orchestration, expanded control-plane persistence, later cybersecurity/CI/CD/observability/DR/FinOps/governance/testing-plan work remain reserved for the teammate implementation sequence.
