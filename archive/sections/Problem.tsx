import { Section } from '../ui/Section';
import { Tex } from '../ui/Tex';
import { ImbalanceBar } from '../viz/ImbalanceBar';

export function Problem() {
  return (
    <Section
      id="problem"
      title={
        <>
          Can synthetic scans solve <span className="text-gen">data scarcity</span>?
        </>
      }
    >
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-6 text-lg leading-relaxed text-bone/85 lg:col-span-6">
          <p>
            Medical datasets for rare conditions are <strong className="font-semibold text-bone">small</strong> and{' '}
            <strong className="font-semibold text-bone">imbalanced</strong>: a few hundred positive scans against
            thousands of normal ones.
          </p>
          <p>
            Can a GAN trained <em className="not-italic text-gen-glow">only on the minority class</em> generate realistic
            scans that actually help a classifier learn?
          </p>
          <div className="panel relative mt-8 p-6">
            <p className="font-sans tabular-nums text-[13px] text-disc">Formal version</p>
            <div className="mt-4 overflow-x-auto text-xl text-bone">
              <Tex display math="p_g(x) \approx p_{\text{data}}(x)" />
            </div>
            <p className="mt-2 text-base text-muted">
              Learn the minority-class distribution so that training on{' '}
              <span className="text-bone">real + synthetic</span> generalises better than{' '}
              <span className="text-bone">real alone</span>.
            </p>
          </div>
        </div>
        <div className="lg:col-span-6 lg:pt-2">
          <ImbalanceBar />
        </div>
      </div>
    </Section>
  );
}
