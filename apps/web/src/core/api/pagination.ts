export interface CursorPage<T>{ items:T[]; nextCursor?:string; }
export function boundedLimit(value:number|undefined,max=100):number { return Math.max(1,Math.min(max,value ?? 25)); }
