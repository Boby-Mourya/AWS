const forbiddenSecretFields=new Set([
  'secret','secretvalue','value','plaintext','password','passphrase','token','accesstoken','refreshtoken',
  'authorization','credential','credentials','apikey','clientsecret','privatekey','privatekeypem'
]);

function normalizedKey(key:string):string{return key.toLowerCase().replace(/[^a-z0-9]/g,'')}

export function assertSecretMetadataOnly(value:unknown,path='secrets'):void{
  if(Array.isArray(value)){value.forEach((item,index)=>assertSecretMetadataOnly(item,`${path}[${index}]`));return}
  if(!value||typeof value!=='object')return;
  for(const [key,nested] of Object.entries(value as Record<string,unknown>)){
    const normalized=normalizedKey(key);
    if(forbiddenSecretFields.has(normalized))throw Object.assign(new Error(`Plaintext secret material is forbidden at ${path}.${key}`),{statusCode:400,code:'PLAINTEXT_SECRET_FORBIDDEN'});
    assertSecretMetadataOnly(nested,`${path}.${key}`);
  }
}

export function redactSecretMaterial(value:unknown,key=''):unknown{
  if(forbiddenSecretFields.has(normalizedKey(key)))return'[REDACTED]';
  if(Array.isArray(value))return value.map(item=>redactSecretMaterial(item));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([nestedKey,nested])=>[nestedKey,redactSecretMaterial(nested,nestedKey)]));
  return value;
}
