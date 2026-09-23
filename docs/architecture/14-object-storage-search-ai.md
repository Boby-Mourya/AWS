# 14. Object Storage, Upload Security, Search and AI

This section implements the specification without coupling domain code to infrastructure providers.

## Object storage

`ObjectStoragePort` is backed by the S3 adapter for AWS and remains replaceable by non-production providers. The S3 adapter normalizes keys, supports a tenant/workspace prefix, server-side encryption (KMS when configured, otherwise S3-managed AES-256), bounded presigned GET URLs, bounded presigned PUT URLs, metadata and health checks. AWS-side Block Public Access, bucket versioning, lifecycle and KMS policy are provisioned by the Section 15 target stack.

## Upload security pipeline

The document service follows: authorize -> presigned quarantine upload -> descriptor validation -> actual-size check -> extension/MIME allowlist -> magic-byte validation -> archive expansion-ratio guard -> malware scan -> content-policy callback -> approved storage -> processing queue. Quarantine and approved keys always include tenant/workspace scope. Processing is enqueued idempotently only after approval. Parser execution is expected to run as a dedicated constrained worker/task; application code does not grant parser workers broad storage or tenant access.

## Search

OpenSearch is optional. `OpenSearchAdapter` always injects tenant and optional workspace filters. `PostgresSearchAdapter` provides the mandatory PostgreSQL full-text fallback over `document_chunks`, backed by GIN indexes in migration `004_search.sql`. `ShadowSearchAdapter` executes active/fallback shadow queries, measures latency and result overlap, and keeps reads on the active provider until a controlled cutover.

## AI Gateway

All model calls remain behind `AIModelPort`. Adapters support OpenAI-compatible local/external endpoints and Amazon Bedrock. `AIGateway` enforces tenant context, authorization, request/output limits, optional tenant token quota, validation hooks, usage accounting and primary-to-fallback routing. RAG prompt construction rejects cross-tenant/workspace chunks and strips privileged-looking tags while instructing the model to treat retrieved document text as data, not instructions. Provider failure produces an explicit capability-unavailable error and does not affect unrelated modules.

No secrets are embedded in browser or source code. Provider credentials are resolved from runtime configuration/secret mechanisms by deployment bootstrap code.
