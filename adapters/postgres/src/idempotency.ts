import type { Pool } from 'pg';import type { IdempotencyPort } from '../../../packages/capability-contracts/src/index.js';
export class PostgresIdempotencyAdapter implements IdempotencyPort{
  constructor(private readonly pool:Pool){}
  async get(key:string):Promise<Uint8Array|null>{const r=await this.pool.query('SELECT response_body FROM idempotency_keys WHERE key=$1 AND expires_at>now()',[key]);return r.rowCount?new Uint8Array(r.rows[0].response_body):null}
  async putIfAbsent(key:string,value:Uint8Array,ttlSeconds:number):Promise<boolean>{const r=await this.pool.query('INSERT INTO idempotency_keys(key,response_body,expires_at) VALUES($1,$2,now()+($3 * interval \'1 second\')) ON CONFLICT DO NOTHING RETURNING key',[key,Buffer.from(value),ttlSeconds]);return Boolean(r.rowCount)}
  async health(){try{await this.pool.query('SELECT 1');return {status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch{return {status:'UNHEALTHY' as const,checkedAt:new Date().toISOString(),message:'postgres unavailable'}}}
}
