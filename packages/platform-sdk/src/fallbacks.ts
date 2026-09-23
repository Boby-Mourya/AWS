import { randomUUID } from 'node:crypto';
import type { AIModelPort, AIModelRequest, AIModelResponse, CachePort, EventBusPort, JobQueuePort, ObjectStoragePort, SearchPort, SearchQuery, SearchResult } from '@platform/capability-contracts';
import type { DomainEvent } from '@platform/domain';
const healthy=async()=>({status:'HEALTHY' as const,checkedAt:new Date().toISOString()});

export class MemoryCacheAdapter implements CachePort{
  private readonly entries=new Map<string,{value:unknown;expiresAt?:number}>();
  constructor(private readonly maxEntries=1000){if(!Number.isInteger(maxEntries)||maxEntries<1)throw new Error('INVALID_MEMORY_CACHE_LIMIT')}
  async get<T>(key:string):Promise<T|null>{const entry=this.entries.get(key);if(!entry)return null;if(entry.expiresAt&&entry.expiresAt<=Date.now()){this.entries.delete(key);return null}this.entries.delete(key);this.entries.set(key,entry);return entry.value as T}
  async set<T>(key:string,value:T,ttlSeconds?:number):Promise<void>{if(this.entries.has(key))this.entries.delete(key);this.entries.set(key,{value,expiresAt:ttlSeconds?Date.now()+ttlSeconds*1000:undefined});while(this.entries.size>this.maxEntries){const oldest=this.entries.keys().next().value as string|undefined;if(oldest===undefined)break;this.entries.delete(oldest)}}
  async delete(key:string):Promise<void>{this.entries.delete(key)}
  size():number{return this.entries.size}
  health=healthy;
}
export class NoCacheAdapter implements CachePort{async get<T>(_key:string):Promise<T|null>{return null}async set<T>(_key:string,_value:T,_ttlSeconds?:number):Promise<void>{}async delete(_key:string):Promise<void>{}health=healthy;}
export class SyncQueueAdapter implements JobQueuePort{constructor(private readonly handlers:Record<string,(payload:unknown)=>Promise<void>>={}){}async enqueue<T>(queue:string,payload:T):Promise<string>{const id=randomUUID();const handler=this.handlers[queue];if(!handler)throw new Error(`No synchronous handler for queue ${queue}`);await handler(payload);return id}health=healthy;}
export class InProcessOutboxEventBus implements EventBusPort{readonly events:DomainEvent[]=[];async publish(event:DomainEvent):Promise<void>{this.events.push(event)}health=healthy;}
export class MemoryObjectStorage implements ObjectStoragePort{private readonly objects=new Map<string,Uint8Array>();async put(key:string,body:Uint8Array):Promise<void>{this.objects.set(key,body.slice())}async get(key:string):Promise<Uint8Array>{const v=this.objects.get(key);if(!v)throw new Error('OBJECT_NOT_FOUND');return v.slice()}async delete(key:string):Promise<void>{this.objects.delete(key)}async signedUrl(key:string,expiresSeconds:number):Promise<string>{return`memory://${encodeURIComponent(key)}?expires=${expiresSeconds}`}health=healthy;}
export class EmptySearchAdapter implements SearchPort{async search<T>(_query:SearchQuery):Promise<SearchResult<T>>{return{hits:[],tookMs:0}}health=healthy;}
export class DisabledAIAdapter implements AIModelPort{
  async generate(_request:AIModelRequest):Promise<AIModelResponse>{throw Object.assign(new Error('AI capability is disabled'),{code:'AI_CAPABILITY_UNAVAILABLE'})}
  async health(){return{status:'DEGRADED' as const,message:'AI capability disabled by desired state',checkedAt:new Date().toISOString()}}
}
