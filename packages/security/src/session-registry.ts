import { createHash } from 'node:crypto';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
interface SessionState{revokedAt?:number;refreshFamily:string;currentRefreshHash:string;deviceId?:string}
export class SessionRegistry{
  private readonly sessions=new Map<string,SessionState>();
  create(sessionId:string,refreshFamily:string,refreshToken:string,deviceId?:string){this.sessions.set(sessionId,{refreshFamily,currentRefreshHash:hash(refreshToken),deviceId})}
  revoke(sessionId:string){const s=this.sessions.get(sessionId);if(s)s.revokedAt=Date.now()}
  isRevoked(sessionId:string):boolean{return Boolean(this.sessions.get(sessionId)?.revokedAt)}
  rotate(sessionId:string,presentedRefreshToken:string,newRefreshToken:string):void{const s=this.sessions.get(sessionId);if(!s||s.revokedAt)throw new Error('SESSION_REVOKED');if(s.currentRefreshHash!==hash(presentedRefreshToken)){s.revokedAt=Date.now();throw new Error('REFRESH_TOKEN_REUSE_DETECTED')}s.currentRefreshHash=hash(newRefreshToken)}
  listDevices():Array<{sessionId:string;deviceId?:string;revoked:boolean}>{return [...this.sessions].map(([sessionId,s])=>({sessionId,deviceId:s.deviceId,revoked:Boolean(s.revokedAt)}))}
}
