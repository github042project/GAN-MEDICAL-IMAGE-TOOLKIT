/**
 * Spreads expensive canvas draws across idle time so that many tiles
 * becoming visible together never produce one long main-thread task.
 */
type Job = () => void;

const queue: Job[] = [];
let scheduled = false;
const SLICE_MS = 8;

const schedule = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(fn, { timeout: 200 })
    : requestAnimationFrame(fn);

function flush() {
  const start = performance.now();
  while (queue.length && performance.now() - start < SLICE_MS) queue.shift()?.();
  if (queue.length) schedule(flush);
  else scheduled = false;
}

/** Queue a draw; returns a function that cancels it if it hasn't run yet. */
export function enqueueDraw(job: Job): () => void {
  queue.push(job);
  if (!scheduled) {
    scheduled = true;
    schedule(flush);
  }
  return () => {
    const i = queue.indexOf(job);
    if (i >= 0) queue.splice(i, 1);
  };
}
