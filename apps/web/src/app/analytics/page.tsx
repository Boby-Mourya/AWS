import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Analytics(){if(!await authorizeWebRoute('feature:analytics'))notFound();return <section><h1>Analytics</h1><p>Workspace analytics.</p></section>}
