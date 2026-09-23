import { createHash, randomUUID } from 'node:crypto';
import type { JobQueuePort, ObjectStoragePort } from '../../../packages/capability-contracts/src/index.js';

export interface PresignedUploadPort { signedUploadUrl(key:string,expiresSeconds:number,contentType:string,metadata?:Record<string,string>):Promise<string>; }
export interface MalwareScanner { scan(bytes:Uint8Array):Promise<{clean:boolean;signature?:string}>; }
export interface UploadPolicy { maxBytes:number; allowedExtensions:ReadonlySet<string>; allowedMimeTypes:ReadonlySet<string>; maxArchiveExpansionRatio:number; }
export interface UploadDescriptor { tenantId:string; workspaceId?:string; filename:string; mimeType:string; sizeBytes:number; archiveUncompressedBytes?:number; }
export interface AuthorizedUpload { uploadId:string; quarantineKey:string; uploadUrl:string; expiresSeconds:number; }

const magic:Record<string,number[][]>={
  'application/pdf':[[0x25,0x50,0x44,0x46]],
  'image/png':[[0x89,0x50,0x4e,0x47]],
  'image/jpeg':[[0xff,0xd8,0xff]],
  'application/zip':[[0x50,0x4b,0x03,0x04],[0x50,0x4b,0x05,0x06],[0x50,0x4b,0x07,0x08]]
};
function ext(name:string){const i=name.lastIndexOf('.');return i<0?'':name.slice(i).toLowerCase()}
function safeSegment(value:string){if(!/^[A-Za-z0-9._-]+$/.test(value))throw new Error('INVALID_STORAGE_SEGMENT');return value}
function matchesMagic(bytes:Uint8Array,mime:string){const signatures=magic[mime];if(!signatures)return true;return signatures.some(signature=>signature.every((byte,index)=>bytes[index]===byte))}

export class UploadSecurityPipeline {
  constructor(private readonly storage:ObjectStoragePort & Partial<PresignedUploadPort>,private readonly scanner:MalwareScanner,private readonly queue:JobQueuePort,private readonly policy:UploadPolicy,private readonly authorize:(tenantId:string,workspaceId:string|undefined)=>Promise<boolean>,private readonly contentPolicy?:(bytes:Uint8Array,descriptor:UploadDescriptor)=>Promise<void>){}
  validateDescriptor(d:UploadDescriptor){if(!d.tenantId)throw new Error('TENANT_REQUIRED');if(d.sizeBytes<=0||d.sizeBytes>this.policy.maxBytes)throw new Error('UPLOAD_SIZE_REJECTED');if(!this.policy.allowedExtensions.has(ext(d.filename)))throw new Error('UPLOAD_EXTENSION_REJECTED');if(!this.policy.allowedMimeTypes.has(d.mimeType))throw new Error('UPLOAD_MIME_REJECTED');if(d.archiveUncompressedBytes&&d.archiveUncompressedBytes/Math.max(1,d.sizeBytes)>this.policy.maxArchiveExpansionRatio)throw new Error('ARCHIVE_BOMB_REJECTED')}
  async authorizeUpload(d:UploadDescriptor):Promise<AuthorizedUpload>{this.validateDescriptor(d);if(!await this.authorize(d.tenantId,d.workspaceId))throw new Error('UPLOAD_ACCESS_DENIED');if(!this.storage.signedUploadUrl)throw new Error('PRESIGNED_UPLOAD_UNAVAILABLE');const uploadId=randomUUID();const prefix=`quarantine/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}`;const quarantineKey=`${prefix}${uploadId}`;const expiresSeconds=300;const uploadUrl=await this.storage.signedUploadUrl(quarantineKey,expiresSeconds,d.mimeType,{tenantId:d.tenantId,workspaceId:d.workspaceId??'',uploadId,originalFilename:d.filename});return{uploadId,quarantineKey,uploadUrl,expiresSeconds}}
  async inspectAndApprove(d:UploadDescriptor,uploadId:string):Promise<{approvedKey:string;sha256:string}>{this.validateDescriptor(d);if(!await this.authorize(d.tenantId,d.workspaceId))throw new Error('UPLOAD_ACCESS_DENIED');const quarantineKey=`quarantine/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}${safeSegment(uploadId)}`;const bytes=await this.storage.get(quarantineKey);if(bytes.byteLength!==d.sizeBytes)throw new Error('UPLOAD_SIZE_MISMATCH');if(!matchesMagic(bytes,d.mimeType))throw new Error('UPLOAD_MAGIC_BYTES_REJECTED');const malware=await this.scanner.scan(bytes);if(!malware.clean)throw new Error(`MALWARE_DETECTED${malware.signature?`:${malware.signature}`:''}`);await this.contentPolicy?.(bytes,d);const sha256=createHash('sha256').update(bytes).digest('hex');const approvedKey=`approved/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}${safeSegment(uploadId)}`;await this.storage.put(approvedKey,bytes,{tenantId:d.tenantId,workspaceId:d.workspaceId??'',sha256,originalFilename:d.filename,mimeType:d.mimeType});await this.storage.delete(quarantineKey);await this.queue.enqueue('document-processing',{uploadId,tenantId:d.tenantId,workspaceId:d.workspaceId,approvedKey,filename:d.filename,mimeType:d.mimeType,sha256},{idempotencyKey:`document:${d.tenantId}:${uploadId}`,correlationId:uploadId,maxAttempts:5});return{approvedKey,sha256}}
}

export const DEFAULT_UPLOAD_POLICY:UploadPolicy={maxBytes:25*1024*1024,allowedExtensions:new Set(['.pdf','.txt','.md','.docx','.png','.jpg','.jpeg','.zip']),allowedMimeTypes:new Set(['application/pdf','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','application/zip']),maxArchiveExpansionRatio:100};
