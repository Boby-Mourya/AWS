export interface TenantContext {
  userId:string;
  tenantId:string;
  workspaceId?:string;
  roles:string[];
  permissions:string[];
  sessionId?:string;
  mfa:boolean;
}

export function assertTenantResource(ctx:TenantContext,resource:{tenantId:string;workspaceId?:string}):void{
  if(resource.tenantId!==ctx.tenantId)throw new Error('CROSS_TENANT_ACCESS_DENIED');
  if(ctx.workspaceId && resource.workspaceId && resource.workspaceId!==ctx.workspaceId)throw new Error('CROSS_WORKSPACE_ACCESS_DENIED');
}
export function tenantKey(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>,...parts:string[]):string{return ['tenant',ctx.tenantId,'workspace',ctx.workspaceId??'_root',...parts].join(':')}
export function storagePrefix(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>):string{return `tenants/${encodeURIComponent(ctx.tenantId)}/workspaces/${encodeURIComponent(ctx.workspaceId??'_root')}/`}
export function tenantEventMetadata(ctx:TenantContext){return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,userId:ctx.userId}}
export function tenantQueueEnvelope<T>(ctx:TenantContext,payload:T){return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,payload}}
export function tenantVectorFilter(ctx:TenantContext):Record<string,string>{return {tenantId:ctx.tenantId,...(ctx.workspaceId?{workspaceId:ctx.workspaceId}:{})}}
export function tenantLogFields(ctx:TenantContext):Record<string,string>{return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId??'',userId:ctx.userId}}
