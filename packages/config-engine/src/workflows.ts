export type WorkflowKind = 'redis-off' | 'kafka-off' | 'opensearch-off' | 'eks-to-ecs' | 'ai-off' | 'ai-provider-switch';

export interface WorkflowContext {
  environment: 'development'|'testing'|'staging'|'production';
  actorRoles: string[];
  fallbacksHealthy: boolean;
  databaseCapacitySafe?: boolean;
  alternateEventBusHealthy?: boolean;
  kafkaOnlyConsumers?: number;
  consumerLag?: number;
  dlqHealthy?: boolean;
  schemaCompatible?: boolean;
  postgresSearchIndexesHealthy?: boolean;
  shadowSearchCorrect?: boolean;
  shadowSearchLatencyAcceptable?: boolean;
  targetComputeHealthy?: boolean;
  aiFallbackHealthy?: boolean;
}

export interface WorkflowStep {
  id: string;
  action: string;
  gate?: string;
  rollbackOnFailure?: boolean;
}

export interface SwitchWorkflow {
  kind: WorkflowKind;
  risk: 'BLUE'|'AMBER'|'RED';
  steps: WorkflowStep[];
  destructive: false;
}

export class WorkflowPreconditionError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name='WorkflowPreconditionError'; }
}

function requirePlatformRole(ctx: WorkflowContext): void {
  if (!ctx.actorRoles.some(role => ['platform-admin','sre','security-admin'].includes(role))) throw new WorkflowPreconditionError('RBAC_DENIED','Platform operations require a privileged role.');
}

export function planRedisOff(ctx: WorkflowContext): SwitchWorkflow {
  requirePlatformRole(ctx);
  if (!ctx.fallbacksHealthy) throw new WorkflowPreconditionError('FALLBACK_UNHEALTHY','All Redis fallbacks must be healthy.');
  if (ctx.databaseCapacitySafe === false) throw new WorkflowPreconditionError('DATABASE_CAPACITY_UNSAFE','Redis-off would make database capacity unsafe.');
  return { kind:'redis-off', risk:'BLUE', destructive:false, steps:[
    {id:'1',action:'validate RBAC and environment policy'},
    {id:'2',action:'resolve dependency graph'},
    {id:'3',action:'verify memory/no-cache, PostgreSQL lock/idempotency, queue and pub/sub fallbacks'},
    {id:'4',action:'estimate increased PostgreSQL load',gate:'database capacity safe'},
    {id:'5',action:'create auditable change request and impact report'},
    {id:'6',action:'obtain approval when environment is production',gate:ctx.environment==='production'?'approval required':'not required'},
    {id:'7',action:'roll out provider/configuration switch gradually',rollbackOnFailure:true},
    {id:'8',action:'verify cache bypass, locks, sessions, idempotency and queue behavior',rollbackOnFailure:true},
    {id:'9',action:'observe latency, errors and database metrics during stabilization',rollbackOnFailure:true},
    {id:'10',action:'mark Redis capability disabled only after health passes'},
    {id:'11',action:'keep Redis infrastructure intact; stop/destroy is a separate later action'},
    {id:'12',action:'automatically roll back on SLO or health failure',rollbackOnFailure:true}
  ]};
}

export function planKafkaOff(ctx: WorkflowContext): SwitchWorkflow {
  requirePlatformRole(ctx);
  if (!ctx.alternateEventBusHealthy) throw new WorkflowPreconditionError('EVENTBUS_FALLBACK_UNHEALTHY','Kafka can only be disabled with a healthy alternate EventBusPort.');
  if ((ctx.kafkaOnlyConsumers ?? 0) > 0) throw new WorkflowPreconditionError('KAFKA_ONLY_CONSUMERS','Kafka-only consumers must be migrated first.');
  if ((ctx.consumerLag ?? 0) > 0) throw new WorkflowPreconditionError('CONSUMER_LAG_PRESENT','Drain consumer lag before cutover.');
  if (ctx.dlqHealthy === false || ctx.schemaCompatible === false) throw new WorkflowPreconditionError('EVENTING_HEALTH_FAILED','DLQ and schema compatibility must pass.');
  return { kind:'kafka-off',risk:'BLUE',destructive:false,steps:[
    {id:'1',action:'verify all event-emitting domain writes use transactional outbox'},
    {id:'2',action:'verify alternate EventBusPort health, consumer lag, DLQ, schema compatibility and no Kafka-only consumers'},
    {id:'3',action:'enable controlled dual-route only when migration requires it; keep consumers idempotent'},
    {id:'4',action:'cut EventBusPort over to outbox -> SNS/SQS/local dispatcher',rollbackOnFailure:true},
    {id:'5',action:'verify no business event loss via outbox/inbox accounting',rollbackOnFailure:true},
    {id:'6',action:'mark Kafka disabled while leaving MSK infrastructure intact'}
  ]};
}

