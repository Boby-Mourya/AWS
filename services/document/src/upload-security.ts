import { createHash, randomUUID } from 'node:crypto';
import type { JobQueuePort, ObjectStoragePort } from '../../../packages/capability-contracts/src/index.js';

export interface PresignedUploadPort { signedUploadUrl(key:string,expiresSeconds:number,contentType:string,metadata?:Record<string,string>):Promise<string>; }
export interface MalwareScanner { scan(bytes:Uint8Array):Promise<{clean:boolean;signature?:string}>; }
export interface UploadPolicy { maxBytes:number; allowedExtensions:ReadonlySet<string>; allowedMimeTypes:ReadonlySet<string>; maxArchiveExpansionRatio:number; maxArchiveEntries?:number; maxArchiveUncompressedBytes?:number; }
export interface UploadDescriptor { tenantId:string; workspaceId?:string; filename:string; mimeType:string; sizeBytes:number; archiveUncompressedBytes?:number; }
export interface AuthorizedUpload { uploadId:string; quarantineKey:string; uploadUrl:string; expiresSeconds:number; }

const magic:Record<string,number[][]>={
  'application/pdf':[[0x25,0x50,0x44,0x46]],
  'image/png':[[0x89,0x50,0x4e,0x47]],
  'image/jpeg':[[0xff,0xd8,0xff]],
  'application/zip':[[0x50,0x4b,0x03,0x04],[0x50,0x4b,0x05,0x06],[0x50,0x4b,0x07,0x08]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':[[0x50,0x4b,0x03,0x04],[0x50,0x4b,0x05,0x06],[0x50,0x4b,0x07,0x08]]
};
const archiveMimeTypes=new Set(['application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
function ext(name:string){const i=name.lastIndexOf('.');return i<0?'':name.slice(i).toLowerCase()}
function safeSegment(value:string){if(!value||value==='.'||value==='..'||value.length>200||!/^[A-Za-z0-9._-]+$/.test(value))throw new Error('INVALID_STORAGE_SEGMENT');return value}
function matchesMagic(bytes:Uint8Array,mime:string){const signatures=magic[mime];if(!signatures)return true;return signatures.some(signature=>signature.every((byte,index)=>bytes[index]===byte))}
function u16(bytes:Uint8Array,offset:number){if(offset+2>bytes.length)throw new Error('MALFORMED_ZIP');return bytes[offset]!|(bytes[offset+1]!<<8)}
function u32(bytes:Uint8Array,offset:number){if(offset+4>bytes.length)throw new Error('MALFORMED_ZIP');return (bytes[offset]!|(bytes[offset+1]!<<8)|(bytes[offset+2]!<<16)|(bytes[offset+3]!<<24))>>>0}

export interface ZipInspection { entries:number; totalCompressedBytes:number; totalUncompressedBytes:number; maxEntryExpansionRatio:number; }
export function inspectZipArchive(bytes:Uint8Array):ZipInspection{
  let entries=0,totalCompressedBytes=0,totalUncompressedBytes=0,maxEntryExpansionRatio=0,sawCentral=false;
  for(let offset=0;offset+4<=bytes.length;){
    const signature=u32(bytes,offset);
    if(signature===0x02014b50){
      sawCentral=true;if(offset+46>bytes.length)throw new Error('MALFORMED_ZIP');
      const compressed=u32(bytes,offset+20);const uncompressed=u32(bytes,offset+24);
      if(compressed===0xffffffff||uncompressed===0xffffffff)throw new Error('ZIP64_ARCHIVE_REJECTED');
      const filenameLength=u16(bytes,offset+28),extraLength=u16(bytes,offset+30),commentLength=u16(bytes,offset+32);
      const recordLength=46+filenameLength+extraLength+commentLength;if(offset+recordLength>bytes.length)throw new Error('MALFORMED_ZIP');
      entries++;totalCompressedBytes+=compressed;totalUncompressedBytes+=uncompressed;maxEntryExpansionRatio=Math.max(maxEntryExpansionRatio,uncompressed/Math.max(1,compressed));offset+=recordLength;continue;
    }
    offset++;
  }
  if(!sawCentral){const isEmptyZip=bytes.length>=22&&u32(bytes,bytes.length-22)===0x06054b50;if(!isEmptyZip)throw new Error('MALFORMED_ZIP')}
  return{entries,totalCompressedBytes,totalUncompressedBytes,maxEntryExpansionRatio};
}

export class UploadSecurityPipeline {
  constructor(private readonly storage:ObjectStoragePort & Partial<PresignedUploadPort>,private readonly scanner:MalwareScanner,private readonly queue:JobQueuePort,private readonly policy:UploadPolicy,private readonly authorize:(tenantId:string,workspaceId:string|undefined)=>Promise<boolean>,private readonly contentPolicy?:(bytes:Uint8Array,descriptor:UploadDescriptor)=>Promise<void>){}
  validateDescriptor(d:UploadDescriptor){safeSegment(d.tenantId);if(d.workspaceId)safeSegment(d.workspaceId);if(d.sizeBytes<=0||d.sizeBytes>this.policy.maxBytes)throw new Error('UPLOAD_SIZE_REJECTED');if(!this.policy.allowedExtensions.has(ext(d.filename)))throw new Error('UPLOAD_EXTENSION_REJECTED');if(!this.policy.allowedMimeTypes.has(d.mimeType))throw new Error('UPLOAD_MIME_REJECTED')}
  async authorizeUpload(d:UploadDescriptor):Promise<AuthorizedUpload>{this.validateDescriptor(d);if(!await this.authorize(d.tenantId,d.workspaceId))throw new Error('UPLOAD_ACCESS_DENIED');if(!this.storage.signedUploadUrl)throw new Error('PRESIGNED_UPLOAD_UNAVAILABLE');const uploadId=randomUUID();const prefix=`quarantine/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}`;const quarantineKey=`${prefix}${uploadId}`;const expiresSeconds=300;const uploadUrl=await this.storage.signedUploadUrl(quarantineKey,expiresSeconds,d.mimeType,{tenantId:d.tenantId,workspaceId:d.workspaceId??'',uploadId,originalFilename:d.filename});return{uploadId,quarantineKey,uploadUrl,expiresSeconds}}
  async inspectAndApprove(d:UploadDescriptor,uploadId:string):Promise<{approvedKey:string;sha256:string}>{
    this.validateDescriptor(d);if(!await this.authorize(d.tenantId,d.workspaceId))throw new Error('UPLOAD_ACCESS_DENIED');const quarantineKey=`quarantine/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}${safeSegment(uploadId)}`;const bytes=await this.storage.get(quarantineKey);
    if(bytes.byteLength!==d.sizeBytes)throw new Error('UPLOAD_SIZE_MISMATCH');if(!matchesMagic(bytes,d.mimeType))throw new Error('UPLOAD_MAGIC_BYTES_REJECTED');
    if(archiveMimeTypes.has(d.mimeType)){
      const archive=inspectZipArchive(bytes);const maxEntries=this.policy.maxArchiveEntries??10_000;const maxUncompressed=this.policy.maxArchiveUncompressedBytes??Math.min(250*1024*1024,this.policy.maxBytes*this.policy.maxArchiveExpansionRatio);
      const totalRatio=archive.totalUncompressedBytes/Math.max(1,archive.totalCompressedBytes);
      if(archive.entries>maxEntries||archive.totalUncompressedBytes>maxUncompressed||totalRatio>this.policy.maxArchiveExpansionRatio||archive.maxEntryExpansionRatio>this.policy.maxArchiveExpansionRatio)throw new Error('ARCHIVE_BOMB_REJECTED');
      if(d.archiveUncompressedBytes!==undefined&&d.archiveUncompressedBytes!==archive.totalUncompressedBytes)throw new Error('ARCHIVE_SIZE_METADATA_MISMATCH');
    }
    const malware=await this.scanner.scan(bytes);if(!malware.clean)throw new Error(`MALWARE_DETECTED${malware.signature?`:${malware.signature}`:''}`);await this.contentPolicy?.(bytes,d);const sha256=createHash('sha256').update(bytes).digest('hex');const approvedKey=`approved/tenants/${safeSegment(d.tenantId)}/${d.workspaceId?`workspaces/${safeSegment(d.workspaceId)}/`:''}${safeSegment(uploadId)}`;await this.storage.put(approvedKey,bytes,{tenantId:d.tenantId,workspaceId:d.workspaceId??'',sha256,originalFilename:d.filename,mimeType:d.mimeType});await this.storage.delete(quarantineKey);await this.queue.enqueue('document-processing',{uploadId,tenantId:d.tenantId,workspaceId:d.workspaceId,approvedKey,filename:d.filename,mimeType:d.mimeType,sha256},{idempotencyKey:`document:${d.tenantId}:${uploadId}`,correlationId:uploadId,maxAttempts:5});return{approvedKey,sha256}
  }
}

export const DEFAULT_UPLOAD_POLICY:UploadPolicy={maxBytes:25*1024*1024,allowedExtensions:new Set(['.pdf','.txt','.md','.docx','.png','.jpg','.jpeg','.zip']),allowedMimeTypes:new Set(['application/pdf','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','application/zip']),maxArchiveExpansionRatio:100,maxArchiveEntries:10_000,maxArchiveUncompressedBytes:250*1024*1024};
