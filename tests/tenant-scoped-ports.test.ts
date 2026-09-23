import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCacheAdapter } from '../packages/platform-sdk/src/fallbacks.js';
import { TenantScopedCache, TenantScopedSearch } from '../packages/security/src/tenant-scoped-ports.js';
import type { SearchPort } from '../packages/capability-contracts/src/index.js';

const healthy=async()=>({status:'HEALTHY' as const,checkedAt:new Date().toISOString()});
test('cache namespaces cannot collide across tenants',async()=>{const base=new MemoryCacheAdapter();const a=new TenantScopedCache(base,{tenantId:'a',workspaceId:'w'});const b=new TenantScopedCache(base,{tenantId:'b',workspaceId:'w'});await a.set('same','A');await b.set('same','B');assert.equal(await a.get('same'),'A');assert.equal(await b.get('same'),'B')});
test('search wrapper injects tenant scope and rejects cross-tenant requests',async()=>{let seen='';const delegate:SearchPort={search:async q=>{seen=q.tenantId;return{hits:[],tookMs:0}},health:healthy};const scoped=new TenantScopedSearch(delegate,{tenantId:'a',workspaceId:'w'});await scoped.search({text:'x'});assert.equal(seen,'a');await assert.rejects(()=>scoped.search({text:'x',tenantId:'b'}),/CROSS_TENANT_SEARCH_DENIED/)});
