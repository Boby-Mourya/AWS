import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export interface WebSession { userId:string; tenantId:string; workspaceId?:string; permissions:string[]; features?:Record<string,boolean>; }

function sessionSecret():string|undefined{
  const secret=process.env.WEB_SESSION_HMAC_SECRET;
  if(process.env.NODE_ENV==='production'&&(!secret||secret.length<32))throw new Error('WEB_SESSION_HMAC_SECRET must be at least 32 characters in production');
  return secret;
}
function validFeatureMap(value:unknown):boolean{return value===undefined||(Boolean(value)&&typeof value==='object'&&Object.values(value as Record<string,unknown>).every(enabled=>typeof enabled==='boolean'))}
function validSession(value:unknown):value is WebSession{
  if(!value||typeof value!=='object')return false;const session=value as Partial<WebSession>;
  return typeof session.userId==='string'&&session.userId.length>0&&typeof session.tenantId==='string'&&session.tenantId.length>0&&(session.workspaceId===undefined||typeof session.workspaceId==='string')&&Array.isArray(session.permissions)&&session.permissions.every(permission=>typeof permission==='string')&&validFeatureMap(session.features);
}
function signature(payload:string,secret:string):string{return createHmac('sha256',secret).update(payload).digest('base64url')}
function decodePayload(payload:string):WebSession|null{
  try{const value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as unknown;return validSession(value)?value:null}catch{return null}
}

export function encodeWebSessionCookie(session:WebSession,secret=sessionSecret()):string{
  if(!validSession(session))throw new Error('INVALID_WEB_SESSION');
  const payload=Buffer.from(JSON.stringify(session),'utf8').toString('base64url');
  if(!secret){if(process.env.NODE_ENV==='production')throw new Error('SIGNED_WEB_SESSION_REQUIRED');return payload}
  return `${payload}.${signature(payload,secret)}`;
}

export async function readWebSession():Promise<WebSession|null>{
  const jar=await cookies();const encoded=jar.get('__Host-session-context')?.value;if(!encoded)return null;
  const secret=sessionSecret();const separator=encoded.lastIndexOf('.');
  if(separator>0){
    if(!secret)return null;const payload=encoded.slice(0,separator),presented=encoded.slice(separator+1),expected=signature(payload,secret);
    const a=Buffer.from(presented),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return null;return decodePayload(payload);
  }
  if(process.env.NODE_ENV==='production'||secret)return null;
  return decodePayload(encoded);
}
export function hasPermission(session:WebSession|null,permission:string):boolean{return Boolean(session?.permissions.includes(permission))}
export function hasFeature(session:WebSession|null,feature:string):boolean{return session?.features?.[feature]===true}
export async function authorizeWebRoute(permission?:string,feature?:string):Promise<WebSession|null>{const session=await readWebSession();if(!session)return null;if(permission&&!hasPermission(session,permission))return null;if(feature&&!hasFeature(session,feature))return null;return session}
