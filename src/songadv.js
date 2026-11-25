// songadv.js: the flight arrangement (A5), "Jingle Bells" as an epic adventure-game title theme.
// One call per bar adds the band under the melody: galloping strings, low brass and basses, sustained horns,
// timpani, a field snare, a bass drum, cymbals and swells. The drums BUILD UP: quiet anticipation in the intro,
// a light march that grows in the verse, the full march in the chorus, and a roll + cymbal swell before each new part.
// s.part = 'intro' | 'verse' | 'chorus'; s.big = full from the first bar. Sounds: orchestra.js.

const at3 = (b) => [b, b + 1 / 3, b + 2 / 3]; // three triplet hits from beat b

// Rolls: hits every `step` beats from `from` to `to`, getting louder (the anticipation before a new part).
function roll(ev, kind, m, from, to, step, v0, v1) {
  const n = Math.round((to - from) / step);
  for (let k = 0; k < n; k++) ev.push({ b: from + k * step, len: step, kind, m, vol: v0 + ((v1 - v0) * k) / Math.max(1, n - 1) });
}

export function adventureBar(s, bar, bars, tones, at, ev) {
  const last = bar === bars - 1;
  const root = 36 + (tones[0] % 12); // C2-B2: basses
  const third = tones[1] - tones[0];
  const fifth = root + 7;
  const half = s.big || s.part === 'chorus' || bar >= bars / 2; // the verse grows in its second half
  const pad = (v) => { for (const t of tones.slice(0, 3)) ev.push({ b: at, len: 4, kind: 'pad', m: 60 + (t % 12) - (t % 12 > 7 ? 12 : 0), vol: v }); };

  if (s.part === 'intro') { // anticipation: low strings pulse, timpani that come closer, a snare and timpani roll, a swell
    const grow = 0.45 + 0.18 * bar;
    for (let k = 0; k < 8; k++) ev.push({ b: at + k / 2, len: 0.5, kind: 'strings', m: root + 12 + (k % 2 ? 7 : 0), vol: grow * (k % 4 === 0 ? 1 : 0.75) });
    ev.push({ b: at, len: 4, kind: 'bass', m: root, vol: 0.45 + 0.1 * bar }, { b: at, len: 4, kind: 'bass', m: root - 12, vol: 0.3 + 0.07 * bar });
    pad(0.35 + 0.15 * bar);
    if (bar === 0) ev.push({ b: at, len: 2, kind: 'bdrum', vol: 0.9 }, { b: at, len: 2, kind: 'timp', m: root, vol: 0.9 });
    if (bar === 1) ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: 0.7 }, { b: at + 2, len: 2, kind: 'timp', m: root, vol: 0.8 });
    if (bar === 2) {
      ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: 0.8 }, { b: at + 2, len: 1, kind: 'timp', m: fifth - 12, vol: 0.8 });
      at3(at + 3).forEach((b, k) => ev.push({ b, len: 1 / 3, kind: 'snare', vol: 0.35 + 0.15 * k }));
    }
    if (last) {
      roll(ev, 'snare', 0, at, at + 4, 0.25, 0.15, 0.9);
      roll(ev, 'timp', root, at, at + 4, 0.5, 0.35, 1);
      ev.push({ b: at, len: 4, kind: 'swell', vol: 1 });
    }
    return;
  }

  const big = s.part === 'chorus';
  // strings: low strings gallop on the chord (da-da-da-da), violins run up the chord in the chorus
  const gallop = [0, 12, 7, 12, 0, 12, 7, 12];
  gallop.forEach((d, k) => ev.push({ b: at + k / 2, len: 0.5, kind: 'strings', m: root + 12 + d, vol: (half ? 0.85 : 0.6) * (k % 4 === 0 ? 1 : 0.7) }));
  if (big || (half && s.big)) {
    const run = [0, third, 7, 12, 7 + 12, 12, 7, third];
    run.forEach((d, k) => ev.push({ b: at + k / 2, len: 0.5, kind: 'violin', m: 60 + (tones[0] % 12) + d, vol: k % 4 === 0 ? 0.9 : 0.65 }));
  }
  // low brass and basses: root (with the octave under) on 1, the fifth on 3, a push into the next bar when big
  ev.push({ b: at, len: 2, kind: 'bass', m: root, vol: half ? 1 : 0.75 }, { b: at, len: 2, kind: 'bass', m: root - 12, vol: half ? 0.7 : 0.45 });
  ev.push({ b: at + 2, len: big ? 1.5 : 2, kind: 'bass', m: fifth > 47 ? fifth - 12 : fifth, vol: half ? 0.9 : 0.65 });
  if (big) ev.push({ b: at + 3.5, len: 0.5, kind: 'bass', m: root, vol: 0.7 });
  pad(big ? 0.9 : half ? 0.75 : 0.6);

  // percussion
  ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: half ? 0.75 : 0.55 }, { b: at, len: 2, kind: 'bdrum', vol: half ? 0.8 : 0.55 });
  if (half) ev.push({ b: at + 2, len: 2, kind: 'timp', m: fifth - 12, vol: 0.6 }, { b: at + 2, len: 2, kind: 'bdrum', vol: 0.55 });
  if (half && !last) { // the field-drum march: TAP ta TAP TAP | TAP ta da-da-da (the triplet pushes forward)
    for (const [b, v] of [[0, 0.8], [0.5, 0.3], [1, 0.55], [1.5, 0.45], [2, 0.75], [2.5, 0.3]]) ev.push({ b: at + b, len: 0.25, kind: 'snare', vol: v * (big ? 1 : 0.8) });
    at3(at + 3).forEach((b, k) => ev.push({ b, len: 1 / 3, kind: 'snare', vol: (0.4 + 0.15 * k) * (big ? 1 : 0.8) }));
  } else if (!half && bar % 2 === 1) at3(at + 3).forEach((b, k) => ev.push({ b, len: 1 / 3, kind: 'snare', vol: 0.25 + 0.12 * k })); // light: only the push
  if (bar % 4 === 0) ev.push({ b: at, len: 3, kind: 'crash', vol: bar === 0 ? (big ? 1 : 0.6) : big ? 0.7 : half && bar === bars / 2 ? 0.8 : 0.35 });
  if (big && bar % 4 === 3 && !last) roll(ev, 'snare', 0, at + 2, at + 4, 0.25, 0.3, 0.8); // a fill every 4 bars
  if (half) ev.push({ b: at + 1, len: 0.5, kind: 'sleigh', vol: 0.6 }, { b: at + 3, len: 0.5, kind: 'sleigh', vol: 0.6 }); // a little Santa shimmer
  if (!half && bar === bars / 2 - 1) roll(ev, 'snare', 0, at + 2, at + 4, 0.25, 0.2, 0.7); // the verse grows here
  if (last) { // into the next part: a roll, timpani, a cymbal swell
    roll(ev, 'snare', 0, at, at + 4, 0.25, 0.25, 1);
    roll(ev, 'timp', root, at + 2, at + 4, 0.5, 0.5, 1);
    ev.push({ b: at, len: 4, kind: 'swell', vol: 0.9 });
  }
}
