export function parsePage(query:Record<string,unknown>,max=100){const raw=Number(query.limit ?? 25);return {limit:Number.isFinite(raw)?Math.max(1,Math.min(max,raw)):25,cursor:typeof query.cursor==='string'?query.cursor:undefined};}
export function encodeCursor(value:string):string{return Buffer.from(value).toString('base64url')}
export function decodeCursor(value:string):string{return Buffer.from(value,'base64url').toString('utf8')}
