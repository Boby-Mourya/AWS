import { csrfHeaders } from '../auth/csrf.js';
import { readPublicWebConfig } from '../config/index.js';

export interface ApiErrorEnvelope { error:{ code:string; message:string; requestId:string } }
export class ApiError extends Error { constructor(public readonly status:number,public readonly code:string,message:string,public readonly requestId?:string){super(message);this.name='ApiError'} }
export interface RequestOptions<T>{method?:'GET'|'POST'|'PUT'|'PATCH'|'DELETE';body?:unknown;signal?:AbortSignal;timeoutMs?:number;retries?:number;validate?:(value:unknown)=>T;idempotencyKey?:string;}
const safeRetry=new Set(['GET','PUT','DELETE']);

export class ApiClient{
  constructor(private readonly baseUrl:string){}
  async request<T>(path:string,options:RequestOptions<T>={}):Promise<T>{
    const method=options.method??'GET';const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(new Error('request timeout')),options.timeoutMs??10000);const externalAbort=()=>controller.abort(options.signal?.reason);options.signal?.addEventListener('abort',externalAbort,{once:true});
    try{
      const attempts=Math.max(1,1+(options.retries??0));let last:unknown;
      for(let attempt=1;attempt<=attempts;attempt++){
        try{
          const response=await fetch(`${this.baseUrl}${path}`,{method,credentials:'include',headers:{'content-type':'application/json',...csrfHeaders(method),...(options.idempotencyKey?{'idempotency-key':options.idempotencyKey}:{})},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal});
          const value:unknown=response.status===204?null:await response.json();
          if(!response.ok){const envelope=value as Partial<ApiErrorEnvelope>;throw new ApiError(response.status,envelope.error?.code??'HTTP_ERROR',envelope.error?.message??'Request failed',envelope.error?.requestId)}
          return options.validate?options.validate(value):value as T;
        }catch(error){last=error;if(attempt===attempts||(!safeRetry.has(method)&&!options.idempotencyKey))throw error;await new Promise(r=>setTimeout(r,Math.min(1000,100*2**(attempt-1))+Math.floor(Math.random()*75)))}
      }
      throw last;
    }finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',externalAbort)}
  }
}
const publicConfig=readPublicWebConfig();
export const api=new ApiClient(publicConfig.apiBaseUrl);
