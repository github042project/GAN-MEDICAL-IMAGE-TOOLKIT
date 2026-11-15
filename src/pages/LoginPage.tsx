import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-700.css';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, type FormEvent, type ReactNode } from 'react';
import { HelixScene } from '../components/login/HelixScene';
import { ReticleCursor } from '../components/login/ReticleCursor';
import { Monogram } from '../components/ui/Monogram';
import { continueAsGuest, signIn, signUp } from '../lib/auth';

const TOOLS = ['Augmentation Lab', 'Dataset Doctor', 'Scan Viewer', 'Balance Planner', 'Spot the Fake'];

type Mode = 'signin' | 'signup';

function Field(props: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete: string; trailing?: ReactNode }) {
  const { id, label, type = 'text', value, onChange, autoComplete, trailing } = props;
  return (
    <div className="login-field">
      <input id={id} type={type} value={value} placeholder=" " autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} required />
      <label htmlFor={id}>{label}</label>
      {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  // The card tilts gently toward the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, [-1, 1], [-7, 7]), { stiffness: 120, damping: 18 });
  const rotX = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 120, damping: 18 });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-bg"
      onPointerMove={(e) => {
        mx.set((e.clientX / window.innerWidth) * 2 - 1);
        my.set((e.clientY / window.innerHeight) * 2 - 1);
      }}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,138,61,0.12),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(61,214,245,0.12),transparent_55%)]" />
      <HelixScene />
      <ReticleCursor />

      <header className="relative z-10 mx-auto flex max-w-page items-center gap-3 px-5 pt-6 sm:px-10">
        <Monogram className="text-2xl" />
        <span className="font-brand text-sm font-medium tracking-wide text-bone">GAN Medical Imaging Toolkit</span>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-page grid-cols-1 items-center gap-8 px-5 py-8 sm:gap-12 sm:py-10 sm:px-10 lg:grid-cols-12">
        {/* Pitch */}
        <motion.section
          className="lg:col-span-6 xl:col-span-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-bg/60 px-3 py-1.5 text-xs text-muted backdrop-blur sm:text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-verdict shadow-[0_0_10px_rgba(198,243,107,0.9)]" />
            Free · runs in your browser · nothing uploaded
          </p>
          <h1 className="mt-7 font-brand text-[clamp(2.4rem,6vw,5.4rem)] font-bold leading-[1.02] tracking-tight text-bone">
            Make every
            <br />
            <span className="login-gradient">scan count.</span>
          </h1>
          <p className="mt-7 hidden max-w-lg text-lg leading-relaxed text-bone/75 sm:block">
            Stretch, clean, inspect and balance scarce medical images with tools built on the ideas behind Generative
            Adversarial Networks. Then see if you can beat the Discriminator.
          </p>
          <ul className="mt-8 hidden max-w-xl flex-wrap gap-2 sm:flex">
            {TOOLS.map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="rounded-full border border-line bg-bg/60 px-3.5 py-1.5 text-sm text-bone/85 backdrop-blur"
              >
                {t}
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Card */}
        <div className="lg:col-span-6 xl:col-span-5" style={{ perspective: 1200 }}>
          <motion.div
            className="login-card mx-auto w-full max-w-md p-7 sm:p-9"
            style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <h2 className="font-brand text-2xl font-medium text-bone">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mt-2 text-sm text-muted">{mode === 'signin' ? 'Sign in to pick up where you left off.' : 'It takes ten seconds. No email is sent.'}</p>

            <div className="relative mt-7 grid grid-cols-2 rounded-xl border border-line bg-bg/60 p-1" role="tablist" aria-label="Sign in or create account">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`relative z-10 rounded-lg py-2 text-sm font-medium transition-colors ${mode === m ? 'text-bg' : 'text-muted hover:text-bone'}`}
                >
                  {mode === m && (
                    <motion.span layoutId="login-tab" className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-gen-glow to-disc" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                  )}
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <motion.form key={shake} onSubmit={(e) => void submit(e)} className="mt-6 space-y-4" animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} noValidate>
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <Field id="login-name" label="Your name" value={name} onChange={setName} autoComplete="name" />
                  </motion.div>
                )}
              </AnimatePresence>
              <Field id="login-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field
                id="login-password"
                label="Password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                trailing={
                  <button type="button" onClick={() => setShow((s) => !s)} className="rounded-md px-2 py-1 text-xs text-muted hover:text-bone" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? 'Hide' : 'Show'}
                  </button>
                }
              />

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-lg border border-gen/50 bg-gen/10 px-3 py-2 text-sm text-gen-glow">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" disabled={busy} className="login-submit flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-brand text-sm font-medium text-bg disabled:opacity-70">
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </motion.form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={continueAsGuest}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-bg/50 py-3 text-sm text-bone transition-all hover:border-disc hover:shadow-[0_0_24px_-8px_rgba(61,214,245,0.7)]"
            >
              Continue as guest
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted">
              Prototype: accounts are saved in this browser only and never sent anywhere. Please don’t reuse a real
              password.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
