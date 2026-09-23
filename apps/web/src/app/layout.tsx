import Link from 'next/link';
import './styles.css';
import { AppErrorBoundary } from '../core/errors/error-boundary';

export default function Layout({children}:{children:React.ReactNode}){ return <html lang="en"><body><a className="skip" href="#content">Skip to content</a><header><Link href="/dashboard" className="brand">AWS Platform</Link><nav aria-label="Primary"><Link href="/dashboard">Dashboard</Link><Link href="/documents">Documents</Link><Link href="/chat">Chat</Link><Link href="/analytics">Analytics</Link><Link href="/workflows">Workflows</Link><Link href="/integrations">Integrations</Link></nav></header><main id="content"><AppErrorBoundary>{children}</AppErrorBoundary></main></body></html>; }
