import { createPostgresPool, migrate } from '../adapters/postgres/src/index.js';const pool=createPostgresPool();try{await migrate(pool);console.log('migrations complete')}finally{await pool.end()}
