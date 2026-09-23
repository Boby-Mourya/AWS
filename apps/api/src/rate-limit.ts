import { ApiError } from './errors.js';

export class FixedWindowLimiter {
  private readonly windows=new Map<string,{count:number;resetAt:number}>();
  constructor(
    private readonly max:number,
    private readonly windowMs:number,
    private readonly code='RATE_LIMITED',
    private readonly message='Request rate limit exceeded'
  ){
    if(!Number.isFinite(max)||max<=0)throw new Error('INVALID_LIMIT_MAX');
    if(!Number.isFinite(windowMs)||windowMs<=0)throw new Error('INVALID_LIMIT_WINDOW');
  }
  check(key:string):void{
    const now=Date.now();const current=this.windows.get(key);
    if(!current||current.resetAt<=now){this.windows.set(key,{count:1,resetAt:now+this.windowMs});return;}
    if(current.count>=this.max)throw new ApiError(429,this.code,this.message);
    current.count++;
  }
  clear(key?:string):void{if(key)this.windows.delete(key);else this.windows.clear()}
}
