# GAN Medical Imaging Toolkit

Free, in-browser tools for working with medical images, built around the ideas of Generative Adversarial
Networks for our Machine Learning topic seminar ("GAN-Based Medical Image Augmentation").

**Team:** Mohammed Mishal C · Garvita Varshney · Durga Prasad Patra

Built with Vite, React, TypeScript, Tailwind CSS and Framer Motion. There is no backend: images are processed
in the browser and never uploaded, every illustration is drawn in code, and fonts are self-hosted, so the site
works **fully offline**.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build and local preview (use this on the projector laptop):

```bash
npm run build
npm run preview    # http://localhost:4173
```

## Sign in

The site opens on a login page (animated DNA-helix background, scanner-style cursor). Visitors can create an
account, sign in, or continue as a guest. This is a **prototype with no server**: accounts are stored in that
browser only (passwords are never stored, only a salted PBKDF2 hash), so it personalises the toolkit but does not
protect anything. Sign out from the avatar menu in the top bar.

## Tools

| Page (link)            | What it does                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Augment (`/#lab`)      | Turn one image into an augmented set (presets, rotation, zoom, tone, noise…). ZIP with params.csv. |
| Doctor (`/#doctor`)    | Drop a folder: finds near-duplicates, unusual sizes, bad exposure, unreadable files, class balance. Exports a cleaned ZIP sorted by class, plus a CSV report. Has a demo dataset with planted problems. |
| Viewer (`/#viewer`)    | Zoom/pan, brightness centre and contrast range, equalise, sharpen, invert, colour maps, histogram, ruler (px or mm). Save PNG. |
| Balance (`/#balance`)  | Class counts → imbalance, the "always guess majority" accuracy trap, synthetic images needed, a real-only val/test split, and class weights as PyTorch / Keras / scikit-learn code. |
| Studio (`/#studio`)   | Design synthetic chest X-rays with sliders, morph between two scans (latent-space style), save a gallery, download, or send to the Lab. |
| Playground (`/#playground`) | A real tiny GAN (G: 2→32→32→2, D: 2→32→32→1, Adam) trained live on 2-D shapes; D heat-map, loss chart, speed and learning-rate controls. |
| Game (`/#game`)        | Spot the Fake: 10 timed rounds of picking the generated scan; streaks, explanations, best score. |
| Learn (`/#learn`)      | The three seminar demos: oversampling vs GAN divider, minimax explorer, the Duel training simulation. |

Settings, best score and class counts are remembered in the browser. The Doctor can hand its class counts to the
Balance Planner. The Viewer and Doctor are not diagnostic tools.

## Presenting

| Key                                     | Action                                                   |
| --------------------------------------- | -------------------------------------------------------- |
| `P`                                     | Toggle Presentation Mode (header hides, ← → bar appears) |
| `→` `↓` `PageDown` `Space`              | Next section, then the next page                         |
| `←` `↑` `PageUp` `Shift+Space`          | Previous section, then the previous page                 |
| `Home` / `End`                          | First / last page                                        |
| `F`                                     | Toggle fullscreen                                        |
| `Esc`                                   | Leave Presentation Mode                                  |

Arrow keys are left to sliders when one is focused. Tested at 1920×1080, 1366×768 and 375px wide.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, **Add New → Project**, import the repo. The Vite preset is detected automatically
   (build command `npm run build`, output directory `dist`).
3. Deploy.

Or from the command line: `npx vercel` and accept the defaults, then `npx vercel --prod`.

## Project structure

```
src/
  components/
    sections/   Home page hero
    viz/        Interactive visuals: NoiseToScan, DuelVisualizer, MinimaxExplorer,
                OversampleCompare, ScanTile, OrganBackdrop (3D lungs)
    ui/         Shared building blocks (Section, FilmCard, Button, Monogram, PulseLine, Tex)
    Nav.tsx     Top menu, mobile menu, progress bar, presenter controls
  pages/        One file per page: Home, Lab, Doctor, Viewer, Balance, Game, Learn
  lib/
    theme.ts         Design tokens (colours, fonts) and the section registry
    scan.ts          Procedural chest X-ray renderer (seeded, no real patient data)
    router.ts        Page list and #hash routing
    presentation.tsx Presentation Mode state and keyboard navigation
    hooks.ts         In-view, page-visibility and rAF helpers
    augment.ts       Augmentation maths for the Lab
    zip.ts           Minimal ZIP writer used for downloads
archive/        Content from the original seminar version (not built)
```

## Notes

- The Duel visualiser is a **conceptual simulation**, not real training output.
- All scans are procedurally drawn illustrations, not patient images.
- Animations respect `prefers-reduced-motion`; canvases pause when off-screen or when the tab is hidden.
