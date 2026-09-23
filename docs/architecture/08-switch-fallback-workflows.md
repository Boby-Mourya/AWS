# 8. Detailed Switch and Fallback Workflows

Executable workflow planners implement the document's controlled cutovers. Redis-off contains the full 12-step sequence and checks RBAC, dependency health, fallback health and database capacity before rollout. Kafka-off refuses cutover without a healthy alternate EventBusPort, drained lag, healthy DLQ/schema state and zero Kafka-only consumers. OpenSearch-off requires PostgreSQL indexes and passing shadow result/latency comparison before SearchPort cutover.

EKS -> ECS is modeled as a RED migration with a parallel target and 5/25/50/100 percent traffic shifts; it is never treated as a runtime toggle. AI disable/provider switches occur only through AIModelPort/AI Gateway behavior and explicitly produce capability-unavailable degradation while preserving unrelated modules.

Every workflow leaves infrastructure intact when the application capability is disabled. Stop and destroy remain separate control-plane actions.
