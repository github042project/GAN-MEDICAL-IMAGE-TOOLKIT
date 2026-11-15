import { centredParams, drawScan, paramsFromSeed } from './scan';

/** A procedurally drawn chest X-ray on a new canvas (never patient data). */
export function sampleScanCanvas(size = 512, seed = 3, centred = true, opacity = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  drawScan(c.getContext('2d')!, size, size, centred ? centredParams(seed, opacity) : paramsFromSeed(seed, opacity));
  return c;
}
