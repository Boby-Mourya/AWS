import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCacheAdapter } from '../packages/platform-sdk/src/fallbacks.js';
import { cacheAside } from '../packages/platform-sdk/src/cache-aside.js';
import { WorkerRunner } from '../apps/workers/src/runner.js';
import type { IdempotencyPort } from '../packages/capability-contracts/src/index.js';

const healthy=async()=>({status:'HEALTHY' as const,checkedAt:new Date().toISOString()});
test('memory cache is bounded and evicts least recently used entry',async()=>{const cache=new MemoryCacheAdapter(2);await cache.set('a',1);await cache.set('b',2);await cache.get('a');await cache.set('c',3);assert.equal(await cache.get('b'),null);assert.equal(cache.size(),2)});
test('cache-aside collapses concurrent misses into one database load',async()=>{const cache=new MemoryCacheAdapter();let loads=0;const load=async()=>{loads++;await new Promise(r=>setTimeout(r,5));return 42};const values=await Promise.all([cacheAside(cache,'k',60,load),cacheAside(cache,'k',60,load),cacheAside(cache,'k',60,load)]);assert.deepEqual(values,[42,42,42]);assert.equal(loads,1)});
test('worker records completion idempotency and invokes DLQ hook at terminal failure',async()=>{const values=new Map<string,Uint8Array>();const idem:IdempotencyPort={get:async k=>values.get(k)??null,putIfAbsent:async(k,v)=>{if(values.has(k))return false;values.set(k,v);return true},health:healthy};const base={job_id:'j',job_type:'x',tenant_id:'t',payload:{},attempt:0,max_attempts:2,created_at:new Date().toISOString(),correlation_id:'c',idempotency_key:'i'};let calls=0;const ok=new WorkerRunner(async()=>{calls++},30000,1,{idempotency:idem});assert.equal((await ok.run(base)).state,'COMPLETED');assert.equal((await ok.run(base)).state,'COMPLETED');assert.equal(calls,1);let dlq=0;const bad=new WorkerRunner(async()=>{throw new Error('boom')},30000,1,{onDeadLetter:async()=>{dlq++}});assert.equal((await bad.run({...base,attempt:1})).state,'DEAD_LETTERED');assert.equal(dlq,1)});
