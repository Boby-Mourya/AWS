import test from 'node:test';
import assert from 'node:assert/strict';
import { UploadSecurityPipeline, inspectZipArchive } from '../services/document/src/upload-security.js';
import { IsolatedDocumentParser } from '../services/document/src/parser-sandbox.js';
import { AIGateway, buildAuthorizedRagPrompt } from '../services/ai/src/gateway.js';
import { ShadowSearchAdapter } from '../packages/platform-sdk/src/shadow-search.js';
import type { AIModelPort, JobQueuePort, ObjectStoragePort, SearchPort } from '../packages/capability-contracts/src/index.js';

const healthy=async()=>({status:'HEALTHY' as const,checkedAt:new Date().toISOString()});

function zipWithCentralSizes(compressed:number,uncompressed:number):Uint8Array{
  const bytes=new Uint8Array(76);bytes.set([0x50,0x4b,0x03,0x04],0);bytes.set([0x50,0x4b,0x01,0x02],30);const view=new DataView(bytes.buffer);view.setUint32(50,compressed,true);view.setUint32(54,uncompressed,true);return bytes;
}

test('upload pipeline rejects bad magic bytes before processing',async()=>{
  const objects=new Map<string,Uint8Array>();
  const storage:ObjectStoragePort&{signedUploadUrl:(k:string,e:number,t:string)=>Promise<string>}={put:async(k,b)=>{objects.set(k,b)},get:async(k)=>objects.get(k)??new Uint8Array(),delete:async(k)=>{objects.delete(k)},signedUrl:async()=>'',signedUploadUrl:async(k)=>`upload://${k}`,health:healthy};
  const queued:string[]=[];const queue:JobQueuePort={enqueue:async(q)=>{queued.push(q);return'job'},health:healthy};
  const pipeline=new UploadSecurityPipeline(storage,{scan:async()=>({clean:true})},queue,{maxBytes:1024,allowedExtensions:new Set(['.pdf']),allowedMimeTypes:new Set(['application/pdf']),maxArchiveExpansionRatio:20},async()=>true);
  const d={tenantId:'t1',workspaceId:'w1',filename:'x.pdf',mimeType:'application/pdf',sizeBytes:4};const auth=await pipeline.authorizeUpload(d);objects.set(auth.quarantineKey,new Uint8Array([1,2,3,4]));
  await assert.rejects(()=>pipeline.inspectAndApprove(d,auth.uploadId),/UPLOAD_MAGIC_BYTES_REJECTED/);assert.equal(queued.length,0);
});

test('archive expansion is computed server-side and zip bombs are rejected',async()=>{
  const bytes=zipWithCentralSizes(1,100);const archive=inspectZipArchive(bytes);assert.equal(archive.totalUncompressedBytes,100);assert.equal(archive.maxEntryExpansionRatio,100);
  const objects=new Map<string,Uint8Array>();const storage:ObjectStoragePort&{signedUploadUrl:(k:string,e:number,t:string)=>Promise<string>}={put:async(k,b)=>{objects.set(k,b)},get:async(k)=>objects.get(k)??new Uint8Array(),delete:async(k)=>{objects.delete(k)},signedUrl:async()=>'',signedUploadUrl:async(k)=>`upload://${k}`,health:healthy};const queue:JobQueuePort={enqueue:async()=> 'job',health:healthy};
  const pipeline=new UploadSecurityPipeline(storage,{scan:async()=>({clean:true})},queue,{maxBytes:1024,allowedExtensions:new Set(['.zip']),allowedMimeTypes:new Set(['application/zip']),maxArchiveExpansionRatio:10,maxArchiveEntries:100,maxArchiveUncompressedBytes:1000},async()=>true);
  const d={tenantId:'t1',workspaceId:'w1',filename:'x.zip',mimeType:'application/zip',sizeBytes:bytes.length};const auth=await pipeline.authorizeUpload(d);objects.set(auth.quarantineKey,bytes);await assert.rejects(()=>pipeline.inspectAndApprove(d,auth.uploadId),/ARCHIVE_BOMB_REJECTED/);
});

test('document parser requires the constrained no-network sandbox policy',async()=>{let policySeen:any;const parser=new IsolatedDocumentParser({execute:async(_input,policy)=>{policySeen=policy;return{text:'ok'}}});const result=await parser.parse(new Uint8Array([1]));assert.equal(result.text,'ok');assert.equal(policySeen.networkAccess,'none');assert.equal(policySeen.readOnlyRootFilesystem,true);assert.ok(policySeen.memoryMb>0&&policySeen.cpuUnits>0)});

test('AI gateway falls back and records provider result',async()=>{
  const failed:AIModelPort={generate:async()=>{throw new Error('down')},health:async()=>({status:'UNHEALTHY',checkedAt:new Date().toISOString()})};
  const fallback:AIModelPort={generate:async()=>({output:'ok',model:'m',inputTokens:2,outputTokens:1,provider:'fallback'}),health:healthy};
  const gateway=new AIGateway({primary:failed,fallback,authorize:async()=>true});const result=await gateway.generate({tenantId:'t1',workspaceId:'w1',input:'hello',correlationId:'c1'});assert.equal(result.provider,'fallback');
});

test('RAG blocks cross-tenant retrieved context',async()=>{await assert.rejects(()=>buildAuthorizedRagPrompt({tenantId:'t1',workspaceId:'w1',question:'q',retrieve:async()=>[{content:'secret',tenantId:'t2',workspaceId:'w1'}]}),/CROSS_TENANT_RAG_CONTEXT_BLOCKED/)});
test('RAG blocks cross-workspace retrieved context inside the same tenant',async()=>{await assert.rejects(()=>buildAuthorizedRagPrompt({tenantId:'t1',workspaceId:'w1',question:'q',retrieve:async()=>[{content:'secret',tenantId:'t1',workspaceId:'w2'}]}),/CROSS_TENANT_RAG_CONTEXT_BLOCKED/)});
test('tenant-root RAG cannot consume workspace-scoped retrieved context',async()=>{await assert.rejects(()=>buildAuthorizedRagPrompt({tenantId:'t1',question:'q',retrieve:async()=>[{content:'secret',tenantId:'t1',workspaceId:'w1'}]}),/CROSS_TENANT_RAG_CONTEXT_BLOCKED/)});

test('shadow search returns active results and observes comparison',async()=>{
  const make=(id:string,ms:number):SearchPort=>({search:async()=>({hits:[{id,score:1,source:{}}],tookMs:ms}),health:healthy});let observed=false;const adapter=new ShadowSearchAdapter(make('a',2),make('a',3),o=>{observed=o.overlap===1});const result=await adapter.search({text:'x',tenantId:'t1'});assert.equal(result.hits[0]?.id,'a');assert.equal(observed,true);
});
