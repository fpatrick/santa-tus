// sound.js: every sound is made live with Web Audio, in a chiptune style. No sound files.
// Louder and longer sounds for rarer prizes (tier 1-4). The jingle uses "Jingle Bells" (public domain, 1857).

import { CONFIG } from './config.js';

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = CONFIG.sound.muted;

export function initSound() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : CONFIG.sound.volume;
  master.connect(comp);
  comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

export function unlockSound() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}
export function soundState() { return ctx ? ctx.state : 'none'; }
export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : CONFIG.sound.volume, ctx.currentTime, 0.05);
}

const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
// 'C5', 'F#4', 'Bb3' -> frequency in Hz
export function hz(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 440;
  const s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (s / 12);
}

function ok() { return ctx && !muted && ctx.state === 'running'; }
function now() { return ctx.currentTime + 0.01; }

function tone(freq, t, dur, o = {}) {
  const { type = 'square', vol = 0.18, slide = 0, attack = 0.004, vib = 0 } = o;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  if (vib) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 6;
    lg.gain.value = freq * vib;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(t, dur, o = {}) {
  const { vol = 0.25, freq = 2000, q = 0.9, type = 'bandpass', slide = 1 } = o;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slide !== 1) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

// Plays notes one after another. notes: [['E5', 2], [null, 1], ...] in steps of `step` seconds.
function seq(notes, t0, step, o) {
  let t = t0;
  for (const [n, len] of notes) {
    if (n) tone(hz(n), t, len * step * 0.92, o);
    t += len * step;
  }
  return t;
}

function chord(names, t, dur, o) {
  for (const n of names) tone(hz(n), t, dur, o);
}

const kick = (t, v = 0.5) => tone(150, t, 0.18, { type: 'sine', vol: v, slide: 0.3 });
const snare = (t, v = 0.25) => noise(t, 0.14, { vol: v, freq: 1800, q: 0.6 });
const hat = (t, v = 0.08) => noise(t, 0.04, { vol: v, freq: 8000, type: 'highpass' });
const cymbal = (t, v = 0.3, d = 1.4) => noise(t, d, { vol: v, freq: 6000, type: 'highpass' });

export const sfx = {
  flap() { if (ok()) tone(420, now(), 0.09, { vol: 0.09, slide: 1.9 }); },
  point(level = 1) {
    if (!ok()) return;
    const t = now();
    const base = 988 * 2 ** ((level - 1) / 12);
    tone(base, t, 0.06, { vol: 0.12 });
    tone(base * 1.335, t + 0.06, 0.16, { vol: 0.12 });
  },
  level(n = 2) {
    if (!ok()) return;
    const t = now();
    const run = [['C5', 1], ['E5', 1], ['G5', 1], ['C6', 1], ['E6', 1], ['G6', 3]];
    seq(run, t, 0.07, { vol: 0.14 });
    seq([['C3', 2], ['G3', 2], ['C4', 3]], t, 0.07, { type: 'triangle', vol: 0.3 });
    for (let i = 0; i < n; i++) hat(t + 0.5 + i * 0.07, 0.12);
  },
  crash() {
    if (!ok()) return;
    const t = now();
    noise(t, 0.5, { vol: 0.5, freq: 1400, slide: 0.15, type: 'lowpass' });
    tone(320, t, 0.55, { type: 'sawtooth', vol: 0.16, slide: 0.18 });
    kick(t, 0.6);
  },
  restart() { if (ok()) seq([['C5', 1], ['G5', 1], ['C6', 2]], now(), 0.08, { vol: 0.12 }); },
  tick(intensity = 0.5) {
    if (!ok()) return;
    const t = now();
    tone(1500 + intensity * 900, t, 0.025, { vol: 0.07 + intensity * 0.06 });
    noise(t, 0.02, { vol: 0.08, freq: 5000, type: 'highpass' });
  },
  whoosh() { if (ok()) noise(now(), 0.7, { vol: 0.3, freq: 300, slide: 12, q: 1.4 }); },
  // Rising tone while the wheel slows. Higher tier = louder and higher (a hint, like opening a chest).
  build(tier, secs) {
    if (!ok()) return;
    const t = now();
    tone(110, t, secs, { type: 'triangle', vol: 0.05 + tier * 0.03, slide: 1.5 + tier * 0.5, attack: 0.4 });
    if (tier >= 3) tone(220, t + secs * 0.4, secs * 0.6, { type: 'sawtooth', vol: 0.03 * tier, slide: 2 + tier * 0.4, attack: 0.3, vib: 0.01 });
  },
  coin(i = 0) { if (ok()) { const t = now() + i * 0.045; tone(1319 + (i % 5) * 120, t, 0.05, { vol: 0.08 }); tone(1976 + (i % 5) * 120, t + 0.05, 0.12, { vol: 0.08 }); } },
  ticket(count = 1) {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < Math.min(count, 8); i++) {
      noise(t + i * 0.09, 0.05, { vol: 0.12, freq: 3200 });
      tone(1568, t + i * 0.09 + 0.04, 0.08, { vol: 0.09 });
    }
  },
  reveal(tier) { if (ok()) fanfare(tier); },
  milestone(tier) { if (ok()) fanfare(tier); },
  key() { if (ok()) tone(880, now(), 0.04, { vol: 0.06 }); },
  error() { if (ok()) tone(110, now(), 0.25, { type: 'sawtooth', vol: 0.15 }); },
  confirm() { if (ok()) seq([['G5', 1], ['C6', 2]], now(), 0.07, { vol: 0.12 }); },
  drawRoll(secs) {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < secs * 14; i++) snare(t + i / 14, 0.06 + (0.18 * i) / (secs * 14));
  },
  jingle() {
    if (!ok()) return;
    const t = now();
    const step = 0.12;
    const mel = [['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['G5', 2], ['C5', 3], ['D5', 1], ['E5', 6], [null, 2]];
    const end = seq(mel, t, step, { vol: 0.13 });
    seq(mel.map(([n, l]) => [n && n.replace('5', '6'), l]), t, step, { vol: 0.04, type: 'triangle' });
    seq([['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4]], t, step, { type: 'triangle', vol: 0.28 });
    for (let i = 0; i < 32; i++) (i % 4 === 0 ? kick : hat)(t + i * step, i % 4 === 0 ? 0.3 : 0.06);
    chord(['C5', 'E5', 'G5', 'C6'], end - step * 2, 0.6, { vol: 0.07 });
  },
};

// Fanfares grow with the tier: 1 short, 2 + coins, 3 + drums and chord, 4 drum roll, stabs, long chord, coin rain.
function fanfare(tier) {
  let t = now();
  if (tier >= 4) {
    for (let i = 0; i < 16; i++) snare(t + i * 0.04, 0.08 + i * 0.012);
    t += 0.66;
    cymbal(t, 0.35, 2.2);
    kick(t, 0.8);
    for (let i = 0; i < 3; i++) chord(['C4', 'G4', 'C5', 'E5'], t + i * 0.16, 0.12, { vol: 0.08, type: 'sawtooth' });
    t += 0.5;
  }
  const step = tier >= 3 ? 0.075 : 0.06;
  const run = tier === 1 ? ['C5', 'E5', 'G5'] : tier === 2 ? ['C5', 'E5', 'G5', 'C6'] : ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'];
  const end = seq(run.map((n) => [n, 1]), t, step, { vol: 0.12 });
  if (tier >= 2) for (let i = 0; i < tier * 4; i++) sfx.coin(i + run.length);
  if (tier >= 3) {
    kick(end, 0.6);
    cymbal(end, 0.18, 1);
    chord(['C5', 'E5', 'G5', 'C6'], end, tier >= 4 ? 2.2 : 1.1, { vol: 0.07, vib: 0.008 });
    chord(['C3', 'C4'], end, tier >= 4 ? 2.2 : 1.1, { type: 'triangle', vol: 0.25 });
  } else {
    tone(hz(run[run.length - 1]), end, 0.3, { vol: 0.1 });
  }
  if (tier >= 4) {
    const t2 = end + 0.4;
    seq([['G5', 1], ['C6', 1], ['E6', 1], ['G6', 1], ['C7', 4]], t2, 0.09, { vol: 0.1, type: 'square' });
    for (let i = 0; i < 24; i++) sfx.coin(i + 30);
  }
}
