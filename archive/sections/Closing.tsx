import { motion } from 'framer-motion';
import { TEAM } from '../../lib/theme';
import { Section } from '../ui/Section';
import { PulseLine } from '../ui/PulseLine';
import { Monogram } from '../ui/Monogram';

const REFERENCES = [
  'Goodfellow, I. et al. (2014). Generative Adversarial Nets. NeurIPS.',
  'Radford, A., Metz, L. & Chintala, S. (2015). Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks (DCGAN). arXiv:1511.06434.',
  'Zhu, J.-Y. et al. (2017). Unpaired Image-to-Image Translation using Cycle-Consistent Adversarial Networks (CycleGAN). ICCV.',
  'Brock, A., Donahue, J. & Simonyan, K. (2018). Large Scale GAN Training for High Fidelity Natural Image Synthesis (BigGAN). arXiv:1809.11096.',
  'Karras, T., Laine, S. & Aila, T. (2019). A Style-Based Generator Architecture for Generative Adversarial Networks (StyleGAN). CVPR.',
];

export function Closing() {
  return (
    <Section id="closing" title={<span className="sr-only">Closing</span>} className="pb-16">
      <motion.blockquote
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8 }}
        className="mt-8 max-w-5xl"
      >
        <p className="font-display text-[clamp(1.75rem,3.6vw,3.4rem)] font-medium leading-[1.12] tracking-tight text-bone">
          “GANs proved that <span className="text-gen">two networks</span> arguing with each other can create things
          neither could make alone, even a scan that helps a classifier{' '}
          <span className="text-disc">see what it rarely gets to see</span>.”
        </p>
      </motion.blockquote>

      <PulseLine className="mt-10 max-w-xl" duration={3.2} />

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-display text-4xl font-semibold text-bone lg:text-5xl">
            Thank you<span className="text-muted"> · </span>
            <span className="text-verdict">Questions welcome</span>
          </p>
          <ul className="mt-6 space-y-1 font-display text-lg text-bone/85">
            {TEAM.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <Monogram className="mt-8 block text-3xl" />
        </div>
        <div className="lg:col-span-7">
          <h3 className="font-sans tabular-nums text-[13px] font-normal text-muted">References</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            {REFERENCES.map((r, i) => (
              <li key={r} className="grid grid-cols-[2rem_1fr]">
                <span className="font-sans tabular-nums text-gen">[{i + 1}]</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
