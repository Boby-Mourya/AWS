import type { SwitchClass, SwitchRisk } from './types.js';

export interface SwitchDefinition { kind: SwitchClass; risk: SwitchRisk; execution: string; examples: string[]; }

export const SWITCH_TYPES: Record<SwitchClass, SwitchDefinition> = {
  runtime: { kind: 'runtime', risk: 'GREEN', execution: 'hot-or-gradual-config-rollout', examples: ['feature flags','quotas','tracing sample rate'] },
  'application-provider': { kind: 'application-provider', risk: 'BLUE', execution: 'validated rolling restart/deployment', examples: ['redis->memory','kafka->outbox'] },
  infrastructure: { kind: 'infrastructure', risk: 'AMBER', execution: 'iac-plan-apply-and-health-verification', examples: ['OpenSearch','MSK','Redis cluster'] },
  'compute-migration': { kind: 'compute-migration', risk: 'RED', execution: 'parallel environment and incremental traffic migration', examples: ['EKS<->ECS'] },
  locked: { kind: 'locked', risk: 'LOCKED', execution: 'cannot-disable-in-production', examples: ['authentication','authorization','primary database','encryption'] }
};
