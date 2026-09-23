const MUTATING=new Set(['POST','PUT','PATCH','DELETE']);
export function csrfTokenFromDocument():string|undefined{
  if(typeof document==='undefined')return undefined;
  const value=document.cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-csrf='))?.slice('__Host-csrf='.length);
  return value?decodeURIComponent(value):undefined;
}
export function csrfHeaders(method:string):Record<string,string>{
  if(!MUTATING.has(method.toUpperCase()))return{};
  const token=csrfTokenFromDocument();return token?{'x-csrf-token':token}:{};
}
export function assertSameOriginRequest(origin:string|undefined,host:string|undefined):void{
  if(!origin||!host)throw new Error('CSRF_ORIGIN_REQUIRED');
  const parsed=new URL(origin);if(parsed.host!==host)throw new Error('CSRF_ORIGIN_MISMATCH');
}
