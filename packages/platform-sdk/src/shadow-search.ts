import type { SearchPort, SearchQuery, SearchResult } from '@platform/capability-contracts';

export interface ShadowSearchObservation { primaryMs:number; fallbackMs:number; overlap:number; primaryCount:number; fallbackCount:number; }
export class ShadowSearchAdapter implements SearchPort {
  constructor(private readonly active:SearchPort,private readonly shadow:SearchPort,private readonly observe:(observation:ShadowSearchObservation)=>void=()=>{}){}
  async search<T=unknown>(query:SearchQuery):Promise<SearchResult<T>>{
    const [active,shadow]=await Promise.all([this.active.search<T>(query),this.shadow.search<T>(query).catch(()=>null)]);
    if(shadow){const primaryIds=new Set(active.hits.map(hit=>hit.id));const overlap=shadow.hits.length?shadow.hits.filter(hit=>primaryIds.has(hit.id)).length/Math.max(1,Math.min(active.hits.length,shadow.hits.length)):active.hits.length?0:1;this.observe({primaryMs:active.tookMs,fallbackMs:shadow.tookMs,overlap,primaryCount:active.hits.length,fallbackCount:shadow.hits.length})}
    return active;
  }
  health(){return this.active.health()}
}
