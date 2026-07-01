import { SfxNote } from "../engine/celebration";

// Plays `notes` back-to-back as triangle-wave tones with a short attack/decay
// envelope (avoids clicks). Returns a disposer that stops the tones and closes
// the AudioContext early (called when the modal closes before the sound ends).
export function playSfx(notes: SfxNote[]): () => void {
  if (notes.length === 0) return () => {};

  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return () => {};
  const ctx = new Ctx();

  const oscillators: OscillatorNode[] = [];
  const start = ctx.currentTime;
  let t = start;
  for (const note of notes) {
    const dur = note.durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = note.freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
    gain.gain.setValueAtTime(0.2, Math.max(t + 0.01, t + dur - 0.03));
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    oscillators.push(osc);
    t += dur;
  }

  const closeTimer = window.setTimeout(() => { void ctx.close(); }, (t - start) * 1000 + 100);

  return () => {
    window.clearTimeout(closeTimer);
    for (const osc of oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    if (ctx.state !== "closed") void ctx.close();
  };
}
