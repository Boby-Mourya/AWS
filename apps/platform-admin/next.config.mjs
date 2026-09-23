const securityHeaders = [
  { key:'X-Content-Type-Options', value:'nosniff' },
  { key:'Referrer-Policy', value:'strict-origin-when-cross-origin' },
  { key:'Permissions-Policy', value:'camera=(), microphone=(), geolocation=()' }
];
export default { async headers(){ return [{ source:'/:path*', headers:securityHeaders }]; } };
