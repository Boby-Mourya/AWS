import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Integrations(){if(!await authorizeWebRoute('feature:integrations'))notFound();return <section><h1>Integrations</h1><p>Tenant-scoped integrations. Credentials are never rendered into browser bundles.</p></section>}
