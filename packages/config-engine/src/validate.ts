import type { DesiredState } from './types.js';

const providers: Record<string, ReadonlySet<string>> = {
  database: new Set(['postgres']),
  cache: new Set(['redis','memory','none']),
  distributed_lock: new Set(['redis','postgres']),
  idempotency: new Set(['redis','postgres']),
  queue: new Set(['sqs','bullmq','rabbitmq','sync']),
  event_bus: new Set(['kafka','sns-sqs','outbox']),
  object_storage: new Set(['s3','minio','filesystem']),
  vector_store: new Set(['pgvector','disabled']),
  search: new Set(['opensearch','postgres']),
  ai: new Set(['local-ai','bedrock','external','disabled'])
};

export interface ValidationIssue { path: string; code: string; message: string; }

export function validateDesiredState(state: DesiredState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!state.platform.database.enabled || state.platform.database.provider !== 'postgres') issues.push({ path: 'platform.database', code: 'LOCKED_DATABASE', message: 'Primary PostgreSQL database is required.' });
  if (!state.platform.object_storage.enabled) issues.push({ path: 'platform.object_storage.enabled', code: 'CORE_CAPABILITY_DISABLED', message: 'Object storage must have an active provider.' });
  if (!state.platform.observability.logging) issues.push({ path: 'platform.observability.logging', code: 'LOCKED_LOGGING', message: 'Basic structured logging cannot be disabled.' });

  for (const [name, allowed] of Object.entries(providers)) {
    const selection = (state.platform as unknown as Record<string, { enabled:boolean; provider:string; fallback?:string }>)[name];
    if (!selection) { issues.push({ path: `platform.${name}`, code: 'MISSING_CAPABILITY', message: `Missing capability ${name}` }); continue; }
    if (!allowed.has(selection.provider)) issues.push({ path: `platform.${name}.provider`, code: 'INVALID_PROVIDER', message: `Unsupported provider ${selection.provider}` });
    if (!selection.enabled && selection.required) issues.push({ path: `platform.${name}.enabled`, code: 'REQUIRED_DISABLED', message: `${name} is required` });
  }

  const needsFallback = ['cache','distributed_lock','idempotency','queue','event_bus','object_storage','search','ai'];
  for (const name of needsFallback) {
    const selection = (state.platform as unknown as Record<string, { enabled:boolean; fallback?:string }>)[name];
    if (selection?.enabled && !selection.fallback) issues.push({ path: `platform.${name}.fallback`, code: 'MISSING_FALLBACK', message: `Enabled ${name} requires an explicit fallback/degraded mode` });
  }
  if (state.features.rag && (!state.platform.ai.enabled || !state.platform.vector_store.enabled || !state.platform.object_storage.enabled)) issues.push({ path: 'features.rag', code: 'RAG_DEPENDENCY', message: 'RAG requires AI, vector_store and object_storage.' });
  return issues;
}

export function assertValidDesiredState(state: DesiredState): void {
  const issues = validateDesiredState(state);
  if (issues.length) throw new Error(`Invalid desired state: ${issues.map(i => `${i.path}:${i.code}`).join(', ')}`);
}
