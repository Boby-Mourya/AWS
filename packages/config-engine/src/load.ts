import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import type { Environment } from '@platform/policy-engine';
import type { DesiredState } from './types.js';
import { assertPlatformState } from './validate-all.js';

function defaultEnvironment():Environment{
  const value=process.env.PLATFORM_ENV??process.env.NODE_ENV??'development';
  if(value==='test')return'testing';
  if(['development','testing','staging','production'].includes(value))return value as Environment;
  throw new Error(`INVALID_PLATFORM_ENVIRONMENT:${value}`);
}

export async function loadDesiredStateFile(path:string,environment:Environment=defaultEnvironment()):Promise<DesiredState>{
  const raw=await readFile(path,'utf8');const value=YAML.parse(raw) as DesiredState;assertPlatformState(value,environment);return value;
}
