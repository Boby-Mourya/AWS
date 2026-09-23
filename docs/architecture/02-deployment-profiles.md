# 2. Deployment Profiles and Capability Model

A single business application is used for `local`, `minimal`, `standard`, `high-availability`, `enterprise`, and `ai-enterprise` profiles. Provider choices change by validated configuration; domain code does not fork by environment.

The machine-readable profile matrix is `config/profiles.json`; the capability criticality/fallback matrix is `config/capability-catalog.json`. Database is non-disableable. Redis, queues, event streaming, OpenSearch, AI and telemetry are optional providers with explicit fallback/degraded behavior. Object storage is a core capability with swappable provider. EKS/ECS/Docker changes are treated as orchestrator migrations, not feature toggles.
