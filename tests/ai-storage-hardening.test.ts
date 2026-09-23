import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AIGateway } from '../services/ai/src/gateway.js';
import { FilesystemObjectStorageAdapter } from '../adapters/s3/src/local.js';
import type { AIModelPort } from '../packages/capability-contracts/src/index.js';

const healthy=async()=>({status:'HEALTHY' as const,checkedAt:new Date().toISOString()});
test('AI gateway retries routed provider and emits usage telemetry',async()=>{let calls=0;const provider:AIModelPort={generate:async()=>{calls++;if(calls===1)throw new Error('transient');return{output:'ok',model:'m',inputTokens:1,outputTokens:1,provider:'route'}},health:healthy};const events:string[]=[];const gateway=new AIGateway({primary:provider,route:()=>provider,maxRetries:1,timeoutMs:1000,telemetry:{record:async e=>{events.push(e.name)}}});const result=await gateway.generate({tenantId:'t',workspaceId:'w',input:'x',correlationId:'c'});assert.equal(result.provider,'route');assert.equal(calls,2);assert.ok(events.includes('ai.request'))});
test('filesystem object storage stays inside configured root',async()=>{const root=await mkdtemp(join(tmpdir(),'platform-storage-'));try{process.env.NODE_ENV='test';const storage=new FilesystemObjectStorageAdapter(root);await storage.put('tenants/t/file.txt',new TextEncoder().encode('ok'));assert.equal(new TextDecoder().decode(await storage.get('tenants/t/file.txt')),'ok');await assert.rejects(()=>storage.put('../escape',new Uint8Array([1])),/INVALID_STORAGE_KEY/)}finally{await rm(root,{recursive:true,force:true})}});
