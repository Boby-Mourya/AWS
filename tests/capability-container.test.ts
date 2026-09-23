import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityContainer, ProviderRegistry } from '../packages/platform-sdk/src/index.js';
import { MemoryCacheAdapter, NoCacheAdapter } from '../packages/platform-sdk/src/fallbacks.js';
import type { DesiredState } from '../packages/config-engine/src/types.js';

const base:DesiredState={platform:{profile:'local',database:{enabled:true,provider:'postgres',required:true},cache:{enabled:true,provider:'memory',fallback:'none'},distributed_lock:{enabled:true,provider:'postgres',fallback:'postgres'},idempotency:{enabled:true,provider:'postgres',fallback:'postgres',required:true},queue:{enabled:true,provider:'sync',fallback:'sync'},event_bus:{enabled:true,provider:'outbox',fallback:'outbox'},object_storage:{enabled:true,provider:'filesystem',fallback:'filesystem',required:true},vector_store:{enabled:false,provider:'disabled'},search:{enabled:true,provider:'postgres',fallback:'postgres'},ai:{enabled:false,provider:'disabled',fallback:'disabled'},observability:{metrics:true,tracing:false,logging:true}},features:{rag:false}};

test('capability container resolves configured provider without exposing implementation to application code',async()=>{
  const registry=new ProviderRegistry();registry.register('cache','memory',()=>new MemoryCacheAdapter());registry.register('cache','none',()=>new NoCacheAdapter());
  const container=new CapabilityContainer(registry,base,'development');const resolved=await container.resolve('cache');assert.equal(resolved.provider,'memory');assert.equal(resolved.degraded,false);
});

test('disabled optional capability resolves explicit degraded provider',async()=>{
  const registry=new ProviderRegistry();registry.register('cache','none',()=>new NoCacheAdapter());const state=structuredClone(base);state.platform.cache.enabled=false;state.platform.cache.fallback='none';
  const container=new CapabilityContainer(registry,state,'development');const resolved=await container.resolve('cache');assert.equal(resolved.provider,'none');assert.equal(resolved.degraded,true);
});
