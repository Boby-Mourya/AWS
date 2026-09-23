import { notFound } from 'next/navigation';
import { sections } from '../sections';

export default async function SectionPage({params}:{params:Promise<{section:string}>}) {
  const { section } = await params;
  const selected = sections.find(s=>s.slug===section);
  if (!selected) notFound();
  const destructive = section === 'changes' || section === 'infrastructure';
  return <><header><p className="eyebrow">PRODUCTION / ap-south-1</p><h2>{selected.title}</h2><p>{selected.responsibility}</p></header><section className="card"><strong>Desired-state control plane</strong><p>Changes are validated, dependency-checked, audited and reversible. A UI OFF action never directly deletes infrastructure.</p>{destructive && <p className="warning">Destroy operations require a separate approved IaC workflow after stabilization and retention checks.</p>}</section></>;
}
