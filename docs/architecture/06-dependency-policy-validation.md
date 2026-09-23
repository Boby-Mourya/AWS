# 6. Dependency Graph, Policy Engine and Fail-Fast Validation

`@platform/dependency-engine` resolves provider and feature dependencies before startup/deployment. BullMQ requires Redis; pgvector requires PostgreSQL; RAG requires AI, vector storage and object storage; distributed-lock requirements are provider-specific. Validation returns migration options rather than silently breaking dependencies.

`@platform/policy-engine` defines the locked production baseline and rejects unauthorized or unapproved control-plane changes. Production provider/infrastructure/compute changes require privileged roles and approval. `validatePlatformState` combines desired-state validation, dependency resolution and locked-policy evaluation into one fail-fast gate.
