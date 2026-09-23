import { ApiError } from './errors.js';
export class FixedWindowLimiter {
  private windows=new Map<string,{count:number;resetAt:number}>();
  constructor(private readonly max:number,private readonly windowMs:number){}
  check(key:string):void{const now=Date.now();const current=this.windows.get(key);if(!current||current.resetAt<=now){this.windows.set(key,{count:1,resetAt:now+this.windowMs});return;}if(current.count>=this.max)throw new ApiError(429,'RATE_LIMITED','Request quota exceeded');current.count++;}
}
