import { createConnection } from 'node:net';
import type { MalwareScanner } from './upload-security.js';

/** ClamAV INSTREAM client. Run clamd in an isolated security service; never expose it publicly. */
export class ClamAvScanner implements MalwareScanner {
  constructor(private readonly host=process.env.CLAMAV_HOST??'127.0.0.1',private readonly port=Number(process.env.CLAMAV_PORT??3310),private readonly timeoutMs=15_000){}
  async scan(bytes:Uint8Array):Promise<{clean:boolean;signature?:string}>{
    return new Promise((resolve,reject)=>{const socket=createConnection({host:this.host,port:this.port});let response='';const timer=setTimeout(()=>{socket.destroy();reject(new Error('MALWARE_SCAN_TIMEOUT'))},this.timeoutMs);socket.on('connect',()=>{socket.write('zINSTREAM\0');for(let offset=0;offset<bytes.length;offset+=64*1024){const chunk=bytes.subarray(offset,Math.min(bytes.length,offset+64*1024));const size=Buffer.allocUnsafe(4);size.writeUInt32BE(chunk.length);socket.write(size);socket.write(chunk)}socket.write(Buffer.alloc(4))});socket.on('data',chunk=>{response+=chunk.toString('utf8')});socket.on('error',error=>{clearTimeout(timer);reject(error)});socket.on('end',()=>{clearTimeout(timer);if(response.includes(' OK'))resolve({clean:true});else if(response.includes(' FOUND'))resolve({clean:false,signature:response.split(':').slice(1).join(':').replace('FOUND','').trim()});else reject(new Error(`MALWARE_SCAN_ERROR:${response.trim()}`))})});
  }
}
