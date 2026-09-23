import pg from 'pg';
const { Pool }=pg;
export function createPostgresPool(){
  const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error('DATABASE_URL is required');
  return new Pool({connectionString,max:Number(process.env.PG_POOL_MAX??20),idleTimeoutMillis:Number(process.env.PG_IDLE_TIMEOUT_MS??30000),connectionTimeoutMillis:Number(process.env.PG_CONNECT_TIMEOUT_MS??5000),ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:true}:undefined,application_name:process.env.SERVICE_NAME??'platform'});
}
