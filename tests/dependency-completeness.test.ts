import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDependencyIssues } from '../packages/dependency-engine/src/index.js';
import type { DesiredState } from '../packages/config-engine/src/types.js';

function base():DesiredState{return{platform:{profile:'local',database:{enabled:true,provider:'postgres',required:true},cache:{enabled:false,provider:'redis',fallback:'none'},distributed_lock:{enabled:true,provider:'postgres',fallback:'postgres'},idempotency:{enabled:true,provider:'postgres',fallback:'postgres',required:true},queue:{enabled:true,provider:'sync',fallback:'sync'},event_bus:{enabled:true,provider:'outbox',fallback:'outbox'},object_storage:{enabled:true,provider:'filesystem',fallback:'filesystem',required:true},vector_store:{enabled:false,provider:'disabled'},search:{enabled:true,provider:'postgres',fallback:'postgres'},ai:{enabled:false,provider:'disabled',fallback:'disabled'},observability:{metrics:true,tracing:false,logging:true}},features:{rag:false}}}

test('BullMQ is blocked without Redis and offers compatible migrations',()=>{const s=base();s.platform.queue.provider='bullmq';const issue=resolveDependencyIssues(s).find(i=>i.capability==='queue');assert.equal(issue?.dependency,'redis');assert.ok(issue?.migrations.includes('sqs'));});
test('Redis idempotency is blocked without Redis and offers PostgreSQL',()=>{const s=base();s.platform.idempotency.provider='redis';const issue=resolveDependencyIssues(s).find(i=>i.capability==='idempotency');assert.equal(issue?.dependency,'redis');assert.deepEqual(issue?.migrations,['postgres']);});
