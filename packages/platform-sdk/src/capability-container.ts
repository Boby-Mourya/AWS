import type {
  AIModelPort,
  CachePort,
  DistributedLockPort,
  EventBusPort,
  IdempotencyPort,
  JobQueuePort,
  ObjectStoragePort,
  SearchPort
} from '@platform/capability-contracts';
import type { DesiredState } from '@platform/config-engine';
import { assertPlatformState } from '@platform/config-engine';
import type { Environment } from '@platform/policy-engine';
import { ProviderRegistry } from './provider-registry.js';

export interface CapabilityPortMap {
  cache: CachePort;
  distributed_lock: DistributedLockPort;
  idempotency: IdempotencyPort;
  queue: JobQueuePort;
  event_bus: EventBusPort;
  object_storage: ObjectStoragePort;
  search: SearchPort;
  ai: AIModelPort;
}

type ResolvableCapability = keyof CapabilityPortMap & keyof DesiredState['platform'];
export interface ResolvedCapability<T>{provider:string;value:T;degraded:boolean}

export class CapabilityContainer{
  constructor(private readonly registry:ProviderRegistry,private readonly desiredState:DesiredState,environment:Environment){assertPlatformState(desiredState,environment)}
  async resolve<K extends ResolvableCapability>(capability:K):Promise<ResolvedCapability<CapabilityPortMap[K]>>{
    const selection=this.desiredState.platform[capability];
    if(!selection.enabled){if(!selection.fallback)throw new Error(`CAPABILITY_UNAVAILABLE:${capability}`);return this.resolveProvider(capability,selection.fallback,true)}
    try{const primary=await this.resolveProvider(capability,selection.provider,false);const health=await primary.value.health();if(health.status!=='UNHEALTHY')return primary;if(!selection.fallback||selection.fallback===selection.provider)throw new Error(`CAPABILITY_UNHEALTHY:${capability}/${selection.provider}`)}catch(error){if(!selection.fallback||selection.fallback===selection.provider)throw error}
    return this.resolveProvider(capability,selection.fallback,true);
  }
  private async resolveProvider<K extends ResolvableCapability>(capability:K,provider:string,degraded:boolean):Promise<ResolvedCapability<CapabilityPortMap[K]>>{const value=await this.registry.resolve<CapabilityPortMap[K]>(capability,provider);return{provider,value,degraded}}
}
