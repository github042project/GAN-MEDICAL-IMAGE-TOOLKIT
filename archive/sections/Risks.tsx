import { Section } from '../ui/Section';
import { ModeCollapse } from '../viz/ModeCollapse';

const NOTES = [
  {
    tag: 'Risk',
    title: 'Synthetic scans can mislead a classifier',
    body: 'If generated images carry artefacts or miss real pathology, a classifier may learn those artefacts instead of the disease, and look better on paper than it is.',
    tone: 'border-gen',
  },
  {
    tag: 'Ethics',
    title: 'Synthetic patient data still needs care',
    body: 'Generated scans are derived from real patients. Privacy, consent and clear labelling of what is synthetic matter before any clinical use.',
    tone: 'border-disc',
  },
];

export function Risks() {
  return (
    <Section
      id="risks"
      title={
        <>
          When the forger learns <span className="text-gen">only one trick</span>.
        </>
      }
    >
      <div className="mt-12 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ModeCollapse />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          {NOTES.map((n) => (
            <article key={n.title} className={`panel border-l-[3px] p-6 ${n.tone}`}>
              <p className="font-sans tabular-nums text-[13px] text-muted">{n.tag}</p>
              <h3 className="mt-2 text-xl font-semibold text-bone">{n.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{n.body}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
