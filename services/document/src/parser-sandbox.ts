export interface ParserSandboxPolicy {
  cpuUnits:number;
  memoryMb:number;
  timeoutMs:number;
  writableTmpMb:number;
  networkAccess:'none'|'egress-deny-by-default';
  readOnlyRootFilesystem:true;
}

export interface ParserSandboxExecutor {
  execute(input:Uint8Array,policy:ParserSandboxPolicy,signal:AbortSignal):Promise<{text:string;metadata?:Record<string,unknown>}>;
}

export const DEFAULT_PARSER_SANDBOX:ParserSandboxPolicy={cpuUnits:512,memoryMb:512,timeoutMs:30_000,writableTmpMb:64,networkAccess:'none',readOnlyRootFilesystem:true};

/**
 * Application-side parser isolation contract. The concrete container/task runner must map every
 * field to runtime controls (CPU/memory limit, read-only rootfs, bounded tmpfs and network deny).
 */
export class IsolatedDocumentParser {
  constructor(private readonly executor:ParserSandboxExecutor,private readonly policy:ParserSandboxPolicy=DEFAULT_PARSER_SANDBOX){}
  async parse(input:Uint8Array){
    if(this.policy.networkAccess!=='none'||this.policy.readOnlyRootFilesystem!==true)throw new Error('UNSAFE_PARSER_SANDBOX_POLICY');
    if(this.policy.cpuUnits<=0||this.policy.memoryMb<=0||this.policy.timeoutMs<=0||this.policy.writableTmpMb<=0)throw new Error('INVALID_PARSER_SANDBOX_LIMITS');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('PARSER_TIMEOUT')),this.policy.timeoutMs);
    try{return await this.executor.execute(input,this.policy,controller.signal)}finally{clearTimeout(timer)}
  }
}
