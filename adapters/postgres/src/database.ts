import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { TenantContext } from '../../../packages/security/src/tenant-context.js';

export class PostgresDatabase {
  constructor(private readonly pool:Pool,private readonly statementTimeoutMs=Number(process.env.PG_STATEMENT_TIMEOUT_MS??5000),private readonly slowMs=Number(process.env.PG_SLOW_QUERY_MS??750)){}
  async query<T extends QueryResultRow>(sql:string,values:unknown[]=[]):Promise<T[]>{const start=performance.now();const result=await this.pool.query<T>({text:sql,values,statement_timeout:this.statementTimeoutMs});const elapsed=performance.now()-start;if(elapsed>=this.slowMs)console.warn(JSON.stringify({event:'slow_query',elapsedMs:Math.round(elapsed),rowCount:result.rowCount,queryName:'unnamed'}));return result.rows;}
  async transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{const client=await this.pool.connect();try{await client.query('BEGIN');await client.query(`SET LOCAL statement_timeout = '${this.statementTimeoutMs}ms'`);const value=await fn(client);await client.query('COMMIT');return value}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}}
  async tenantTransaction<T>(ctx:TenantContext,fn:(client:PoolClient)=>Promise<T>):Promise<T>{return this.transaction(async client=>{await client.query("SELECT set_config('app.tenant_id',$1,true), set_config('app.workspace_id',$2,true)",[ctx.tenantId,ctx.workspaceId??'']);return fn(client);});}
}
