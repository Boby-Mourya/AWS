import type { Pool } from 'pg';
import type { SearchPort, SearchQuery, SearchResult } from '../../../packages/capability-contracts/src/index.js';

interface Cursor { offset:number }
function decodeCursor(cursor?:string):Cursor{if(!cursor)return{offset:0};try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8')) as Cursor;return{offset:Number.isSafeInteger(parsed.offset)&&parsed.offset>=0?parsed.offset:0}}catch{throw new Error('INVALID_SEARCH_CURSOR')}}

export class PostgresSearchAdapter implements SearchPort {
  constructor(private readonly pool:Pool){}
  async search<T=unknown>(query:SearchQuery):Promise<SearchResult<T>>{
    if(!query.tenantId)throw new Error('TENANT_REQUIRED');
    const started=performance.now();const limit=Math.min(100,Math.max(1,query.limit??20));const {offset}=decodeCursor(query.cursor);
    const values:unknown[]=[query.tenantId,query.workspaceId??null,query.text,limit+1,offset];
    const result=await this.pool.query({text:`SELECT c.id,c.document_id,c.content,c.metadata,ts_rank_cd(to_tsvector('simple',c.content),plainto_tsquery('simple',$3)) AS rank
      FROM document_chunks c
      WHERE c.tenant_id=$1::uuid
        AND ($2::uuid IS NULL OR c.workspace_id=$2::uuid)
        AND ($3='' OR to_tsvector('simple',c.content) @@ plainto_tsquery('simple',$3))
      ORDER BY rank DESC,c.id ASC LIMIT $4 OFFSET $5`,values});
    const rows=result.rows.slice(0,limit);const hasMore=result.rows.length>limit;
    return{hits:rows.map((row:any)=>({id:String(row.id),score:Number(row.rank??0),source:{documentId:row.document_id,content:row.content,metadata:row.metadata} as T})),nextCursor:hasMore?Buffer.from(JSON.stringify({offset:offset+limit})).toString('base64url'):undefined,tookMs:Math.round(performance.now()-started)};
  }
  async health(){try{await this.pool.query('SELECT 1');return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'Postgres search unavailable',checkedAt:new Date().toISOString()}}}
}