export function planOpenSearchOff(ctx: WorkflowContext): SwitchWorkflow {
  requirePlatformRole(ctx);
  if (!ctx.postgresSearchIndexesHealthy) throw new WorkflowPreconditionError('POSTGRES_SEARCH_UNHEALTHY','PostgreSQL search indexes must be healthy.');
  if (!ctx.shadowSearchCorrect || !ctx.shadowSearchLatencyAcceptable) throw new WorkflowPreconditionError('SHADOW_SEARCH_FAILED','Shadow result correctness and latency must pass.');
  return { kind:'opensearch-off',risk:'BLUE',destructive:false,steps:[
    {id:'1',action:'verify PostgreSQL full-text indexes'},
    {id:'2',action:'run OpenSearch/PostgreSQL shadow queries and compare result correctness and latency'},
    {id:'3',action:'switch SearchPort reads to PostgreSQL',rollbackOnFailure:true},
    {id:'4',action:'observe search errors and latency',rollbackOnFailure:true},
    {id:'5',action:'disable OpenSearch application usage; optional destroy remains separate'}
  ]};
}

export function planEksToEcs(ctx: WorkflowContext): SwitchWorkflow {
  requirePlatformRole(ctx);
  if (ctx.targetComputeHealthy === false) throw new WorkflowPreconditionError('TARGET_COMPUTE_UNHEALTHY','ECS target health must pass before traffic migration.');
  return { kind:'eks-to-ecs',risk:'RED',destructive:false,steps:[
    {id:'1',action:'provision parallel ECS target environment'},
    {id:'2',action:'deploy the exact same immutable application images'},
    {id:'3',action:'validate target health',gate:'target healthy'},
    {id:'4',action:'shift traffic to ECS at 5%',rollbackOnFailure:true},
    {id:'5',action:'shift traffic to ECS at 25%',rollbackOnFailure:true},
    {id:'6',action:'shift traffic to ECS at 50%',rollbackOnFailure:true},
    {id:'7',action:'shift traffic to ECS at 100%',rollbackOnFailure:true},
    {id:'8',action:'drain EKS source environment'},
    {id:'9',action:'disable EKS application placement; removal is a separate approved IaC action'}
  ]};
}

export function planAiChange(ctx: WorkflowContext, disable: boolean): SwitchWorkflow {
  requirePlatformRole(ctx);
  if (!disable && ctx.aiFallbackHealthy === false) throw new WorkflowPreconditionError('AI_TARGET_UNHEALTHY','Target AI provider must be healthy before switch.');
  return { kind:disable?'ai-off':'ai-provider-switch',risk:'BLUE',destructive:false,steps:[
    {id:'1',action:'route all changes through AIModelPort / AI Gateway'},
    {id:'2',action:'disable or hide AI-dependent UI actions cleanly'},
    {id:'3',action:'return CAPABILITY_UNAVAILABLE for disabled AI instead of generic 500s'},
    {id:'4',action:'stop/suspend AI workers and scale GPU workers to zero where applicable'},
    {id:'5',action:'verify unrelated platform modules remain healthy',rollbackOnFailure:true},
    {id:'6',action:disable?'mark AI disabled':'cut AIModelPort to target provider and verify telemetry',rollbackOnFailure:true}
  ]};
}

export function planSwitch(kind: WorkflowKind, ctx: WorkflowContext): SwitchWorkflow {
  if (kind==='redis-off') return planRedisOff(ctx);
  if (kind==='kafka-off') return planKafkaOff(ctx);
  if (kind==='opensearch-off') return planOpenSearchOff(ctx);
  if (kind==='eks-to-ecs') return planEksToEcs(ctx);
  return planAiChange(ctx, kind==='ai-off');
}
