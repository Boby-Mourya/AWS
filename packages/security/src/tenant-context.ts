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
export function tenantCredentialPrefix(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>):string{return `tenants/${encodeURIComponent(ctx.tenantId)}/workspaces/${encodeURIComponent(ctx.workspaceId??'_root')}/integrations/`}
export function tenantEventMetadata(ctx:TenantContext){return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,userId:ctx.userId}}
export function tenantQueueEnvelope<T>(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>,payload:T){return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,payload}}
export function tenantWebhookEnvelope<T>(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>,provider:string,payload:T){if(!provider)throw new Error('WEBHOOK_PROVIDER_REQUIRED');return{tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,provider,payload}}
export function assertTenantWebhook(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>,envelope:{tenantId:string;workspaceId?:string}):void{if(envelope.tenantId!==ctx.tenantId)throw new Error('CROSS_TENANT_WEBHOOK_DENIED');if(ctx.workspaceId&&envelope.workspaceId!==ctx.workspaceId)throw new Error('CROSS_WORKSPACE_WEBHOOK_DENIED')}
export function tenantVectorFilter(ctx:Pick<TenantContext,'tenantId'|'workspaceId'>):Record<string,string>{return {tenantId:ctx.tenantId,...(ctx.workspaceId?{workspaceId:ctx.workspaceId}:{})}}
export function tenantLogFields(ctx:Pick<TenantContext,'tenantId'|'workspaceId'|'userId'>):Record<string,string>{return {tenantId:ctx.tenantId,workspaceId:ctx.workspaceId??'',userId:ctx.userId}}
