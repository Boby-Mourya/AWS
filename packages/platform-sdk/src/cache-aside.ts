import type { CachePort } from '@platform/capability-contracts';
export interface CacheTelemetry{record(event:'hit'|'miss'|'bypass'|'error',key:string):void|Promise<void>}
export class CacheCircuitBreaker{private failures=0;private openUntil=0;constructor(private readonly threshold=3,private readonly resetMs=10000){}canTry(){return Date.now()>=this.openUntil}success(){this.failures=0;this.openUntil=0}failure(){this.failures++;if(this.failures>=this.threshold)this.openUntil=Date.now()+this.resetMs}}
const inFlight=new Map<string,Promise<unknown>>();
export async function cacheAside<T>(cache:CachePort,key:string,ttlSeconds:number,load:()=>Promise<T>,breaker=new CacheCircuitBreaker(),telemetry?:CacheTelemetry):Promise<T>{
  if(breaker.canTry()){
    try{const cached=await cache.get<T>(key);breaker.success();if(cached!==null){await telemetry?.record('hit',key);return cached}await telemetry?.record('miss',key)}catch{breaker.failure();await telemetry?.record('error',key)}
  }else await telemetry?.record('bypass',key);
  const existing=inFlight.get(key) as Promise<T>|undefined;if(existing)return existing;
  const pending=(async()=>{const value=await load();if(breaker.canTry())try{await cache.set(key,value,ttlSeconds);breaker.success()}catch{breaker.failure();await telemetry?.record('error',key)}return value})();
  inFlight.set(key,pending);try{return await pending}finally{if(inFlight.get(key)===pending)inFlight.delete(key)}
}
