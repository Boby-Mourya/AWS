import Link from 'next/link';
import './styles.css';
import { sections } from './sections';

export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><div className="shell"><aside><h1>Platform Control Center</h1><nav>{sections.map(s=><Link key={s.slug} href={`/${s.slug}`}>{s.title}</Link>)}</nav></aside><main>{children}</main></div></body></html>;
}
