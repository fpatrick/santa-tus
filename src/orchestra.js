// orchestra.js: the chip orchestra for the flight song (A5). Still 16-bit game sound (simple waves, made
// in the browser, no files), but shaped like an orchestra: brass with a bright "blat" that opens up, bowed
// strings, sustained horns, low brass and basses, tuned timpani, a field snare, a big bass drum, cymbals,
// a reverse cymbal swell, a glockenspiel and a little sleigh-bell shimmer. Everything goes through a small
// hall echo so it sounds big. music.js sends the 'adventure' events here.

import { freq } from './songs.js';

const halls = new WeakMap(); // one mixer (dry + hall echo) per song output

function hallFor(a, out) {
  if (halls.has(out)) return halls.get(out);
  const ctx = a.ctx;
  const mix = ctx.createGain();
  const send = ctx.createGain();
  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; // a soft hall tail
  }
  conv.buffer = ir;
  send.gain.value = 0.22;
  mix.connect(out);
  mix.connect(send);
  send.connect(conv);
  conv.connect(out);
  halls.set(out, mix);
  return mix;
}

// attack / hold / release envelope on a new gain node
function amp(a, t, atk, dur, rel, vol, out) {
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + atk);
  g.gain.setValueAtTime(vol, t + Math.max(atk + 0.001, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  g.connect(out);
  return g;
}

function lowpass(a, hz, q, out) {
  const f = a.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = hz;
  f.Q.value = q;
  f.connect(out);
  return f;
}

// detuned oscillators (cents) into a node, with optional vibrato after `vibAt` seconds
function oscs(a, type, f, cents, t, end, into, vib = 0, vibAt = 0.25) {
  for (const c of cents) {
    const o = a.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * 2 ** (c / 1200);
    if (vib && end - t > vibAt + 0.1) {
      const lfo = a.ctx.createOscillator();
      const depth = a.ctx.createGain();
      lfo.frequency.value = 5.3;
      depth.gain.setValueAtTime(0, t + vibAt);
      depth.gain.linearRampToValueAtTime(f * vib, t + vibAt + 0.25);
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(t);
      lfo.stop(end);
    }
    o.connect(into);
    o.start(t);
    o.stop(end);
  }
}

// Brass (trumpets, horns, trombones): the tone starts dark and a little flat, then opens bright ("blat").
function brass(a, m, t, dur, vol, out, bright = 5) {
  const f = freq(m);
  const g = amp(a, t, 0.03, dur, 0.09, vol, out);
  const lp = lowpass(a, f * 1.2, 1.4, g);
  lp.frequency.setValueAtTime(f * 1.2, t);
  lp.frequency.exponentialRampToValueAtTime(Math.min(14000, f * bright * 1.4), t + 0.05);
  lp.frequency.exponentialRampToValueAtTime(Math.min(12000, f * bright), t + 0.22);
  oscs(a, 'sawtooth', f, [-7, 6], t, t + dur + 0.12, lp, 0.007);
}

// Bowed strings: short and accented for the gallop, a little softer and rounder for the violins.
function strings(a, m, t, dur, vol, out, hz) {
  const f = freq(m);
  const g = amp(a, t, 0.012, dur * 0.8, 0.06, vol, out);
  oscs(a, 'sawtooth', f, [-9, 0, 8], t, t + dur + 0.08, lowpass(a, hz, 0.7, g));
}

// Sustained horns under everything: a slow swell, warm and soft.
function horns(a, m, t, dur, vol, out) {
  const f = freq(m);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.35, dur * 0.4));
  g.gain.setValueAtTime(vol, t + Math.max(0.36, dur * 0.85));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
  g.connect(out);
  oscs(a, 'sawtooth', f, [-5, 5], t, t + dur + 0.35, lowpass(a, Math.min(1400, f * 3), 0.5, g));
}

