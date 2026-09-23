import type {
  AIModelPort,
  AIModelRequest,
  AIModelResponse,
  CachePort,
  DistributedLockPort,
  EventBusPort,
  IdempotencyPort,
  JobOptions,
  JobQueuePort,
  ObjectStoragePort,
  SearchPort,
  SearchQuery,
  SearchResult,
  SecretProvider
} from '@platform/capability-contracts';
import type { DomainEvent } from '@platform/domain';
import type { TenantContext } from './tenant-context.js';
import { storagePrefix, tenantCredentialPrefix, tenantKey, tenantQueueEnvelope } from './tenant-context.js';

function relativeStorageKey(key:string):string{
  const normalized=key.replace(/^\/+/, '');
  if(!normalized||normalized.split('/').some(part=>part==='..'))throw new Error('INVALID_TENANT_STORAGE_KEY');
  return normalized;
}
function relativeCredentialName(name:string):string{
  const normalized=name.replace(/^\/+/, '');
  if(!normalized||normalized.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('INVALID_TENANT_CREDENTIAL_NAME');
  return normalized;
}

export class TenantScopedCache implements CachePort{
  constructor(private readonly delegate:CachePort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  get<T>(key:string){return this.delegate.get<T>(tenantKey(this.ctx,'cache',key))}
  set<T>(key:string,value:T,ttlSeconds?:number){return this.delegate.set(tenantKey(this.ctx,'cache',key),value,ttlSeconds)}
  delete(key:string){return this.delegate.delete(tenantKey(this.ctx,'cache',key))}
  health(){return this.delegate.health()}
}

export class TenantScopedIdempotency implements IdempotencyPort{
  constructor(private readonly delegate:IdempotencyPort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  get(key:string){return this.delegate.get(tenantKey(this.ctx,'idempotency',key))}
  putIfAbsent(key:string,value:Uint8Array,ttlSeconds:number){return this.delegate.putIfAbsent(tenantKey(this.ctx,'idempotency',key),value,ttlSeconds)}
  health(){return this.delegate.health()}
}

export class TenantScopedLock implements DistributedLockPort{
  constructor(private readonly delegate:DistributedLockPort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  withLock<T>(key:string,ttlMs:number,fn:()=>Promise<T>){return this.delegate.withLock(tenantKey(this.ctx,'lock',key),ttlMs,fn)}
  health(){return this.delegate.health()}
}

export class TenantScopedSearch implements SearchPort{
  constructor(private readonly delegate:SearchPort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  search<T=unknown>(query:Omit<SearchQuery,'tenantId'|'workspaceId'> & Partial<Pick<SearchQuery,'tenantId'|'workspaceId'>>):Promise<SearchResult<T>>{
    if(query.tenantId&&query.tenantId!==this.ctx.tenantId)throw new Error('CROSS_TENANT_SEARCH_DENIED');
    if(query.workspaceId&&this.ctx.workspaceId&&query.workspaceId!==this.ctx.workspaceId)throw new Error('CROSS_WORKSPACE_SEARCH_DENIED');
    return this.delegate.search<T>({...query,tenantId:this.ctx.tenantId,workspaceId:this.ctx.workspaceId} as SearchQuery);
  }
  health(){return this.delegate.health()}
}

export class TenantScopedObjectStorage implements ObjectStoragePort{
  private readonly prefix:string;
  constructor(private readonly delegate:ObjectStoragePort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){this.prefix=storagePrefix(ctx)}
  private key(key:string){return `${this.prefix}${relativeStorageKey(key)}`}
  put(key:string,body:Uint8Array,metadata:Record<string,string>={}){return this.delegate.put(this.key(key),body,{...metadata,tenantId:this.ctx.tenantId,workspaceId:this.ctx.workspaceId??''})}
  get(key:string){return this.delegate.get(this.key(key))}
  delete(key:string){return this.delegate.delete(this.key(key))}
  signedUrl(key:string,expiresSeconds:number){return this.delegate.signedUrl(this.key(key),expiresSeconds)}
  health(){return this.delegate.health()}
}

export class TenantScopedJobQueue implements JobQueuePort{
  constructor(private readonly delegate:JobQueuePort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  enqueue<T>(queue:string,payload:T,options:JobOptions={}){
    const scopedOptions={...options,idempotencyKey:options.idempotencyKey?tenantKey(this.ctx,'job-idempotency',options.idempotencyKey):undefined};
    return this.delegate.enqueue(queue,tenantQueueEnvelope(this.ctx,payload),scopedOptions);
  }
  health(){return this.delegate.health()}
}

export class TenantScopedEventBus implements EventBusPort{
  constructor(private readonly delegate:EventBusPort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  publish(event:DomainEvent){
    if(event.tenantId!==this.ctx.tenantId)throw new Error('CROSS_TENANT_EVENT_DENIED');
    if(this.ctx.workspaceId&&event.workspaceId!==this.ctx.workspaceId)throw new Error('CROSS_WORKSPACE_EVENT_DENIED');
    return this.delegate.publish(event);
  }
  health(){return this.delegate.health()}
}

export class TenantScopedAI implements AIModelPort{
  constructor(private readonly delegate:AIModelPort,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){}
  generate(request:AIModelRequest):Promise<AIModelResponse>{
    if(request.tenantId&&request.tenantId!==this.ctx.tenantId)throw new Error('CROSS_TENANT_AI_DENIED');
    if(request.workspaceId&&this.ctx.workspaceId&&request.workspaceId!==this.ctx.workspaceId)throw new Error('CROSS_WORKSPACE_AI_DENIED');
    return this.delegate.generate({...request,tenantId:this.ctx.tenantId,workspaceId:this.ctx.workspaceId});
  }
  health(){return this.delegate.health()}
}

export class TenantScopedSecretProvider implements SecretProvider{
  private readonly prefix:string;
  constructor(private readonly delegate:SecretProvider,private readonly ctx:Pick<TenantContext,'tenantId'|'workspaceId'>){this.prefix=tenantCredentialPrefix(ctx)}
  get(name:string){return this.delegate.get(`${this.prefix}${relativeCredentialName(name)}`)}
  health(){return this.delegate.health()}
}
