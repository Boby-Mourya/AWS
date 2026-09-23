import { cookies } from 'next/headers';

export interface WebSession { userId:string; tenantId:string; workspaceId?:string; permissions:string[]; }
export async function readWebSession():Promise<WebSession|null>{
  const jar = await cookies();
  const encoded = jar.get('__Host-session-context')?.value;
  if (!encoded) return null;
  try { return JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')) as WebSession; } catch { return null; }
}
export function hasPermission(session:WebSession|null, permission:string):boolean { return Boolean(session?.permissions.includes(permission)); }