// Low brass and basses: a sawtooth for the bite plus a sine for the weight.
function bass(a, m, t, dur, vol, out) {
  const f = freq(m);
  const g = amp(a, t, 0.02, dur * 0.9, 0.12, vol, out);
  oscs(a, 'sawtooth', f, [-4, 4], t, t + dur + 0.15, lowpass(a, 520, 0.9, g));
  const s = amp(a, t, 0.02, dur * 0.9, 0.12, vol * 0.9, out);
  oscs(a, 'sine', f, [0], t, t + dur + 0.15, s);
}

function noise(a, t, dur, vol, out, type, hz, q = 0.7) {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noiseBuf;
  const f = a.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
  return g;
}

// Timpani: a tuned boom (the pitch settles), a soft 1.5x overtone and the felt-mallet thump.
function timp(a, m, t, vol, out) {
  const f = freq(m);
  for (const [mult, lv, len] of [[1, 1, 1.5], [1.5, 0.35, 0.7], [2, 0.15, 0.5]]) {
    const o = a.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mult * 1.05, t);
    o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.06);
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(vol * lv, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + len + 0.02);
  }
  noise(a, t, 0.08, vol * 0.3, out, 'lowpass', 500);
}

// Big orchestral bass drum: a deep, long boom.
function bdrum(a, t, vol, out) {
  const o = a.ctx.createOscillator();
  o.frequency.setValueAtTime(75, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.95);
  noise(a, t, 0.1, vol * 0.25, out, 'lowpass', 180);
}

// Field snare: the drum skin (a short tone) plus the rattling snares (bright noise).
function snare(a, t, vol, out) {
  noise(a, t, 0.13, vol, out, 'bandpass', 3200, 0.6);
  noise(a, t, 0.06, vol * 0.5, out, 'highpass', 6500);
  const o = a.ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(170, t + 0.05);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol * 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.08);
}

// Reverse cymbal: rises from nothing to the next downbeat (the "here it comes" feeling).
function swell(a, t, dur, vol, out) {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noiseBuf;
  src.loop = true;
  const f = a.ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.setValueAtTime(9000, t);
  f.frequency.exponentialRampToValueAtTime(3500, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// Glockenspiel: a pure, bright bell.
function glock(a, m, t, vol, out) {
  for (const [mult, lv, len] of [[1, 1, 1.2], [2.76, 0.25, 0.4]]) {
    const o = a.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(m) * mult;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * lv, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + len + 0.02);
  }
}

// One event of the flight song. Volumes: the brass melody on top, the band under it, the drums driving.
export function playOrchestra(a, ev, t, dur, out) {
  const v = (ev.vol || 1) * 1.25; // the whole orchestra: as loud as the old flight song
  const o = hallFor(a, out);
  switch (ev.kind) {
    case 'lead': return brass(a, ev.m, t, dur * 0.94, 0.17 * v, o, 6); // trumpets and horns: the tune
    case 'lead2': return brass(a, ev.m, t, dur * 0.92, 0.07 * v, o, 4); // trumpets an octave up (the chorus)
    case 'harm': return brass(a, ev.m, t, dur * 0.94, 0.06 * v, o, 3); // horns in harmony
    case 'pad': return horns(a, ev.m, t, dur, 0.011 * v, o);
    case 'bass': return bass(a, ev.m, t, dur, 0.055 * v, o);
    case 'strings': return strings(a, ev.m, t, dur, 0.065 * v, o, 2400);
    case 'violin': return strings(a, ev.m, t, dur, 0.032 * v, o, 4200);
    case 'counter': return glock(a, ev.m, t, 0.045 * v, o);
    case 'timp': return timp(a, ev.m, t, 0.32 * v, o);
    case 'bdrum': return bdrum(a, t, 0.45 * v, o);
    case 'snare': return snare(a, t, 0.13 * v, o);
    case 'crash': return noise(a, t, 2.2, 0.075 * v, o, 'highpass', 5500);
    case 'swell': return swell(a, t, dur, 0.09 * v, o);
    case 'sleigh': return noise(a, t, 0.06, 0.025 * v, o, 'highpass', 8500);
    default: return null;
  }
}
