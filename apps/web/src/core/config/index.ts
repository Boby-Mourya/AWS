export interface PublicWebConfig {
  apiBaseUrl: string;
  environment: 'development'|'testing'|'staging'|'production';
}

function safeBaseUrl(value:string|undefined):string{
  const candidate=value?.trim()||'/api';
  if(candidate.startsWith('/'))return candidate;
  const url=new URL(candidate);
  if(url.protocol!=='https:'&&process.env.NODE_ENV==='production')throw new Error('PUBLIC_API_URL_MUST_USE_HTTPS');
  return url.toString().replace(/\/$/,'');
}

export function readPublicWebConfig():PublicWebConfig{
  const environment=(process.env.NEXT_PUBLIC_PLATFORM_ENV??(process.env.NODE_ENV==='production'?'production':'development')) as PublicWebConfig['environment'];
  if(!['development','testing','staging','production'].includes(environment))throw new Error('INVALID_PUBLIC_PLATFORM_ENV');
  return{apiBaseUrl:safeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),environment};
}

/** Frontend intentionally exposes product capabilities only, never infrastructure provider selection. */
export const FORBIDDEN_BROWSER_CONFIG_KEYS=['REDIS_URL','KAFKA_BROKERS','SQS_QUEUE_URL','AWS_SECRET_ACCESS_KEY','DATABASE_URL','OIDC_CLIENT_SECRET'] as const;
