import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import type { ObjectStoragePort } from '../../../packages/capability-contracts/src/index.js';
import { S3ObjectStorageAdapter, type S3ObjectStorageOptions } from './index.js';

function safePath(root:string,key:string):string{
  const base=resolve(root);const target=resolve(base,key.replace(/^\/+/,''));
  if(target!==base&&!target.startsWith(base+sep))throw new Error('INVALID_STORAGE_KEY');return target;
}

export class FilesystemObjectStorageAdapter implements ObjectStoragePort{
  constructor(private readonly root:string){if(process.env.NODE_ENV==='production')throw new Error('FILESYSTEM_STORAGE_NOT_ALLOWED_IN_PRODUCTION')}
  async put(key:string,body:Uint8Array):Promise<void>{const target=safePath(this.root,key);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,body)}
  async get(key:string):Promise<Uint8Array>{try{return new Uint8Array(await readFile(safePath(this.root,key)))}catch{throw new Error('OBJECT_NOT_FOUND')}}
  async delete(key:string):Promise<void>{await rm(safePath(this.root,key),{force:true})}
  async signedUrl(key:string,expiresSeconds:number):Promise<string>{return`file://${safePath(this.root,key)}?expires=${Math.max(1,expiresSeconds)}`}
  async health(){try{await mkdir(this.root,{recursive:true});return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'filesystem storage unavailable',checkedAt:new Date().toISOString()}}}
}

export interface MinioObjectStorageOptions extends S3ObjectStorageOptions{endpoint:string;accessKeyId?:string;secretAccessKey?:string;}
export function createMinioObjectStorage(options:MinioObjectStorageOptions):S3ObjectStorageAdapter{
  if(process.env.NODE_ENV==='production'&&!options.endpoint.startsWith('https://'))throw new Error('MINIO_TLS_REQUIRED_IN_PRODUCTION');
  const client=new S3Client({region:options.region??'us-east-1',endpoint:options.endpoint,forcePathStyle:true,credentials:options.accessKeyId&&options.secretAccessKey?{accessKeyId:options.accessKeyId,secretAccessKey:options.secretAccessKey}:undefined});
  return new S3ObjectStorageAdapter(client,options);
}
