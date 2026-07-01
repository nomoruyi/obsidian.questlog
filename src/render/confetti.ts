import confetti from "canvas-confetti";
import { CelebrationTier, confettiPlan } from "../engine/celebration";

// Fires the confetti bursts for `tier` over a dedicated full-viewport overlay
// canvas that sits above Obsidian's modal layer. Returns a disposer that stops
// pending bursts and removes the canvas (called when the modal closes early).
export function fireConfetti(tier: CelebrationTier): () => void {
  const bursts = confettiPlan(tier);
  if (bursts.length === 0) return () => {};

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "1100", // above --layer-modal (100) and --layer-menu (1000)
  });
  document.body.appendChild(canvas);

  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  const timers: number[] = [];
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    for (const id of timers) window.clearTimeout(id);
    canvas.remove();
  };

  let remaining = bursts.length;
  for (const b of bursts) {
    timers.push(window.setTimeout(() => {
      void fire({
        particleCount: b.particleCount,
        spread: b.spread,
        startVelocity: b.startVelocity,
        angle: b.angle,
        origin: b.origin,
        colors: b.colors,
        disableForReducedMotion: true,
      });
      // After the final burst, let it animate out, then remove the canvas.
      if (--remaining === 0) timers.push(window.setTimeout(cleanup, 3000));
    }, b.delayMs));
  }

  return cleanup;
}
