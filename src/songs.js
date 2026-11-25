// songs.js: the music as data, plus pure helpers (no sound here, so the tests can check it).
// Both songs are public domain: "Jingle Bells" (J. L. Pierpont, 1857), "Silent Night" (F. X. Gruber, 1818).
// Melody format: "NOTE BEATS" pairs, "R" = rest, "|" = bar line (ignored). One beat = one quarter note.
// chords: one chord per bar. arr = how the band plays it (music.js reads these names).

import { FLIGHT, LOBBY, MENU, CRASH } from './songdata.js';

export { FLIGHT, LOBBY, MENU, CRASH };

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 'C5' -> 72 (MIDI number). null for a rest.
export function midi(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const freq = (m) => 440 * 2 ** ((m - 69) / 12);

export function parseNotes(text) {
  const tok = text.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  const num = (t) => (t.includes('/') ? Number(t.split('/')[0]) / Number(t.split('/')[1]) : Number(t)); // "1/3" = a triplet
  for (let i = 0; i + 1 < tok.length; i += 2) out.push({ note: tok[i], beats: num(tok[i + 1]) });
  return out;
}

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9] };
// 'G7' -> semitones above C: [7, 11, 14, 17]
export function chordTones(name) {
  const m = /^([A-G])([#b]?)(maj7|m7|m|7|6)?$/.exec(name);
  const root = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return QUALITY[m[3] || ''].map((s) => root + s);
}

// Every sound of one part, in beats from its start: { b, len, kind, m (MIDI), accent }.
export function sectionEvents(s) {
  const ev = [];
  let b = 0;
  const lead = s.up + (s.oct || 0); // oct = the melody only, an octave up (bass and chords stay)
  const vel = s.vel || 1; // piano: how hard this part is played
  const chordAt = (beat) => chordTones(s.chords.split(/\s+/)[Math.min(s.chords.split(/\s+/).length - 1, Math.floor(beat / s.beatsPerBar))]).map((t) => t + s.up);
  for (const { note, beats } of parseNotes(s.melody)) {
    const m = midi(note);
    if (m != null) {
      ev.push({ b, len: beats, kind: 'lead', m: m + lead, vol: vel });
      if (s.double) ev.push({ b, len: beats, kind: 'lead2', m: m + lead + 12, vol: vel });
      if (s.harm && beats >= 0.5) { // piano harmony: the nearest chord note 3 to 9 semitones under the melody
        const tones = chordAt(b);
        let best = null;
        for (let x = m + lead - 9; x <= m + lead - 3; x++) if (tones.some((t) => (x - t) % 12 === 0) && (best == null || Math.abs(x - (m + lead - 4)) < Math.abs(best - (m + lead - 4)))) best = x;
        if (best != null) ev.push({ b, len: beats, kind: 'harm', m: best, vol: vel });
      }
    }
    b += beats;
  }
  b = 0;
  for (const { note, beats } of s.counter ? parseNotes(s.counter) : []) { // bell fills between the melody notes
    const m = midi(note);
    if (m != null) ev.push({ b, len: beats, kind: 'counter', m: m + s.up, vol: s.vel || 1 });
    b += beats;
  }
  const bpb = s.beatsPerBar;
  const bars = s.chords.split(/\s+/);
  bars.forEach((name, bar) => {
    const tones = chordTones(name).map((t) => t + s.up);
    const at = bar * bpb;
    if (s.bass === 'hero') { // low brass and cellos: root (with the octave under) on 1, the fifth on 3
      const root = 36 + (tones[0] % 12);
      ev.push({ b: at, len: 2, kind: 'bass', m: root, vol: vel }, { b: at, len: 2, kind: 'bass', m: root - 12, vol: vel * 0.6 });
      ev.push({ b: at + 2, len: 2, kind: 'bass', m: root + 7 - (root + 7 > 47 ? 12 : 0), vol: vel * 0.85 });
    } else if (s.bass === 'harp' || s.bass === 'harpbig') { // RPG harp: a rising sweep each bar (big: up and down, twice as fast)
      const root = 36 + (tones[0] % 12);
      const third = tones[1] - tones[0];
      const up = [0, 7, 12, 12 + third, 19, 24];
      const shape = s.bass === 'harpbig' ? [...up, 24 + third, 24, 19, 12 + third, 12, 7] : up;
      const step = bpb / shape.length;
      ev.push({ b: at, len: bpb, kind: 'bass', m: root, vol: vel });
      shape.forEach((d, k) => { if (k) ev.push({ b: at + k * step, len: step * 2, kind: 'arp', m: root + d, vol: vel * (k % 2 ? 0.6 : 0.75) }); });
    } else if (s.bass === 'flow' || s.bass === 'flowbig') { // piano left hand: a rolling broken chord, 6 eighths a bar
      const root = 36 + (tones[0] % 12);
      const third = tones[1] - tones[0];
      const shape = s.bass === 'flowbig' ? [0, 7, 12, 12 + third, 19, 24] : [0, 7, 12, 12 + third, 12, 7];
      ev.push({ b: at, len: bpb, kind: 'bass', m: root, vol: vel });
      if (s.bass === 'flowbig') ev.push({ b: at, len: bpb, kind: 'bass', m: root - 12, vol: vel * 0.7 });
      shape.slice(1).forEach((d, k) => ev.push({ b: at + (k + 1) / 2, len: 0.9, kind: 'arp', m: root + d, vol: vel * (k % 2 ? 0.55 : 0.7) }));
    } else if (s.bass === 'pump') { // dance: root on every eighth, jumping between two octaves
      for (let k = 0; k < bpb * 2; k++) ev.push({ b: at + k / 2, len: 0.45, kind: 'bass', m: 36 + (tones[0] % 12) + (k % 2 ? 12 : 0), vol: k % 2 ? 0.55 : 0.8 });
    } else if (s.bass === 'waltz') {
      ev.push({ b: at, len: 2.5, kind: 'bass', m: 36 + tones[0] });
      ev.push({ b: at + 1, len: 1, kind: 'arp', m: 60 + tones[1] }, { b: at + 2, len: 1, kind: 'arp', m: 60 + tones[2] });
    } else {
      const vol = s.bass === 'soft' ? 0.6 : 1;
      ev.push({ b: at, len: 1, kind: 'bass', m: 36 + (tones[0] % 12), vol }, { b: at + 2, len: 1, kind: 'bass', m: 36 + (tones[2] % 12), vol });
      if (s.bass === 'oompah') ev.push({ b: at + 1, len: 0.5, kind: 'arp', m: 60 + tones[1] }, { b: at + 3, len: 0.5, kind: 'arp', m: 60 + tones[2] });
    }
    if (s.pad) for (const t of tones.slice(0, 3)) ev.push({ b: at, len: bpb, kind: 'pad', m: 60 + t, vol: vel }); // soft strings
    if (s.arp16) { // 16th-note sparkle: up and down the chord, an octave above the melody
      const run = [0, 1, 2, 3, 2, 1].map((i) => (i < tones.length ? tones[i] : tones[0] + 12));
      for (let k = 0; k < bpb * 4; k++) ev.push({ b: at + k / 4, len: 0.25, kind: 'arp', m: 72 + run[k % run.length], vol: 0.5 });
    }
    if (s.arp) for (let k = 0; k < bpb * 2; k++) ev.push({ b: at + k / 2, len: 0.5, kind: 'arp', m: 72 + tones[k % tones.length], vol: 0.6 });
    const roll = s.fill && bar === bars.length - 1; // last bar: a snare roll that grows
    if (s.drums && s.drums.startsWith('hero')) { // heroic orchestral march: field-drum triplets, timpani, cymbals
      const big = s.drums === 'herobig';
      const root = 36 + (tones[0] % 12);
      if (s.drums === 'herointro') {
        ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: 0.8 });
        if (bar === bars.length - 1) for (let k = 0; k < 12; k++) ev.push({ b: at + k / 3, len: 1 / 3, kind: k < 9 ? 'snare' : 'timp', m: root, vol: 0.25 + 0.06 * k });
        return;
      }
      const v = big ? 1 : 0.65;
      ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: 0.6 * v }, { b: at, len: 0.25, kind: 'kick', vol: 0.7 * v }, { b: at, len: 0.25, kind: 'snare', vol: 0.6 * v });
      for (const q of [1, 3]) for (let k = 0; k < 3; k++) ev.push({ b: at + q + k / 3, len: 1 / 3, kind: 'snare', vol: (0.22 + 0.08 * k + (q === 3 ? 0.06 : 0)) * v }); // "da-da-da"
      ev.push({ b: at + 2, len: 0.25, kind: 'snare', vol: 0.45 * v }, { b: at + 2, len: 0.25, kind: 'kick', vol: 0.5 * v });
      if (big) ev.push({ b: at + 2, len: 2, kind: 'timp', m: root + 7, vol: 0.45 });
      if (big && bar % 4 === 0 && bar > 0) ev.push({ b: at, len: 2, kind: 'crash' });
      for (let k = 0; k < bpb; k++) ev.push({ b: at + k, len: 0.5, kind: 'sleigh', accent: k % 2 === 0 }); // Santa's sleigh bells on every beat
      return;
    }
    if (s.drums && s.drums.startsWith('r68')) { // rolling 6/8 (one beat = one eighth): no dance kick
      const big = s.drums === 'r68big';
      if (roll) { // the build: a snare roll in 16ths that grows, and timpani
        for (let k = 0; k < bpb * 2; k++) ev.push({ b: at + k / 2, len: 0.25, kind: 'snare', vol: 0.2 + (0.6 * k) / (bpb * 2) });
        ev.push({ b: at, len: 3, kind: 'timp', m: 36 + (tones[0] % 12), vol: 0.8 }, { b: at + 3, len: 3, kind: 'timp', m: 36 + (tones[0] % 12), vol: 1 });
        return;
      }
      if (s.drums === 'r68intro') { ev.push({ b: at, len: 3, kind: 'timp', m: 36 + (tones[0] % 12), vol: 0.7 }); return; }
      ev.push({ b: at, len: 0.5, kind: 'sleigh', accent: true }, { b: at + 3, len: 0.5, kind: 'sleigh', accent: !big });
      if (big) {
        for (const k of [1, 2, 4, 5]) ev.push({ b: at + k, len: 0.5, kind: 'sleigh', accent: false });
        ev.push({ b: at, len: 0.5, kind: 'kick', vol: 0.9 }, { b: at + 3, len: 0.5, kind: 'snare', vol: 0.6 }, { b: at + 5, len: 0.5, kind: 'kick', vol: 0.45 });
        if (bar % 4 === 3) ev.push({ b: at + 4, len: 0.5, kind: 'snare', vol: 0.4 }, { b: at + 5, len: 0.5, kind: 'snare', vol: 0.5 }); // a small fill every 4 bars
      } else if (bar % 2 === 0) ev.push({ b: at, len: 2, kind: 'timp', m: 36 + (tones[0] % 12), vol: 0.35 });
      return;
    }
    for (let k = 0; k < bpb * 2; k++) {
      const beat = k / 2;
      if (s.drums !== 'none') ev.push({ b: at + beat, len: 0.25, kind: 'sleigh', accent: k % 2 === 0 });
      if (s.drums === 'waltz' || s.drums === 'waltzbig') { // 3/4: kick on 1, light snare on 2 and 3
        const big = s.drums === 'waltzbig';
        if (k === 0) ev.push({ b: at, len: 0.25, kind: 'kick', vol: big ? 1 : 0.7 });
        if (big && k === 5 && !roll) ev.push({ b: at + beat, len: 0.25, kind: 'kick', vol: 0.5 });
        if (roll) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: 0.3 + 0.13 * k });
        else if (k === 2 || k === 4) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: big ? 0.7 : 0.35 });
      } else if (s.drums === 'dance' || s.drums === 'dancebig') { // 4/4: kick on every beat, snare on 2 and 4
        const big = s.drums === 'dancebig';
        if (k % 2 === 0 && !(roll && k >= 4)) ev.push({ b: at + beat, len: 0.25, kind: 'kick', vol: big ? 1 : 0.85 });
        if (roll) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: 0.3 + 0.1 * k }, { b: at + beat + 0.25, len: 0.25, kind: 'snare', vol: 0.25 + 0.1 * k });
        else if (k === 2 || k === 6) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: big ? 0.9 : 0.7 });
      } else if (s.drums === 'march' || s.drums === 'marchbig' || s.drums === 'marchintro') { // 4/4 march (not dance)
        const big = s.drums === 'marchbig';
        const root = 36 + (tones[0] % 12);
        if (s.drums === 'marchintro') {
          if (k === 0) ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: 0.8 });
          if (bar === bars.length - 1) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: 0.25 + 0.08 * k }, { b: at + beat + 0.25, len: 0.25, kind: 'snare', vol: 0.2 + 0.08 * k });
        } else {
          if (k === 0 || k === 4) ev.push({ b: at + beat, len: 0.25, kind: 'kick', vol: big ? 0.85 : 0.6 });
          if (k === 2 || k === 6) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: big ? 0.7 : 0.45 });
          if (big && k === 7 && bar % 2 === 1) ev.push({ b: at + beat, len: 0.25, kind: 'snare', vol: 0.4 }, { b: at + beat + 0.25, len: 0.25, kind: 'snare', vol: 0.5 }); // a march ruff
          if (k === 0 && bar % (big ? 2 : 4) === 0) ev.push({ b: at, len: 2, kind: 'timp', m: root, vol: big ? 0.6 : 0.4 });
        }
      } else if (s.drums === 'drive' || s.drums === 'big') {
        if (k % 4 === 0 || (s.drums === 'big' && k % 2 === 0)) ev.push({ b: at + beat, len: 0.25, kind: 'kick' });
        if (k % 4 === 2) ev.push({ b: at + beat, len: 0.25, kind: 'snare' });
      } else if (s.drums === 'bells' && k % 8 === 0) ev.push({ b: at + beat, len: 0.25, kind: 'kick', vol: 0.6 });
    }
  });
  if (['big', 'waltzbig', 'dancebig', 'r68big', 'marchbig', 'herobig'].includes(s.drums)) ev.push({ b: 0, len: 2, kind: 'crash' });
  return ev.sort((x, y) => x.b - y.b);
}

