import { ApiError } from './errors.js';
interface Entry { body:string; status:number; expiresAt:number; }
export class IdempotencyStore {
  private readonly entries=new Map<string,Entry>();
  get(key:string):Entry|undefined{const v=this.entries.get(key);if(v&&v.expiresAt>Date.now())return v;if(v)this.entries.delete(key);return undefined;}
  put(key:string,status:number,body:unknown,ttlSeconds=86400):void{if(this.entries.has(key))throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Idempotency key has already been committed');this.entries.set(key,{status,body:JSON.stringify(body),expiresAt:Date.now()+ttlSeconds*1000});}
}
