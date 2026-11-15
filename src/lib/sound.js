// Tiny WebAudio synth for System chimes — no audio files needed.
let ctx = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.08, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  notify: () => { tone(880, 0, 0.12, { type: 'triangle' }); tone(1320, 0.09, 0.18, { type: 'triangle' }); },
  tick: () => tone(1400, 0, 0.05, { type: 'square', gain: 0.03 }),
  hover: () => tone(2200, 0, 0.03, { type: 'sine', gain: 0.015 }),
  clear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.3, { type: 'triangle', gain: 0.07 })),
  levelup: () => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.45, { type: 'sawtooth', gain: 0.035 }));
    tone(110, 0, 1.2, { type: 'sine', gain: 0.12, slide: 220 });
  },
  warn: () => { tone(330, 0, 0.18, { type: 'square', gain: 0.05 }); tone(247, 0.2, 0.3, { type: 'square', gain: 0.05 }); },
  penalty: () => {
    for (let i = 0; i < 3; i++) tone(180, i * 0.28, 0.22, { type: 'sawtooth', gain: 0.07, slide: -60 });
    tone(55, 0, 1.4, { type: 'sine', gain: 0.15 });
  },
  pass: () => { tone(660, 0, 0.1, { type: 'triangle' }); tone(990, 0.08, 0.16, { type: 'triangle' }); },
  fail: () => tone(200, 0, 0.25, { type: 'square', gain: 0.05, slide: -80 }),
  boot: () => { tone(60, 0, 1.5, { type: 'sine', gain: 0.15, slide: 500 }); tone(1760, 0.6, 0.4, { type: 'triangle', gain: 0.04 }); },
};

export function sfx(name) {
  try { SOUNDS[name]?.(); } catch { /* audio is best-effort */ }
}
