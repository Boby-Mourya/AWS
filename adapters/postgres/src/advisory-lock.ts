import type { Pool } from 'pg';import type { DistributedLockPort } from '../../../packages/capability-contracts/src/index.js';
export class PostgresAdvisoryLock implements DistributedLockPort{
  constructor(private readonly pool:Pool){}
  async withLock<T>(key:string,_ttlMs:number,fn:()=>Promise<T>):Promise<T>{const client=await this.pool.connect();try{const acquired=await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS acquired',[key]);if(!acquired.rows[0]?.acquired)throw new Error('LOCK_UNAVAILABLE');try{return await fn()}finally{await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[key])}}finally{client.release()}}
  async health(){try{await this.pool.query('SELECT 1');return {status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch{return {status:'UNHEALTHY' as const,checkedAt:new Date().toISOString()}}}
}
