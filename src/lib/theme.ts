/**
 * Single source of truth for design tokens. Tailwind's theme and the
 * CSS custom properties on :root are both generated from these values.
 */
export const colors = {
  bg: '#07090D',
  surface: '#0E131B',
  line: '#1C2533',
  bone: '#E8E4DA',
  muted: '#8A94A6',
  gen: '#FF8A3D',
  'gen-glow': '#FFB86B',
  disc: '#3DD6F5',
  'disc-glow': '#9BEAFF',
  verdict: '#C6F36B',
} as const;

export const fonts = {
  brand: ['Unbounded', '"Space Grotesk"', 'system-ui', 'sans-serif'],
  display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
};

/** RGB triplets used by canvas renderers. */
export const rgb = {
  bg: [7, 9, 13],
  bone: [232, 228, 218],
} as const;

export const SECTIONS = [
  { id: 'intro', label: 'Toolkit' },
  { id: 'tools', label: 'Tools' },
  { id: 'idea', label: 'The idea' },
  { id: 'lab', label: 'Augmentation Lab' },
  { id: 'doctor', label: 'Dataset Doctor' },
  { id: 'viewer', label: 'Scan Viewer' },
  { id: 'balance', label: 'Balance Planner' },
  { id: 'game', label: 'Spot the Fake' },
  { id: 'studio', label: 'Synthetic Scan Studio' },
  { id: 'playground', label: 'Live GAN Playground' },
  { id: 'why', label: 'Why GANs' },
  { id: 'objective', label: 'The objective' },
  { id: 'duel', label: 'The Duel' },
  { id: 'credits', label: 'Team & references' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export const TEAM = ['Mohammed Mishal C', 'Garvita Varshney', 'Durga Prasad Patra'];