export function sectionBeats(s) {
  return s.chords.split(/\s+/).length * s.beatsPerBar;
}

// Flight timing: song beat <-> Santa's distance. course = flight.course, cfg = CONFIG.
// The parts end exactly when the anchor chimneys are passed, so the song fits chimneys 1-30.
export function flightMap(course, cfg, song = FLIGHT) {
  const pass = (n) => course[n - 1].x + cfg.world.chimneyW / 2 - cfg.physics.santaX;
  const pts = [{ d: 0, b: 0 }];
  let part = 0;
  song.anchors.forEach((n, k) => {
    let beats = 0;
    for (let j = 0; j < song.anchorParts[k]; j++) beats += sectionBeats(song.sections[part++]);
    pts.push({ d: pass(n), b: pts[pts.length - 1].b + beats });
  });
  const levelAfter = cfg.levels.find((l) => l.to > song.anchors[song.anchors.length - 1]) || cfg.levels[cfg.levels.length - 1];
  const pxPerBeat = (levelAfter.speed * 60) / cfg.music.loopBpm;
  const bounds = cfg.levels.map((l) => ({ d: pass(Math.min(l.to, course.length)), speed: l.speed }));
  const last = pts[pts.length - 1];
  return {
    beatAt(d) {
      if (d >= last.d) return last.b + (d - last.d) / pxPerBeat;
      for (let k = 1; k < pts.length; k++) if (d < pts[k].d) return pts[k - 1].b + ((d - pts[k - 1].d) / (pts[k].d - pts[k - 1].d)) * (pts[k].b - pts[k - 1].b);
      return last.b;
    },
    distAt(b) {
      if (b >= last.b) return last.d + (b - last.b) * pxPerBeat;
      for (let k = 1; k < pts.length; k++) if (b < pts[k].b) return pts[k - 1].d + ((b - pts[k - 1].b) / (pts[k].b - pts[k - 1].b)) * (pts[k].d - pts[k - 1].d);
      return last.d;
    },
    // seconds Santa needs to fly from distance d1 to d2 (speeds change at chimneys 10, 20, 30, 40)
    secsBetween(d1, d2) {
      let t = 0;
      let d = d1;
      for (const bd of bounds) {
        if (d >= d2) break;
        if (d >= bd.d) continue;
        const end = Math.min(d2, bd.d);
        t += (end - d) / bd.speed;
        d = end;
      }
      if (d < d2) t += (d2 - d) / bounds[bounds.length - 1].speed;
      return t;
    },
    // where Santa will be after `secs` more seconds of flying
    distAfter(d, secs) {
      let left = secs;
      let x = d;
      for (const bd of bounds) {
        if (x >= bd.d) continue;
        const need = (bd.d - x) / bd.speed;
        if (need >= left) return x + left * bd.speed;
        left -= need;
        x = bd.d;
      }
      return x + left * bounds[bounds.length - 1].speed;
    },
    anchors: pts,
  };
}
