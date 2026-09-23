export class ApiError extends Error {
  constructor(public readonly statusCode:number, public readonly code:string, message:string, public readonly details?:Record<string,unknown>){ super(message); this.name='ApiError'; }
}
export function errorEnvelope(code:string,message:string,requestId:string){ return { error:{code,message,requestId} }; }
