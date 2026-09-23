import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStoragePort } from '../../../packages/capability-contracts/src/index.js';

export interface S3ObjectStorageOptions { bucket:string; prefix?:string; kmsKeyId?:string; region?:string; }

function safeKey(key:string):string {
  const normalized=key.replace(/^\/+/, '');
  if(!normalized || normalized.split('/').some(part=>part==='..')) throw new Error('INVALID_STORAGE_KEY');
  return normalized;
}
function safeSegment(value:string,label:string):string{if(!value||value==='.'||value==='..')throw new Error(`${label}_REQUIRED`);return encodeURIComponent(value)}

export function tenantObjectPrefix(tenantId:string,workspaceId?:string):string {
  return `tenants/${safeSegment(tenantId,'TENANT')}/workspaces/${safeSegment(workspaceId??'_root','WORKSPACE')}/`;
}

export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly prefix:string;
  constructor(private readonly client:S3Client,private readonly options:S3ObjectStorageOptions){this.prefix=options.prefix?.replace(/^\/+|\/+$/g,'')??''}
  private key(key:string){const value=safeKey(key);return this.prefix?`${this.prefix}/${value}`:value}
  async put(key:string,body:Uint8Array,metadata:Record<string,string>={}){await this.client.send(new PutObjectCommand({Bucket:this.options.bucket,Key:this.key(key),Body:body,Metadata:metadata,ServerSideEncryption:this.options.kmsKeyId?'aws:kms':'AES256',SSEKMSKeyId:this.options.kmsKeyId}))}
  async get(key:string){const response=await this.client.send(new GetObjectCommand({Bucket:this.options.bucket,Key:this.key(key)}));if(!response.Body)throw new Error('OBJECT_NOT_FOUND');return new Uint8Array(await response.Body.transformToByteArray())}
  async delete(key:string){await this.client.send(new DeleteObjectCommand({Bucket:this.options.bucket,Key:this.key(key)}))}
  async signedUrl(key:string,expiresSeconds:number){return getSignedUrl(this.client,new GetObjectCommand({Bucket:this.options.bucket,Key:this.key(key)}),{expiresIn:Math.min(3600,Math.max(1,expiresSeconds))})}
  async signedUploadUrl(key:string,expiresSeconds:number,contentType:string,metadata:Record<string,string>={}){return getSignedUrl(this.client,new PutObjectCommand({Bucket:this.options.bucket,Key:this.key(key),ContentType:contentType,Metadata:metadata,ServerSideEncryption:this.options.kmsKeyId?'aws:kms':'AES256',SSEKMSKeyId:this.options.kmsKeyId}),{expiresIn:Math.min(900,Math.max(1,expiresSeconds))})}
  async health(){try{await this.client.send(new HeadBucketCommand({Bucket:this.options.bucket}));return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'S3 health check failed',checkedAt:new Date().toISOString()}}}
}

export function createS3ObjectStorage(options:S3ObjectStorageOptions){return new S3ObjectStorageAdapter(new S3Client({region:options.region??process.env.AWS_REGION}),options)}
