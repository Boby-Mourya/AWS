import type { Criticality } from "@platform/contracts";

export type CapabilityName = "database" | "cache" | "distributed_lock" | "idempotency" | "queue" | "event_bus" | "object_storage" | "search" | "vector_store" | "email" | "ai" | "tracing" | "metrics" | "orchestrator";

export interface CapabilityDefinition {
  name: CapabilityName;
  primaryProvider: string;
  fallback?: string;
  disableMode: "never" | "allowed" | "provider-swap" | "feature-dependent" | "migration";
  criticality: Criticality;
}

export const CAPABILITY_CATALOG: Record<CapabilityName, CapabilityDefinition> = {
  database: { name: "database", primaryProvider: "postgres", disableMode: "never", criticality: "CORE" },
  cache: { name: "cache", primaryProvider: "redis", fallback: "memory-or-none", disableMode: "allowed", criticality: "OPTIONAL" },
  distributed_lock: { name: "distributed_lock", primaryProvider: "redis", fallback: "postgres", disableMode: "allowed", criticality: "OPTIONAL" },
  idempotency: { name: "idempotency", primaryProvider: "redis", fallback: "postgres", disableMode: "allowed", criticality: "REQUIRED" },
  queue: { name: "queue", primaryProvider: "sqs", fallback: "sync-local-or-db-designed", disableMode: "allowed", criticality: "OPTIONAL" },
  event_bus: { name: "event_bus", primaryProvider: "kafka", fallback: "outbox-sns-sqs", disableMode: "allowed", criticality: "OPTIONAL" },
  object_storage: { name: "object_storage", primaryProvider: "s3", fallback: "minio-or-filesystem-nonprod", disableMode: "provider-swap", criticality: "CORE" },
  search: { name: "search", primaryProvider: "opensearch", fallback: "postgres", disableMode: "allowed", criticality: "OPTIONAL" },
  vector_store: { name: "vector_store", primaryProvider: "pgvector", fallback: "adapter-defined", disableMode: "feature-dependent", criticality: "OPTIONAL" },
  email: { name: "email", primaryProvider: "ses", fallback: "smtp-or-disabled", disableMode: "allowed", criticality: "OPTIONAL" },
  ai: { name: "ai", primaryProvider: "local-ai", fallback: "bedrock-or-external-or-disabled", disableMode: "allowed", criticality: "OPTIONAL" },
  tracing: { name: "tracing", primaryProvider: "opentelemetry", fallback: "logs-metrics", disableMode: "allowed", criticality: "OPTIONAL" },
  metrics: { name: "metrics", primaryProvider: "opentelemetry-prometheus-cloudwatch", fallback: "service-logs", disableMode: "allowed", criticality: "OPERATIONAL" },
  orchestrator: { name: "orchestrator", primaryProvider: "eks", fallback: "ecs-or-docker", disableMode: "migration", criticality: "INFRASTRUCTURE" }
};
