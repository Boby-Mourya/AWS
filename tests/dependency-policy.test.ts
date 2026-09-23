import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDependencyIssues } from '../packages/dependency-engine/src/index.ts';
import { evaluatePlatformPolicy, isLockedProductionCapability, lockedProductionCapability } from '../packages/policy-engine/src/index.ts';
import type { DesiredState } from '../packages/config-engine/src/types.ts';

const state = (): DesiredState => ({
  platform: {
    profile: 'enterprise',
    database: { enabled: true, provider: 'postgres', required: true },
    cache: { enabled: false, provider: 'none', fallback: 'memory' },
    distributed_lock: { enabled: true, provider: 'postgres', fallback: 'postgres' },
    idempotency: { enabled: true, provider: 'postgres', fallback: 'postgres' },
    queue: { enabled: true, provider: 'bullmq', fallback: 'sqs' },
    event_bus: { enabled: true, provider: 'outbox', fallback: 'outbox' },
    object_storage: { enabled: true, provider: 's3', fallback: 'filesystem', required: true },
    vector_store: { enabled: false, provider: 'disabled' },
    search: { enabled: true, provider: 'postgres', fallback: 'postgres' },
    ai: { enabled: false, provider: 'disabled', fallback: 'disabled' },
    observability: { metrics: true, tracing: true, logging: true }
  }, features: { rag: false }
});

test('BullMQ is blocked when Redis is disabled and migration options are returned', () => {
  const issues = resolveDependencyIssues(state());
  assert.equal(issues[0]?.capability, 'queue');
  assert.equal(issues[0]?.dependency, 'redis');
  assert.ok(issues[0]?.migrations.includes('sqs'));
});

test('production provider switch requires privileged role and approval', () => {
  const denied = evaluatePlatformPolicy({ environment:'production', actorRoles:['platform-admin'], switchClass:'application-provider', operation:'change-provider', capability:'cache' });
  assert.equal(denied.allowed, false);
  assert.ok(denied.reasons.includes('PRODUCTION_APPROVAL_REQUIRED'));
  const allowed = evaluatePlatformPolicy({ environment:'production', actorRoles:['platform-admin'], switchClass:'application-provider', operation:'change-provider', capability:'cache', approved:true });
  assert.equal(allowed.allowed, true);
});

test('locked production controls cannot be disabled, stopped or destroyed through aliases', () => {
  assert.equal(isLockedProductionCapability('database'), true);
  assert.equal(lockedProductionCapability('PostgreSQL'), 'primary_persistent_datastore');
  assert.equal(isLockedProductionCapability('structured-logging'), true);
  for (const operation of ['disable','stop','destroy'] as const) {
    const decision = evaluatePlatformPolicy({ environment:'production', actorRoles:['platform-admin'], switchClass:'infrastructure', operation, capability:'database', approved:true });
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.includes('LOCKED_PRODUCTION_CAPABILITY'));
  }
});
