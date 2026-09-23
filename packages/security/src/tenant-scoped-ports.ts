import type { CachePort, DistributedLockPort, IdempotencyPort, SearchPort, SearchQuery, SearchResult } from '@platform/capability-contracts';
import type { TenantContext } from './tenant-context.js';
import { tenantKey } from './tenant-context.js';

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
