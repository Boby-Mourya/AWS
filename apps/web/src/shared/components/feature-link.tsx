import Link from 'next/link';
export function FeatureLink({enabled,href,children}:{enabled:boolean;href:string;children:React.ReactNode}){ return enabled ? <Link href={href}>{children}</Link> : <span aria-disabled="true" title="Feature unavailable">{children}</span>; }
