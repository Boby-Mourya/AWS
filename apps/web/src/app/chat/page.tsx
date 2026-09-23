import { notFound } from 'next/navigation';
import { authorizeWebRoute } from '../../core/auth/session';

export default async function Chat(){if(!await authorizeWebRoute('feature:chat'))notFound();return <section><h1>Chat</h1><p>AI actions appear only when the product capability and user permission are enabled.</p></section>}
