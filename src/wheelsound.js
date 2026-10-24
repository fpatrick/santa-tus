// wheelsound.js: the wheel's sounds, a Christmas take on a treasure-chest opening (like Vampire Survivors):
// bell ticks, a glockenspiel run that climbs while the wheel turns, sleigh bells and a drum roll at the end,
// then a fanfare with a "Jingle Bells" bell motif. Bigger prizes (tier 1-4) = longer and louder.

import { synth } from './sound.js';

const { ok, now, tone, noise, hz, seq, kick, snare, cymbal } = synth;
const glock = (n, t, d = 0.3, v = 0.07) => { tone(hz(n), t, d, { type: 'sine', vol: v }); tone(hz(n) * 4, t, d * 0.4, { type: 'sine', vol: v * 0.2 }); };
const bells = (t, v = 0.07) => noise(t, 0.06, { vol: v, freq: 7500, type: 'highpass' });

export const wheelSfx = {
  // A tiny bell on each slice that passes the pointer.
  tick(intensity = 0.5) {
    if (!ok()) return;
    const t = now();
    tone(1900 + intensity * 700, t, 0.08, { type: 'sine', vol: 0.05 + intensity * 0.05 });
    tone((1900 + intensity * 700) * 2.76, t, 0.03, { type: 'sine', vol: 0.015 });
  },
  // The waiting loop before the click: soft sleigh bells and a twinkle.
  ready() {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 4; i++) bells(t + i * 0.12, 0.04);
    glock('G6', t, 0.4, 0.04);
  },
  // While it spins: a climbing glockenspiel run with sleigh bells. tier 3-4 add a drum roll at the end.
  spin(secs, tier) {
    if (!ok()) return;
    const t0 = now();
    const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'];
    const steps = Math.floor(secs * 7);
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      const t = t0 + secs * (1 - (1 - k) ** 0.6); // notes get further apart as the wheel slows
      glock(scale[Math.min(scale.length - 1, Math.floor(k * scale.length) + (i % 3))], t, 0.25, 0.04 + k * 0.03);
      if (i % 2 === 0) bells(t, 0.05);
    }
    tone(98, t0, secs, { type: 'triangle', vol: 0.06 + tier * 0.02, slide: 2 + tier * 0.3, attack: 0.5 });
    if (tier >= 3) for (let i = 0; i < 24; i++) snare(t0 + secs - 1.4 + i * 0.058, 0.04 + i * 0.006);
  },
  // The reveal: fanfare + "Jingle Bells" on bells, bigger for rarer prizes.
  reveal(tier) {
    if (!ok()) return;
    const t = now();
    kick(t, 0.5 + tier * 0.1);
    cymbal(t, 0.1 + tier * 0.05, 0.6 + tier * 0.4);
    for (let i = 0; i < 6 + tier * 4; i++) bells(t + i * 0.06, 0.06);
    const motif = tier >= 4 ? [['E6', 1], ['E6', 1], ['E6', 2], ['E6', 1], ['E6', 1], ['E6', 2], ['E6', 1], ['G6', 1], ['C6', 1.5], ['D6', 0.5], ['E6', 4]]
      : tier >= 2 ? [['E6', 1], ['E6', 1], ['E6', 2], ['G6', 1], ['C7', 3]] : [['C6', 1], ['E6', 1], ['G6', 2]];
    let at = t + 0.05;
    for (const [n, len] of motif) { glock(n, at, 0.5, 0.09); at += len * 0.13; }
    seq([['C4', 2], ['G4', 2], ['C5', 4]], t, 0.13, { type: 'triangle', vol: 0.12 });
    if (tier >= 3) { tone(hz('C5'), at, 1.2, { vol: 0.05, vib: 0.01 }); tone(hz('E5'), at, 1.2, { vol: 0.05 }); tone(hz('G5'), at, 1.2, { vol: 0.05 }); }
    if (tier >= 4) for (let i = 0; i < 30; i++) glock(['C7', 'E7', 'G7'][i % 3], at + 0.3 + i * 0.07, 0.2, 0.03);
  },
};
