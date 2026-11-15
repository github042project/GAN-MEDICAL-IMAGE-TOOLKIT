import { Section } from '../ui/Section';
import { ArchitectureDiagram } from '../viz/ArchitectureDiagram';
import { MinimaxExplorer } from '../viz/MinimaxExplorer';

const DCGAN_POINTS = [
  { k: 'Layers', v: 'Convolution / transposed convolution with batch normalisation' },
  { k: 'Training', v: 'Known for comparatively stable training' },
  { k: 'Data', v: 'Handles grayscale medical images directly' },
  { k: 'Compute', v: 'Runs on modest hardware' },
];

export function Method() {
  return (
    <Section
      id="method"
      title={
        <>
          One objective, <span className="text-gen">two</span> <span className="text-disc">opponents</span>.
        </>
      }
      lede="The Generator and Discriminator optimise the same value function in opposite directions."
    >
      <div className="mt-12">
        <MinimaxExplorer />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="panel lightbox relative overflow-hidden p-6 lg:p-8 xl:col-span-4" aria-labelledby="dcgan-title">
          <div aria-hidden="true" className="absolute left-0 top-0 h-full w-[3px] bg-gen" />
          <p className="font-sans tabular-nums text-[13px] text-muted">Chosen variant</p>
          <h3 id="dcgan-title" className="mt-3 text-4xl font-semibold text-bone">
            DCGAN
          </h3>
          <p className="mt-1 text-sm text-muted">Deep Convolutional GAN · Radford et al., 2015</p>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {DCGAN_POINTS.map((p) => (
              <div key={p.k} className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-sans tabular-nums text-[13px] text-gen-glow">{p.k}</dt>
                <dd className="text-[15px] leading-snug text-bone/85">{p.v}</dd>
              </div>
            ))}
          </dl>
        </aside>
        <div className="panel flex flex-col justify-center p-5 lg:p-8 xl:col-span-8">
          <p className="mb-4 font-sans tabular-nums text-[13px] text-muted">Architecture · data flow</p>
          <ArchitectureDiagram />
        </div>
      </div>
    </Section>
  );
}
