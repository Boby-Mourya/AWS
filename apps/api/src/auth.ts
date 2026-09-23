import { ApiError } from './errors.js';
import { OidcTokenVerifier, devTenantContext, type TenantContext } from '../../../packages/security/src/index.js';

const production=process.env.NODE_ENV==='production';
const verifier=process.env.OIDC_ISSUER&&process.env.OIDC_AUDIENCE?new OidcTokenVerifier({issuer:process.env.OIDC_ISSUER,audience:process.env.OIDC_AUDIENCE,jwksUri:process.env.OIDC_JWKS_URI}):null;
if(production&&!verifier)throw new Error('OIDC_ISSUER and OIDC_AUDIENCE are required in production');

export async function authenticate(authorization:string|undefined):Promise<TenantContext>{
  if(!authorization?.startsWith('Bearer '))throw new ApiError(401,'AUTHENTICATION_REQUIRED','Bearer token is required');
  const token=authorization.slice(7);
  try{return verifier?await verifier.verify(token):devTenantContext(token)}catch{throw new ApiError(401,'INVALID_TOKEN','Authentication token is invalid or does not satisfy policy')}
}
