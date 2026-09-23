export type DeploymentProfileName = "local" | "minimal" | "standard" | "high-availability" | "enterprise" | "ai-enterprise";

export interface DeploymentProfile {
  name: DeploymentProfileName;
  compute: string;
  coreData: string[];
  optionalInfrastructure: string[];
  intendedUse: string;
}

export const DEPLOYMENT_PROFILES: Record<DeploymentProfileName, DeploymentProfile> = {
  local: { name: "local", compute: "docker-compose", coreData: ["postgresql", "filesystem-or-minio"], optionalInfrastructure: ["memory-cache", "sync-jobs", "local-ai"], intendedUse: "developer laptop/offline" },
  minimal: { name: "minimal", compute: "ecs-fargate", coreData: ["rds-postgresql", "s3"], optionalInfrastructure: ["sqs"], intendedUse: "small production" },
  standard: { name: "standard", compute: "ecs-or-eks", coreData: ["rds", "s3"], optionalInfrastructure: ["redis", "sqs", "opentelemetry"], intendedUse: "typical SaaS" },
  "high-availability": { name: "high-availability", compute: "eks-or-ecs-multi-az", coreData: ["rds-or-aurora-multi-az", "s3"], optionalInfrastructure: ["redis-multi-az", "autoscaling", "stronger-dr"], intendedUse: "business-critical" },
  enterprise: { name: "enterprise", compute: "eks", coreData: ["rds-or-aurora", "s3"], optionalInfrastructure: ["redis", "msk", "sqs", "opensearch", "keda", "full-observability"], intendedUse: "large multi-tenant" },
  "ai-enterprise": { name: "ai-enterprise", compute: "eks-gpu-pools", coreData: ["rds", "s3", "pgvector"], optionalInfrastructure: ["ai-gateway", "gpu-workers", "model-routing", "rag", "quotas"], intendedUse: "AI-heavy workloads" }
};
