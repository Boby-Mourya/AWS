import test from 'node:test';
import assert from 'node:assert/strict';
import { planRedisOff, planKafkaOff, planOpenSearchOff, planEksToEcs, planAiChange, WorkflowPreconditionError } from '../packages/config-engine/src/workflows.ts';

const base = { environment:'production' as const, actorRoles:['platform-admin'], fallbacksHealthy:true };

test('Redis-off follows all 12 mandated steps and never destroys infrastructure', () => {
  const plan = planRedisOff({...base,databaseCapacitySafe:true});
  assert.equal(plan.steps.length,12);
  assert.equal(plan.destructive,false);
  assert.match(plan.steps[10]!.action,/infrastructure intact/i);
});

test('Redis-off rejects unsafe DB capacity', () => assert.throws(()=>planRedisOff({...base,databaseCapacitySafe:false}), WorkflowPreconditionError));

test('Kafka-off requires healthy alternate bus and no Kafka-only consumers', () => {
  assert.throws(()=>planKafkaOff({...base,alternateEventBusHealthy:false}), WorkflowPreconditionError);
  const plan = planKafkaOff({...base,alternateEventBusHealthy:true,kafkaOnlyConsumers:0,consumerLag:0,dlqHealthy:true,schemaCompatible:true});
  assert.match(plan.steps[3]!.action,/outbox -> SNS\/SQS/i);
});

test('OpenSearch uses shadow validation before cutover', () => {
  const plan = planOpenSearchOff({...base,postgresSearchIndexesHealthy:true,shadowSearchCorrect:true,shadowSearchLatencyAcceptable:true});
  assert.match(plan.steps[1]!.action,/shadow/i);
});

test('EKS to ECS is progressive migration and AI disable degrades cleanly', () => {
  const compute = planEksToEcs(base);
  assert.deepEqual(compute.steps.filter(s=>s.action.includes('shift traffic')).map(s=>s.action.match(/\d+%/)?.[0]),['5%','25%','50%','100%']);
  const ai = planAiChange(base,true);
  assert.ok(ai.steps.some(s=>s.action.includes('CAPABILITY_UNAVAILABLE')));
});
