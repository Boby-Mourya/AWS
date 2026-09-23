import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { TenantContext } from './tenant-context.js';

export interface OidcConfig{issuer:string;audience:string;jwksUri?:string;privilegedRoles?:string[]}
export class OidcTokenVerifier{
  private readonly jwks;
  private readonly privilegedRoles:Set<string>;
  constructor(private readonly config:OidcConfig){this.jwks=createRemoteJWKSet(new URL(config.jwksUri??`${config.issuer.replace(/\/$/,'')}/.well-known/jwks.json`));this.privilegedRoles=new Set(config.privilegedRoles??['platform-admin','sre','security-admin']);}
  async verify(token:string):Promise<TenantContext>{
    const {payload}=await jwtVerify(token,this.jwks,{issuer:this.config.issuer,audience:this.config.audience});
    return this.toTenantContext(payload);
  }
  private toTenantContext(payload:JWTPayload):TenantContext{
    const userId=String(payload.sub??'');const tenantId=String(payload.tenant_id??'');if(!userId||!tenantId)throw new Error('OIDC_TENANT_CLAIMS_REQUIRED');
    const roles=Array.isArray(payload.roles)?payload.roles.map(String):[];const permissions=Array.isArray(payload.permissions)?payload.permissions.map(String):[];const amr=Array.isArray(payload.amr)?payload.amr.map(String):[];const mfa=amr.some(v=>['mfa','otp','hwk'].includes(v));
    if(roles.some(r=>this.privilegedRoles.has(r))&&!mfa)throw new Error('MFA_REQUIRED_FOR_PRIVILEGED_ROLE');
    return {userId,tenantId,workspaceId:payload.workspace_id?String(payload.workspace_id):undefined,roles,permissions,sessionId:payload.sid?String(payload.sid):undefined,mfa};
  }
}

export function devTenantContext(token:string):TenantContext{
  if(!token.startsWith('dev.'))throw new Error('INVALID_DEV_TOKEN');
  const json=Buffer.from(token.slice(4),'base64url').toString('utf8');const value=JSON.parse(json) as TenantContext;
  if(!value.userId||!value.tenantId)throw new Error('INVALID_DEV_TOKEN');return value;
}
