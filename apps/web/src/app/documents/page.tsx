import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Documents(){if(!await authorizeWebRoute('feature:documents'))notFound();return <section><h1>Documents</h1><p>Authorized uploads and tenant-scoped document processing.</p></section>}
