import { randomUUID } from 'node:crypto';
export interface RequestContext { requestId:string; correlationId:string; traceId:string; tenantId?:string; workspaceId?:string; userId?:string; permissions:string[]; }
export function buildRequestContext(headers:Record<string,unknown>):RequestContext {
  const header=(name:string)=>{const v=headers[name]??headers[name.toLowerCase()];return typeof v==='string'?v:undefined};
  const requestId=header('x-request-id') ?? randomUUID();
  return {requestId,correlationId:header('x-correlation-id') ?? requestId,traceId:header('traceparent')?.slice(3,35) ?? randomUUID().replaceAll('-',''),tenantId:header('x-tenant-id'),workspaceId:header('x-workspace-id'),permissions:[]};
}
