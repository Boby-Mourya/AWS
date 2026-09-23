export interface HealthStatus {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  message?: string;
  checkedAt: string;
}

export interface HealthAware {
  health(): Promise<HealthStatus>;
}

export type Criticality = "CORE" | "REQUIRED" | "OPTIONAL" | "OPERATIONAL" | "INFRASTRUCTURE";
