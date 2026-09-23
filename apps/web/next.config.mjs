const isProd = process.env.NODE_ENV === 'production';
const headers = [
  { key:'Content-Security-Policy', value:"default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  { key:'X-Content-Type-Options', value:'nosniff' },
  { key:'Referrer-Policy', value:'strict-origin-when-cross-origin' },
  { key:'Permissions-Policy', value:'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key:'Strict-Transport-Security', value:'max-age=63072000; includeSubDomains; preload' }] : [])
];
export default { poweredByHeader:false, async headers(){ return [{ source:'/:path*', headers }]; } };
