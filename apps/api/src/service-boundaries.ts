export const SERVICE_BOUNDARIES={
  identity:['authentication','session','token-validation'],
  tenant:['tenant-workspace-resolution','tenant-lifecycle'],
  document:['document-metadata','authorized-processing'],
  notification:['notification-orchestration'],
  integration:['third-party-integrations'],
  workflow:['workflow-use-cases'],
  audit:['sensitive-operation-audit'],
  reporting:['reports','exports'],
  ai:['ai-use-cases-via-AIModelPort']
} as const;

export const GATEWAY_RESPONSIBILITIES=['authentication-and-token-validation','authorization-context-propagation','tenant-workspace-resolution','rate-limiting-and-quotas','correlation-request-trace-ids','request-size-limits','schema-validation','api-versioning','security-headers','routing-and-observability-context'] as const;
