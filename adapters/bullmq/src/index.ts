import { createHash, randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import type { JobOptions, JobQueuePort } from '../../../packages/capability-contracts/src/index.js';

export interface BullMqQueueLike {
  add(name:string,data:unknown,options?:Record<string,unknown>):Promise<{id?:string|number|null}>;
  waitUntilReady():Promise<unknown>;
  close():Promise<void>;
}

export type BullMqQueueFactory=(queueName:string)=>BullMqQueueLike;

function stableJobId(idempotencyKey?:string):string{
  return idempotencyKey?`idem-${createHash('sha256').update(idempotencyKey).digest('hex')}`:randomUUID();
}

export class BullMqJobQueueAdapter implements JobQueuePort{
  private readonly queues=new Map<string,BullMqQueueLike>();
  constructor(private readonly factory:BullMqQueueFactory){}
  private queue(name:string):BullMqQueueLike{
    const existing=this.queues.get(name);if(existing)return existing;
    const created=this.factory(name);this.queues.set(name,created);return created;
  }
  async enqueue<T>(queue:string,payload:T,options:JobOptions={}):Promise<string>{
    if(!queue)throw new Error('QUEUE_NAME_REQUIRED');
    const jobId=stableJobId(options.idempotencyKey);
    const job=await this.queue(queue).add(queue,payload,{
      jobId,
      delay:Math.max(0,options.delayMs??0),
      attempts:Math.max(1,options.maxAttempts??5),
      backoff:{type:'exponential',delay:500},
      removeOnComplete:1000,
      removeOnFail:5000
    });
    return String(job.id??jobId);
  }
  async health(){
    try{await this.queue('__platform_health').waitUntilReady();return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}
    catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'BullMQ unavailable',checkedAt:new Date().toISOString()}}
  }
  async close():Promise<void>{await Promise.all([...this.queues.values()].map(queue=>queue.close()));this.queues.clear()}
}

function redisConnection(url:string):Record<string,unknown>{
  const parsed=new URL(url);
  if(!['redis:','rediss:'].includes(parsed.protocol))throw new Error('INVALID_REDIS_URL');
  const db=parsed.pathname&&parsed.pathname!=='/'?Number(parsed.pathname.slice(1)):0;
  if(!Number.isInteger(db)||db<0)throw new Error('INVALID_REDIS_DATABASE');
  return {
    host:parsed.hostname,
    port:Number(parsed.port||6379),
    username:parsed.username?decodeURIComponent(parsed.username):undefined,
    password:parsed.password?decodeURIComponent(parsed.password):undefined,
    db,
    ...(parsed.protocol==='rediss:'?{tls:{serverName:parsed.hostname}}:{})
  };
}

export function createBullMqJobQueue(redisUrl=process.env.REDIS_URL):BullMqJobQueueAdapter{
  if(!redisUrl)throw new Error('REDIS_URL is required for BullMQ');
  const connection=redisConnection(redisUrl);
  return new BullMqJobQueueAdapter(name=>new Queue(name,{connection:connection as never}) as unknown as BullMqQueueLike);
}
