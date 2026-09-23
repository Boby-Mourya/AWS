import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Dashboard(){
  if(!await authorizeWebRoute())notFound();
  return <section><p className="eyebrow">Workspace</p><h1>Dashboard</h1><div className="grid"><article><h2>Capabilities</h2><p>Product capabilities are shown here without exposing infrastructure provider names.</p></article><article><h2>Activity</h2><p>Tenant-scoped activity and status.</p></article></div></section>
}
