import type { TenantContext } from './tenant-context.js';
export interface AuthorizationRequest{permission:string;resource?:{tenantId:string;workspaceId?:string;ownerUserId?:string};attributes?:Record<string,unknown>}
export function authorize(ctx:TenantContext,request:AuthorizationRequest):boolean{
  if(!ctx.permissions.includes(request.permission)&&!ctx.permissions.includes('*'))return false;
  if(request.resource?.tenantId!==undefined&&request.resource.tenantId!==ctx.tenantId)return false;
  if(ctx.workspaceId&&request.resource?.workspaceId&&request.resource.workspaceId!==ctx.workspaceId)return false;
  if(request.attributes?.ownerOnly===true&&request.resource?.ownerUserId!==ctx.userId)return false;
  return true;
}
export function requirePermission(ctx:TenantContext,request:AuthorizationRequest):void{if(!authorize(ctx,request))throw new Error('FORBIDDEN')}
