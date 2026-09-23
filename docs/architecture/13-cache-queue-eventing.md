# 13. Cache, Queue and Eventing Architecture

Redis remains optional and never stores authoritative business records. `cacheAside` implements cache-aside with TTL and a circuit breaker; Redis failure bypasses cache and falls through to the caller's database load. Redis adapters also provide optional distributed locks and idempotency, while PostgreSQL implementations remain available as fallbacks.

Queue adapters implement SQS for simple durable jobs, RabbitMQ for broker semantics, and the existing synchronous fallback for local/dev. BullMQ is represented in the provider/dependency model and is blocked unless Redis is active. Workers use the mandated job envelope and states, bounded concurrency, timeouts, exponential backoff plus jitter, graceful shutdown and DEAD_LETTERED terminal state.

Kafka/MSK event streaming is behind `EventBusPort`; SNS is the alternate managed event bus. Event envelopes include version, tenant/workspace, correlation/causation IDs and source. A versioned JSON Schema is committed for compatibility checking. Business writes can append `outbox_events` in the same database transaction; `OutboxPublisher` publishes through EventBusPort, and `consumeInboxOnce` provides idempotent inbox consumption.
