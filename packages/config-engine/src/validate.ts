import { DEPLOYMENT_PROFILES } from '@platform/config';
import type { CapabilitySelection, DesiredState } from './types.js';

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

const fallbackProviders: Record<string, ReadonlySet<string>> = {
  cache: new Set(['redis','memory','none']),
  distributed_lock: new Set(['redis','postgres']),
  idempotency: new Set(['redis','postgres']),
  queue: new Set(['sqs','bullmq','rabbitmq','sync']),
  event_bus: new Set(['kafka','sns-sqs','outbox']),
  object_storage: new Set(['s3','minio','filesystem']),
  search: new Set(['opensearch','postgres']),
  ai: new Set(['local-ai','bedrock','external','disabled'])
};

export interface ValidationIssue { path: string; code: string; message: string; }

function asSelection(value: unknown): CapabilitySelection | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v=value as Partial<CapabilitySelection>;
  if (typeof v.enabled !== 'boolean' || typeof v.provider !== 'string' || !v.provider) return undefined;
  return v as CapabilitySelection;
}

export function validateDesiredState(state: DesiredState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!state || typeof state !== 'object' || !state.platform || !state.features) {
    return [{path:'$',code:'INVALID_SHAPE',message:'Desired state must contain platform and features objects.'}];
  }
  if (!Object.hasOwn(DEPLOYMENT_PROFILES,state.platform.profile)) issues.push({path:'platform.profile',code:'INVALID_PROFILE',message:`Unsupported deployment profile ${String(state.platform.profile)}`});

  const platform=state.platform as unknown as Record<string,unknown>;
  for (const [name,allowed] of Object.entries(providers)) {
    const selection=asSelection(platform[name]);
    if (!selection) { issues.push({path:`platform.${name}`,code:'MISSING_CAPABILITY',message:`Missing or malformed capability ${name}`}); continue; }
    if (!allowed.has(selection.provider)) issues.push({path:`platform.${name}.provider`,code:'INVALID_PROVIDER',message:`Unsupported provider ${selection.provider}`});
    if (selection.required && !selection.enabled) issues.push({path:`platform.${name}.enabled`,code:'REQUIRED_DISABLED',message:`${name} is required and cannot be disabled`});
    if (selection.enabled && fallbackProviders[name] && !selection.fallback) issues.push({path:`platform.${name}.fallback`,code:'MISSING_FALLBACK',message:`Enabled ${name} requires an explicit fallback/degraded mode`});
    if (selection.fallback && fallbackProviders[name] && !fallbackProviders[name]!.has(selection.fallback)) issues.push({path:`platform.${name}.fallback`,code:'INVALID_FALLBACK',message:`Unsupported fallback ${selection.fallback} for ${name}`});
  }

  const database=asSelection(platform.database);const storage=asSelection(platform.object_storage);const ai=asSelection(platform.ai);const vector=asSelection(platform.vector_store);
  if (!database?.enabled || database.provider !== 'postgres') issues.push({path:'platform.database',code:'LOCKED_DATABASE',message:'Primary PostgreSQL database is required.'});
  if (!storage?.enabled) issues.push({path:'platform.object_storage.enabled',code:'CORE_CAPABILITY_DISABLED',message:'Object storage must have an active provider.'});
  if (!state.platform.observability || typeof state.platform.observability.logging !== 'boolean' || !state.platform.observability.logging) issues.push({path:'platform.observability.logging',code:'LOCKED_LOGGING',message:'Basic structured logging cannot be disabled.'});
  if (state.features.rag && (!ai?.enabled || !vector?.enabled || !storage?.enabled)) issues.push({path:'features.rag',code:'RAG_DEPENDENCY',message:'RAG requires AI, vector_store and object_storage.'});
  return issues;
}

export function assertValidDesiredState(state: DesiredState): void {
  const issues=validateDesiredState(state);
  if (issues.length) throw new Error(`Invalid desired state: ${issues.map(i=>`${i.path}:${i.code}`).join(', ')}`);
}
