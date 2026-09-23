import { notFound } from 'next/navigation';
import { sections } from '../sections';
import { controlPath, readControlResource } from '../control-client';

function redact(value:unknown,key=''):unknown{
  if(/secret|token|password|authorization|credential/i.test(key))return'[REDACTED]';
  if(Array.isArray(value))return value.map(item=>redact(item));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,redact(v,k)]));
  return value;
}

export default async function SectionPage({params}:{params:Promise<{section:string}>}){
  const{section}=await params;const selected=sections.find(s=>s.slug===section);if(!selected)notFound();
  const destructive=section==='changes'||section==='infrastructure';const response=await readControlResource(controlPath(section));
  return <><header><p className="eyebrow">PRODUCTION / ap-south-1</p><h2>{selected.title}</h2><p>{selected.responsibility}</p></header>
    <section className="card"><strong>Desired-state control plane</strong><p>Changes are validated, dependency-checked, attributable and reversible. A UI OFF action never directly deletes infrastructure.</p>{destructive&&<p className="warning">Destroy operations require a separate approved IaC workflow after stabilization and retention checks.</p>}</section>
    <section className="card" aria-live="polite"><strong>Control API state</strong><p>Status: {response.ok?'AVAILABLE':`UNAVAILABLE / ${response.status}`}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(redact(response.data),null,2)}</pre></section>
  </>;
}
