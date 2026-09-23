# 12. Database and Persistence

PostgreSQL is the source of truth. `@platform/adapter-postgres` provides bounded pooling, TLS in production, connection/query timeouts, transaction helpers, slow-query telemetry, PostgreSQL advisory-lock and idempotency fallbacks, and versioned transactional migrations.

Tenant-aware transactions set `app.tenant_id` and `app.workspace_id`; Row-Level Security policies form a second isolation barrier on tenant-owned tables. Application authorization remains mandatory. Core indexes cover tenant/workspace access, outbox publication, job polling and idempotency expiry. pgvector is enabled for RAG chunks without replacing relational document truth.

Production migrations are append-only/versioned and follow expand-and-contract: add compatible structure, deploy compatible code, dual-write/backfill when needed, switch reads, stop old writes, and remove old structure only in a later migration. Never manually modify production schema.

Supported tenancy modes remain: shared schema + tenant_id (implemented default), schema-per-tenant, and database-per-tenant. RDS/Aurora Multi-AZ, PITR/backups, read replicas and encryption are provisioned/configured at the AWS layer in Section 15.
