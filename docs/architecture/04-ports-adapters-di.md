# 4. Ports, Adapters, Dependency Injection and Provider Registry

Infrastructure is represented by stable capability ports in `@platform/capability-contracts`. The `ProviderRegistry` is the composition boundary: adapters register factories and application startup resolves the validated provider name. Domain code is never aware of the selected implementation.

The catalog includes the required cache, queue, event bus, search, storage, compute, AI and secret-provider names. Safe in-process adapters exist for local/degraded cache, queue, event bus and storage behavior. Cloud/provider-specific implementations are added in the corresponding architecture sections without changing domain contracts.
