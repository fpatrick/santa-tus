// wheelsound.js: the wheel sounds like a Christmas jackpot machine. Pulling the lever goes "ka-chunk",
// the wheel clatters fast over its pegs, a fast chiptune "Jingle Bells" with sleigh bells plays while it
// spins, a drum roll builds as it slows down, then a payout: a shower of coin dings, bells and a fanfare.
// Bigger prizes (tier 1-4) = longer and louder payouts. Timing numbers live in CONFIG.wheel.sound.

import { synth } from './sound.js';
import { CONFIG } from './config.js';

const { ok, now, tone, noise, hz, kick, snare, cymbal } = synth;
const glock = (n, t, d = 0.3, v = 0.07) => { tone(hz(n), t, d, { type: 'sine', vol: v }); tone(hz(n) * 4, t, d * 0.4, { type: 'sine', vol: v * 0.2 }); };
const bells = (t, v = 0.07) => noise(t, 0.05, { vol: v, freq: 8000, type: 'highpass' });
const coinDing = (t, v = 0.05) => { tone(hz('B6'), t, 0.05, { type: 'square', vol: v }); tone(hz('E7'), t + 0.05, 0.18, { type: 'square', vol: v }); };

// "Jingle Bells" chorus, 8 bars, in eighth notes: [note, eighths].
const JINGLE = [
  ['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['G5', 2], ['C5', 3], ['D5', 1], ['E5', 8],
  ['F5', 2], ['F5', 2], ['F5', 3], ['F5', 1], ['F5', 2], ['E5', 2], ['E5', 2], ['E5', 1], ['E5', 1], ['G5', 2], ['G5', 2], ['F5', 2], ['D5', 2], ['C5', 8],
];
const BASS = ['C3', 'G3', 'C3', 'G3', 'F3', 'C3', 'G3', 'C3'];

export const wheelSfx = {
  // The lever is pulled: a heavy mechanical "ka-chunk" and a ratchet.
  pull() {
    if (!ok()) return;
    const t = now();
    noise(t, 0.08, { vol: 0.3, freq: 600 });
    kick(t + 0.02, 0.6);
    for (let i = 0; i < 5; i++) noise(t + 0.05 + i * 0.025, 0.015, { vol: 0.12, freq: 3200 });
    noise(t + 0.2, 0.1, { vol: 0.25, freq: 400 });
    tone(hz('C6'), t + 0.22, 0.12, { type: 'square', vol: 0.05 });
    tone(hz('G6'), t + 0.28, 0.2, { type: 'square', vol: 0.05 });
  },
  // A peg passes the pointer: a short click with a tiny bell (many per second at full speed).
  tick(intensity = 0.5) {
    if (!ok()) return;
    const t = now();
    noise(t, 0.012, { vol: 0.06 + intensity * 0.06, freq: 2600 + intensity * 1500, q: 2 });
    tone(2400 + intensity * 900, t, 0.03, { type: 'sine', vol: 0.025 + intensity * 0.02 });
  },
  // The waiting loop before the click: sleigh bells and a slot-machine "attract" twinkle.
  ready() {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 6; i++) bells(t + i * 0.08, 0.035);
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone(hz(n), t + i * 0.06, 0.08, { type: 'square', vol: 0.025 }));
  },
  // While it spins: fast "Jingle Bells" chiptune with sleigh bells and bass, then a drum roll to the stop.
  spin(secs, tier) {
    if (!ok()) return;
    const S = CONFIG.wheel.sound;
    const t0 = now();
    const step = S.eighth; // seconds per eighth note
    let t = t0;
    let k = 0;
    const musicEnd = t0 + secs - S.rollSecs;
    for (const [n, len] of JINGLE) {
      if (t >= musicEnd) break;
      tone(hz(n), t, len * step * 0.85, { type: 'square', vol: 0.06 });
      tone(hz(n) * 2, t, len * step * 0.5, { type: 'sine', vol: 0.03 }); // bell sparkle on top
      t += len * step;
    }
    for (let b = t0; b < musicEnd; b += step * 2, k++) {
      bells(b, k % 2 ? 0.035 : 0.06); // sleigh bells on every beat
      if (k % 2 === 0) tone(hz(BASS[(k / 2) % BASS.length]), b, step * 1.6, { type: 'triangle', vol: 0.1 });
    }
    // drum roll that speeds up and grows to the stop (louder for bigger prizes)
    const rollAt = musicEnd;
    let r = rollAt;
    for (let i = 0; r < t0 + secs; i++) {
      const p = (r - rollAt) / S.rollSecs;
      snare(r, 0.04 + p * (0.05 + tier * 0.02));
      r += 0.09 - p * 0.05;
    }
    tone(hz('G3'), rollAt, S.rollSecs, { type: 'sawtooth', vol: 0.03 + tier * 0.01, slide: 2 }); // rising tension
  },
  // The payout: coin dings pour out, bells ring, and a fanfare. tier 3-4 also ring the jackpot bell.
  reveal(tier) {
    if (!ok()) return;
    const S = CONFIG.wheel.sound;
    const t = now();
    kick(t, 0.5 + tier * 0.1);
    cymbal(t, 0.1 + tier * 0.05, 0.6 + tier * 0.4);
    const coins = S.coins[tier] || 10;
    for (let i = 0; i < coins; i++) coinDing(t + 0.1 + i * S.coinGap, 0.035 + Math.random() * 0.02);
    for (let i = 0; i < 6 + tier * 4; i++) bells(t + i * 0.06, 0.06);
    const motif = tier >= 4 ? [['E6', 1], ['E6', 1], ['E6', 2], ['E6', 1], ['E6', 1], ['E6', 2], ['E6', 1], ['G6', 1], ['C6', 1.5], ['D6', 0.5], ['E6', 4]]
      : tier >= 2 ? [['E6', 1], ['E6', 1], ['E6', 2], ['G6', 1], ['C7', 3]] : [['C6', 1], ['E6', 1], ['G6', 2]];
    let at = t + 0.05;
    for (const [n, len] of motif) { glock(n, at, 0.5, 0.09); at += len * 0.11; }
    [['C4', 2], ['G4', 2], ['C5', 4]].reduce((tt, [n, len]) => { tone(hz(n), tt, len * 0.1, { type: 'triangle', vol: 0.12 }); return tt + len * 0.11; }, t);
    if (tier >= 3) { // the jackpot bell: a fast ringing alarm
      for (let i = 0; i < (tier >= 4 ? 40 : 16); i++) tone(i % 2 ? 1568 : 1760, at + i * 0.045, 0.04, { type: 'square', vol: 0.035 });
      tone(hz('C5'), at, 1.2, { vol: 0.05, vib: 0.01 }); tone(hz('E5'), at, 1.2, { vol: 0.05 }); tone(hz('G5'), at, 1.2, { vol: 0.05 });
    }
  },
};
