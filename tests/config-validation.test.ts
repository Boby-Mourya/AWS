import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDesiredState } from '../packages/config-engine/src/validate.js';
import type { DesiredState } from '../packages/config-engine/src/types.js';

function state():DesiredState{return{platform:{profile:'local',database:{enabled:true,provider:'postgres',required:true},cache:{enabled:true,provider:'memory',fallback:'none'},distributed_lock:{enabled:true,provider:'postgres',fallback:'postgres'},idempotency:{enabled:true,provider:'postgres',fallback:'postgres',required:true},queue:{enabled:true,provider:'sync',fallback:'sync'},event_bus:{enabled:true,provider:'outbox',fallback:'outbox'},object_storage:{enabled:true,provider:'filesystem',fallback:'filesystem',required:true},vector_store:{enabled:false,provider:'disabled'},search:{enabled:true,provider:'postgres',fallback:'postgres'},ai:{enabled:false,provider:'disabled',fallback:'disabled'},observability:{metrics:true,tracing:false,logging:true}},features:{rag:false}}}

test('valid local desired state is accepted',()=>assert.deepEqual(validateDesiredState(state()),[]));
test('unknown provider and fallback fail before startup',()=>{const s=state();s.platform.cache.provider='mystery';s.platform.cache.fallback='mystery';const codes=validateDesiredState(s).map(i=>i.code);assert.ok(codes.includes('INVALID_PROVIDER'));assert.ok(codes.includes('INVALID_FALLBACK'));});
test('required capability cannot be disabled',()=>{const s=state();s.platform.idempotency.enabled=false;assert.ok(validateDesiredState(s).some(i=>i.code==='REQUIRED_DISABLED'));});
test('RAG fails closed without AI/vector/object storage dependencies',()=>{const s=state();s.features.rag=true;assert.ok(validateDesiredState(s).some(i=>i.code==='RAG_DEPENDENCY'));});
