import type { IdempotencyPort } from '../../../packages/capability-contracts/src/index.js';
import { PostgresIdempotencyAdapter } from '../../../adapters/postgres/src/idempotency.js';
import { createPostgresPool } from '../../../adapters/postgres/src/pool.js';
import { RedisIdempotencyAdapter, createRedis } from '../../../adapters/redis/src/index.js';
import { ApiError } from './errors.js';

export interface IdempotentResponse { body:string; status:number; }
interface StoredResponse { body:string; status:number; }

const encoder=new TextEncoder();const decoder=new TextDecoder();
function encode(value:StoredResponse):Uint8Array{return encoder.encode(JSON.stringify(value))}
function decode(value:Uint8Array):StoredResponse{
  try{const parsed=JSON.parse(decoder.decode(value)) as Partial<StoredResponse>;if(typeof parsed.body!=='string'||typeof parsed.status!=='number')throw new Error();return{body:parsed.body,status:parsed.status}}
  catch{throw new ApiError(500,'IDEMPOTENCY_RECORD_CORRUPT','Stored idempotency response is invalid')}
}

export class MemoryIdempotencyPort implements IdempotencyPort{
  private readonly entries=new Map<string,{value:Uint8Array;expiresAt:number}>();
  async get(key:string):Promise<Uint8Array|null>{const entry=this.entries.get(key);if(!entry)return null;if(entry.expiresAt<=Date.now()){this.entries.delete(key);return null}return entry.value.slice()}
  async putIfAbsent(key:string,value:Uint8Array,ttlSeconds:number):Promise<boolean>{
    const current=this.entries.get(key);if(current&&current.expiresAt>Date.now())return false;if(current)this.entries.delete(key);
    this.entries.set(key,{value:value.slice(),expiresAt:Date.now()+Math.max(0,ttlSeconds)*1000});return true
  }
  async health(){return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}
}

export class ApiIdempotencyStore{
  constructor(private readonly port:IdempotencyPort){}
  async get(key:string):Promise<IdempotentResponse|undefined>{const value=await this.port.get(key);return value?decode(value):undefined}
  async putIfAbsent(key:string,status:number,body:unknown,ttlSeconds=86400):Promise<boolean>{return this.port.putIfAbsent(key,encode({status,body:JSON.stringify(body)}),ttlSeconds)}
  async commitOrRead(key:string,status:number,body:unknown,ttlSeconds=86400):Promise<IdempotentResponse>{
    if(await this.putIfAbsent(key,status,body,ttlSeconds))return{status,body:JSON.stringify(body)};
    const winner=await this.get(key);if(winner)return winner;
    throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Idempotency key was concurrently committed but its response is unavailable');
  }
  health(){return this.port.health()}
}

export function createApiIdempotencyStore():ApiIdempotencyStore{
  if(process.env.NODE_ENV==='production'){
    if(process.env.REDIS_URL)return new ApiIdempotencyStore(new RedisIdempotencyAdapter(createRedis()));
    if(process.env.DATABASE_URL)return new ApiIdempotencyStore(new PostgresIdempotencyAdapter(createPostgresPool()));
    throw new Error('Production API requires REDIS_URL or DATABASE_URL for durable idempotency');
  }
  return new ApiIdempotencyStore(new MemoryIdempotencyPort());
}
