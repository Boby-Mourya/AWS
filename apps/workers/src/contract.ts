export type JobState='PENDING'|'RUNNING'|'COMPLETED'|'FAILED'|'RETRYING'|'DEAD_LETTERED'|'CANCELLED';
export interface JobEnvelope<T=unknown>{job_id:string;job_type:string;tenant_id:string;workspace_id?:string;payload:T;attempt:number;max_attempts:number;created_at:string;correlation_id:string;idempotency_key:string;}
export interface JobResult{state:JobState;attempt:number;errorCode?:string;}
