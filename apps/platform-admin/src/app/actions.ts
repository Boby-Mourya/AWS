'use server';

import { revalidatePath } from 'next/cache';
import { writeControlResource } from './control-client';

const allowedOperations=new Set(['disable-capability','stop-infrastructure','change-provider','compute-migration']);
const allowedTransitions=new Set(['VALIDATING','IMPACT_ANALYSIS','WAITING_APPROVAL','APPROVED','PROVISIONING','DEPLOYING','VERIFYING','STABILIZING','COMPLETED','FAILED','ROLLING_BACK','ROLLED_BACK']);

function requiredText(formData:FormData,name:string):string{const value=formData.get(name);if(typeof value!=='string'||!value.trim())throw new Error(`${name} is required`);return value.trim()}
function assertSuccess(response:{ok:boolean;status:number;data:unknown}):void{if(response.ok)return;const value=response.data as {error?:{code?:string;message?:string}};throw new Error(`${value?.error?.code??'CONTROL_REQUEST_FAILED'}: ${value?.error?.message??`HTTP ${response.status}`}`)}

export async function createControlChange(formData:FormData):Promise<void>{
  const operation=requiredText(formData,'operation');if(!allowedOperations.has(operation))throw new Error('Unsupported control operation');
  const capability=requiredText(formData,'capability');const desiredRaw=requiredText(formData,'desired');let desired:Record<string,unknown>;
  try{const parsed=JSON.parse(desiredRaw) as unknown;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();desired=parsed as Record<string,unknown>}catch{throw new Error('desired must be a JSON object')}
  const response=await writeControlResource('/v1/control/changes','POST',{operation,capability,desired});assertSuccess(response);revalidatePath('/changes');
}

export async function transitionControlChange(formData:FormData):Promise<void>{
  const id=requiredText(formData,'id');const next=requiredText(formData,'next');if(!allowedTransitions.has(next))throw new Error('Unsupported change transition');
  const note=typeof formData.get('note')==='string'?String(formData.get('note')).trim():undefined;
  const response=await writeControlResource(`/v1/control/changes/${encodeURIComponent(id)}/transition`,'POST',{next,note:note||undefined});assertSuccess(response);revalidatePath('/changes');
}
