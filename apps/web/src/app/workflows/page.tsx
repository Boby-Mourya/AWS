import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Workflows(){if(!await authorizeWebRoute('feature:workflow'))notFound();return <section><h1>Workflows</h1><p>Workflow capability is feature-flagged and permission-gated.</p></section>}
