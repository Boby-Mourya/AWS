export interface WebTelemetryEvent { name:string; at:string; requestId?:string; route?:string; attributes?:Record<string,string|number|boolean>; }
export interface WebTelemetrySink { record(event:WebTelemetryEvent):void|Promise<void>; }

const forbidden=/token|secret|password|authorization|cookie|credential/i;
export function sanitizeTelemetryAttributes(attributes:Record<string,unknown>={}):Record<string,string|number|boolean>{
  const out:Record<string,string|number|boolean>={};
  for(const [key,value] of Object.entries(attributes)){
    if(forbidden.test(key))continue;
    if(['string','number','boolean'].includes(typeof value))out[key]=value as string|number|boolean;
  }
  return out;
}

export class BrowserTelemetry {
  constructor(private readonly sink?:WebTelemetrySink){}
  async record(name:string,attributes:Record<string,unknown>={},requestId?:string):Promise<void>{
    await this.sink?.record({name,at:new Date().toISOString(),requestId,route:typeof location==='undefined'?undefined:location.pathname,attributes:sanitizeTelemetryAttributes(attributes)});
  }
}
