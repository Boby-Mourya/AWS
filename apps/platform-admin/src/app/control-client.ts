import { headers } from 'next/headers';

export interface ControlResponse { ok:boolean; status:number; data:unknown; requestId?:string; }
const base=(process.env.PLATFORM_CONTROL_API_URL??'http://127.0.0.1:4100').replace(/\/$/,'');

export async function readControlResource(path:string):Promise<ControlResponse>{
  const incoming=await headers();const authorization=incoming.get('authorization');
  if(!authorization)return{ok:false,status:401,data:{error:{code:'AUTHENTICATION_REQUIRED',message:'Platform operator authentication is required.'}}};
  try{
    const response=await fetch(`${base}${path}`,{headers:{authorization,'x-correlation-id':incoming.get('x-correlation-id')??crypto.randomUUID()},cache:'no-store',signal:AbortSignal.timeout(8000)});
    const requestId=response.headers.get('x-request-id')??undefined;const data=await response.json().catch(()=>({}));return{ok:response.ok,status:response.status,data,requestId};
  }catch(error){return{ok:false,status:503,data:{error:{code:'CONTROL_API_UNAVAILABLE',message:error instanceof Error?error.message:'Control API unavailable'}}}}
}

export function controlPath(section:string):string{
  if(section==='overview')return'/v1/control/overview';if(section==='changes')return'/v1/control/changes';if(section==='audit')return'/v1/control/audit';if(section==='secrets')return'/v1/control/secrets';return`/v1/control/pages/${encodeURIComponent(section)}`;
}
