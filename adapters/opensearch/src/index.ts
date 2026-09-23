import type { Client } from '@opensearch-project/opensearch';
import type { SearchPort, SearchQuery, SearchResult } from '../../../packages/capability-contracts/src/index.js';

export class OpenSearchAdapter implements SearchPort {
  constructor(private readonly client:Client,private readonly index:string){}
  async search<T=unknown>(query:SearchQuery):Promise<SearchResult<T>>{
    if(!query.tenantId)throw new Error('TENANT_REQUIRED');
    const started=performance.now();
    const filters:any[]=[{term:{tenantId:query.tenantId}}];
    if(query.workspaceId)filters.push({term:{workspaceId:query.workspaceId}});
    for(const [field,value] of Object.entries(query.filters??{}))filters.push({term:{[`metadata.${field}.keyword`]:value}});
    const response=await this.client.search({index:this.index,body:{size:Math.min(100,Math.max(1,query.limit??20)),query:{bool:{must:query.text?[{multi_match:{query:query.text,fields:['content^2','title','filename']}}]:[{match_all:{}}],filter:filters}},search_after:query.cursor?JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')):undefined,sort:[{_score:'desc'},{_id:'asc'}]}} as any);
    const body:any=(response as any).body??response;
    const hits=(body.hits?.hits??[]).map((hit:any)=>({id:String(hit._id),score:Number(hit._score??0),source:hit._source as T}));
    const last=body.hits?.hits?.at?.(-1);
    return{hits,nextCursor:last?.sort?Buffer.from(JSON.stringify(last.sort)).toString('base64url'):undefined,tookMs:Number(body.took??Math.round(performance.now()-started))};
  }
  async health(){try{await this.client.cluster.health({});return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'OpenSearch health check failed',checkedAt:new Date().toISOString()}}}
}
