import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AIModelPort, AIModelRequest, AIModelResponse } from '../../../packages/capability-contracts/src/index.js';

export interface OpenAICompatibleOptions { baseUrl:string; apiKey?:string; defaultModel:string; providerName:string; timeoutMs?:number; }

export class OpenAICompatibleAdapter implements AIModelPort {
  constructor(private readonly options:OpenAICompatibleOptions){}
  async generate(request:AIModelRequest):Promise<AIModelResponse>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.options.timeoutMs??30000);
    try{
      const response=await fetch(`${this.options.baseUrl.replace(/\/$/,'')}/v1/chat/completions`,{method:'POST',headers:{'content-type':'application/json',...(this.options.apiKey?{authorization:`Bearer ${this.options.apiKey}`}:{})},body:JSON.stringify({model:request.model??this.options.defaultModel,messages:[{role:'user',content:request.input}],max_tokens:request.maxTokens,temperature:request.temperature}),signal:controller.signal});
      if(!response.ok)throw new Error(`AI_PROVIDER_${response.status}`);const body:any=await response.json();
      return{output:String(body.choices?.[0]?.message?.content??''),model:String(body.model??request.model??this.options.defaultModel),inputTokens:Number(body.usage?.prompt_tokens??0),outputTokens:Number(body.usage?.completion_tokens??0),provider:this.options.providerName};
    }finally{clearTimeout(timer)}
  }
  async health(){try{const response=await fetch(`${this.options.baseUrl.replace(/\/$/,'')}/v1/models`,{headers:this.options.apiKey?{authorization:`Bearer ${this.options.apiKey}`}:{}});return{status:response.ok?'HEALTHY' as const:'DEGRADED' as const,checkedAt:new Date().toISOString()}}catch(error){return{status:'UNHEALTHY' as const,message:error instanceof Error?error.message:'AI provider unavailable',checkedAt:new Date().toISOString()}}}
}

export class BedrockAIAdapter implements AIModelPort {
  constructor(private readonly client:BedrockRuntimeClient,private readonly defaultModel:string){}
  async generate(request:AIModelRequest):Promise<AIModelResponse>{const modelId=request.model??this.defaultModel;const result=await this.client.send(new ConverseCommand({modelId,messages:[{role:'user',content:[{text:request.input}]}],inferenceConfig:{maxTokens:request.maxTokens,temperature:request.temperature}}));const output=result.output?.message?.content?.map(item=>'text' in item?item.text??'':'').join('')??'';return{output,model:modelId,inputTokens:result.usage?.inputTokens??0,outputTokens:result.usage?.outputTokens??0,provider:'bedrock'}}
  async health(){return{status:'HEALTHY' as const,checkedAt:new Date().toISOString()}}
}

export const createBedrockAI=(defaultModel:string,region=process.env.AWS_REGION)=>new BedrockAIAdapter(new BedrockRuntimeClient({region}),defaultModel);
