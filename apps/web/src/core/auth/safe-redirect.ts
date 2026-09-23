export function safeRedirectTarget(input:string|undefined,fallback='/dashboard'):string{
  if (!input || !input.startsWith('/') || input.startsWith('//')) return fallback;
  try { const url=new URL(input,'https://local.invalid'); return url.origin==='https://local.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback; } catch { return fallback; }
}
