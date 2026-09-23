import Link from 'next/link';
import './styles.css';
import { AppErrorBoundary } from '../core/errors/error-boundary';
import { readWebSession } from '../core/auth/session';

const navigation=[
  {href:'/dashboard',label:'Dashboard'},
  {href:'/documents',label:'Documents',permission:'feature:documents'},
  {href:'/chat',label:'Chat',permission:'feature:chat'},
  {href:'/analytics',label:'Analytics',permission:'feature:analytics'},
  {href:'/workflows',label:'Workflows',permission:'feature:workflow'},
  {href:'/integrations',label:'Integrations',permission:'feature:integrations'}
] as const;

export default async function Layout({children}:{children:React.ReactNode}){
  const session=await readWebSession();const permissions=new Set(session?.permissions??[]);
  return <html lang="en"><body><a className="skip" href="#content">Skip to content</a><header><Link href="/dashboard" className="brand">AWS Platform</Link><nav aria-label="Primary">{navigation.filter(item=>!('permission' in item)||permissions.has(item.permission)).map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav></header><main id="content"><AppErrorBoundary>{children}</AppErrorBoundary></main></body></html>;
}
