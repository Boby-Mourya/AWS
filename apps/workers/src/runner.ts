import type { IdempotencyPort } from '../../../packages/capability-contracts/src/index.js';
import type { JobEnvelope, JobResult } from './contract.js';
export interface JobHandler<T=unknown>{(job:JobEnvelope<T>,signal:AbortSignal):Promise<void>}
export interface WorkerHooks<T=unknown>{idempotency?:IdempotencyPort;idempotencyTtlSeconds?:number;onRetry?:(job:JobEnvelope<T>,delayMs:number)=>Promise<void>;onDeadLetter?:(job:JobEnvelope<T>,error:unknown)=>Promise<void>;}
export class WorkerRunner<T=unknown>{
  private stopping=false;private active=0;
  constructor(private readonly handler:JobHandler<T>,private readonly timeoutMs=30000,private readonly concurrency=10,private readonly hooks:WorkerHooks<T>={}){}
  requestStop(){this.stopping=true}
  canAccept(){return !this.stopping&&this.active<this.concurrency}
  async run(job:JobEnvelope<T>):Promise<JobResult>{
    if(!this.canAccept())throw new Error('WORKER_NOT_ACCEPTING');this.active++;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('job timeout')),this.timeoutMs);
    const idemKey=`job:${job.tenant_id}:${job.idempotency_key}`;
    try{
      if(this.hooks.idempotency&&await this.hooks.idempotency.get(idemKey))return{state:'COMPLETED',attempt:job.attempt};
      await this.handler(job,controller.signal);
      if(this.hooks.idempotency)await this.hooks.idempotency.putIfAbsent(idemKey,new TextEncoder().encode(job.job_id),this.hooks.idempotencyTtlSeconds??86400);
      return{state:'COMPLETED',attempt:job.attempt};
    }catch(error){
      const attempt=job.attempt+1;const terminal=attempt>=job.max_attempts;
      if(terminal)await this.hooks.onDeadLetter?.({...job,attempt},error);else await this.hooks.onRetry?.({...job,attempt},retryDelayMs(attempt));
      return{state:terminal?'DEAD_LETTERED':'RETRYING',attempt,errorCode:error instanceof Error?error.name:'UNKNOWN'};
    }finally{clearTimeout(timer);this.active--}
  }
  async gracefulShutdown(maxWaitMs=30000){this.stopping=true;const start=Date.now();while(this.active&&Date.now()-start<maxWaitMs)await new Promise(r=>setTimeout(r,50));if(this.active)throw new Error('WORKER_SHUTDOWN_TIMEOUT')}
}
export function retryDelayMs(attempt:number,baseMs=500,capMs=60000){const exp=Math.min(capMs,baseMs*2**Math.max(0,attempt-1));return exp+Math.floor(Math.random()*Math.max(1,Math.floor(exp*.2)))}
