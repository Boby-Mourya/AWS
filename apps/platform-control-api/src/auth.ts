import { OidcTokenVerifier, devTenantContext, type TenantContext } from '../../../packages/security/src/index.js';

const privilegedRoles=new Set(['platform-admin','sre','security-admin']);
const production=process.env.NODE_ENV==='production';
const verifier=process.env.OIDC_ISSUER&&process.env.OIDC_AUDIENCE?new OidcTokenVerifier({issuer:process.env.OIDC_ISSUER,audience:process.env.OIDC_AUDIENCE,jwksUri:process.env.OIDC_JWKS_URI}):null;
if(production&&!verifier)throw new Error('OIDC_ISSUER and OIDC_AUDIENCE are required for the Platform Control Center in production');

export async function authenticateControlOperator(authorization:string|undefined):Promise<TenantContext>{
  if(!authorization?.startsWith('Bearer '))throw Object.assign(new Error('Bearer token is required'),{statusCode:401,code:'AUTHENTICATION_REQUIRED'});
  try{
    const token=authorization.slice(7);const ctx=verifier?await verifier.verify(token):devTenantContext(token);
    if(!ctx.roles.some(role=>privilegedRoles.has(role)))throw Object.assign(new Error('Privileged platform role is required'),{statusCode:403,code:'PLATFORM_ROLE_REQUIRED'});
    if(!ctx.mfa)throw Object.assign(new Error('Multi-factor authentication is required for privileged platform roles'),{statusCode:403,code:'MFA_REQUIRED_FOR_PRIVILEGED_ROLE'});
    return ctx;
  }catch(error){
    if((error as {statusCode?:number}).statusCode)throw error;
    throw Object.assign(new Error('Authentication token is invalid or does not satisfy control-plane policy'),{statusCode:401,code:'INVALID_TOKEN'});
  }
}

export function requireControlWrite(ctx:TenantContext):void{
  if(!ctx.permissions.includes('platform:write')&&!ctx.permissions.includes('*'))throw Object.assign(new Error('Platform write permission is required'),{statusCode:403,code:'PLATFORM_WRITE_PERMISSION_REQUIRED'});
}
