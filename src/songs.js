// songs.js: the music as data, plus pure helpers (no sound here, so the tests can check it).
// Both songs are public domain: "Jingle Bells" (J. L. Pierpont, 1857), "Silent Night" (F. X. Gruber, 1818).
// Melody format: "NOTE BEATS" pairs, "R" = rest, "|" = bar line (ignored). One beat = one quarter note.
// chords: one chord per bar. arr = how the band plays it (music.js reads these names).

const JB_VERSE = `
  G4 1 E5 1 D5 1 C5 1 | G4 3 G4 .5 G4 .5 | G4 1 E5 1 D5 1 C5 1 | A4 4 |
  A4 1 F5 1 E5 1 D5 1 | B4 4 | G5 1 G5 1 F5 1 D5 1 | E5 4 |
  G4 1 E5 1 D5 1 C5 1 | G4 4 | G4 1 E5 1 D5 1 C5 1 | A4 3 A4 1 |
  A4 1 F5 1 E5 1 D5 1 | G5 1 G5 1 G5 1 G5 1 | A5 1 G5 1 F5 1 D5 1 | C5 3 R 1 |`;
const JB_VERSE_CHORDS = 'C C C F F G7 G7 C C C C F F G7 G7 C';

const JB_CHORUS = `
  E5 1 E5 1 E5 2 | E5 1 E5 1 E5 2 | E5 1 G5 1 C5 1.5 D5 .5 | E5 4 |
  F5 1 F5 1 F5 1.5 F5 .5 | F5 1 E5 1 E5 1 E5 .5 E5 .5 | E5 1 D5 1 D5 1 E5 1 | D5 2 G5 2 |
  E5 1 E5 1 E5 2 | E5 1 E5 1 E5 2 | E5 1 G5 1 C5 1.5 D5 .5 | E5 4 |
  F5 1 F5 1 F5 1 F5 1 | F5 1 E5 1 E5 1 E5 .5 E5 .5 | G5 1 G5 1 F5 1 D5 1 | C5 4 |`;
const JB_CHORUS_CHORDS = 'C C C C F C D7 G7 C C C C F C G7 C';

const JB_INTRO = 'R 4 | R 4 | R 4 | G5 1 F5 1 E5 1 D5 1 |';
const JB_INTRO_CHORDS = 'C C G7 G7';

const SILENT = `
  G4 1.5 A4 .5 G4 1 | E4 3 | G4 1.5 A4 .5 G4 1 | E4 3 |
  D5 2 D5 1 | B4 3 | C5 2 C5 1 | G4 3 |
  A4 2 A4 1 | C5 1.5 B4 .5 A4 1 | G4 1.5 A4 .5 G4 1 | E4 3 |
  A4 2 A4 1 | C5 1.5 B4 .5 A4 1 | G4 1.5 A4 .5 G4 1 | E4 3 |
  D5 2 D5 1 | F5 1.5 D5 .5 B4 1 | C5 3 | E5 3 |
  C5 1.5 G4 .5 E4 1 | G4 1.5 F4 .5 D4 1 | C4 3 | R 3 |`;
const SILENT_CHORDS = 'C C C C G7 G7 C C F F C C F F C C G7 G7 C C C G7 C C';

// arr: lead (square | bell), bass (oompah | soft | waltz), arp (true = eighth-note chord notes),
// drums (none | bells | drive | big), up = semitones to transpose, double = lead also an octave up.
const sec = (name, melody, chords, beatsPerBar, arr) => ({ name, melody, chords, beatsPerBar, ...arr });

// During flight. The first 3 parts end exactly when chimneys 10, 20 and 30 are passed (see flightMap).
// After 30 the last two parts loop (verse + chorus a key higher), which fills chimneys 31-50.
export const FLIGHT = {
  sections: [
    sec('intro', JB_INTRO, JB_INTRO_CHORDS, 4, { lead: 'square', bass: 'oompah', drums: 'bells', up: 0 }),
    sec('verse', JB_VERSE, JB_VERSE_CHORDS, 4, { lead: 'square', bass: 'oompah', drums: 'bells', up: 0 }),
    sec('chorus', JB_CHORUS, JB_CHORUS_CHORDS, 4, { lead: 'square', bass: 'oompah', arp: true, drums: 'drive', up: 0 }),
    sec('chorus-up', JB_CHORUS, JB_CHORUS_CHORDS, 4, { lead: 'square', bass: 'oompah', arp: true, drums: 'big', up: 2, double: true }),
    sec('verse-top', JB_VERSE, JB_VERSE_CHORDS, 4, { lead: 'square', bass: 'oompah', arp: true, drums: 'big', up: 4 }),
    sec('chorus-top', JB_CHORUS, JB_CHORUS_CHORDS, 4, { lead: 'square', bass: 'oompah', arp: true, drums: 'big', up: 4, double: true }),
  ],
  anchors: [10, 20, 30], // chimney numbers where parts end: intro+verse | chorus | chorus-up
  anchorParts: [2, 1, 1], // how many parts each anchor covers
  loopFrom: 4,
};

// Between tries, on the wheel, the choice and the hand-over: soft chorus, loops.
export const LOBBY = {
  sections: [sec('lobby', JB_CHORUS, JB_CHORUS_CHORDS, 4, { lead: 'bell', bass: 'soft', drums: 'bells', up: 0 })],
  loopFrom: 0,
};

// Title screen: Silent Night as a music box, loops.
export const MENU = {
  sections: [sec('silent', SILENT, SILENT_CHORDS, 3, { lead: 'bell', bass: 'waltz', drums: 'none', up: 0 })],
  loopFrom: 0,
};

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
  for (let i = 0; i + 1 < tok.length; i += 2) out.push({ note: tok[i], beats: Number(tok[i + 1]) });
  return out;
}

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };
// 'G7' -> semitones above C: [7, 11, 14, 17]
export function chordTones(name) {
  const m = /^([A-G])([#b]?)(m|7)?$/.exec(name);
  const root = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return QUALITY[m[3] || ''].map((s) => root + s);
}

// Every sound of one part, in beats from its start: { b, len, kind, m (MIDI), accent }.
export function sectionEvents(s) {
  const ev = [];
  let b = 0;
  for (const { note, beats } of parseNotes(s.melody)) {
    const m = midi(note);
    if (m != null) {
      ev.push({ b, len: beats, kind: 'lead', m: m + s.up });
      if (s.double) ev.push({ b, len: beats, kind: 'lead2', m: m + s.up + 12 });
    }
    b += beats;
  }
  const bpb = s.beatsPerBar;
  s.chords.split(/\s+/).forEach((name, bar) => {
    const tones = chordTones(name).map((t) => t + s.up);
    const at = bar * bpb;
    if (s.bass === 'waltz') {
      ev.push({ b: at, len: 2.5, kind: 'bass', m: 36 + tones[0] });
      ev.push({ b: at + 1, len: 1, kind: 'arp', m: 60 + tones[1] }, { b: at + 2, len: 1, kind: 'arp', m: 60 + tones[2] });
    } else {
      const vol = s.bass === 'soft' ? 0.6 : 1;
      ev.push({ b: at, len: 1, kind: 'bass', m: 36 + (tones[0] % 12), vol }, { b: at + 2, len: 1, kind: 'bass', m: 36 + (tones[2] % 12), vol });
      if (s.bass === 'oompah') ev.push({ b: at + 1, len: 0.5, kind: 'arp', m: 60 + tones[1] }, { b: at + 3, len: 0.5, kind: 'arp', m: 60 + tones[2] });
    }
    if (s.arp) for (let k = 0; k < bpb * 2; k++) ev.push({ b: at + k / 2, len: 0.5, kind: 'arp', m: 72 + tones[k % tones.length], vol: 0.6 });
    for (let k = 0; k < bpb * 2; k++) {
      const beat = k / 2;
      if (s.drums !== 'none') ev.push({ b: at + beat, len: 0.25, kind: 'sleigh', accent: k % 2 === 0 });
      if (s.drums === 'drive' || s.drums === 'big') {
        if (k % 4 === 0 || (s.drums === 'big' && k % 2 === 0)) ev.push({ b: at + beat, len: 0.25, kind: 'kick' });
        if (k % 4 === 2) ev.push({ b: at + beat, len: 0.25, kind: 'snare' });
      } else if (s.drums === 'bells' && k % 8 === 0) ev.push({ b: at + beat, len: 0.25, kind: 'kick', vol: 0.6 });
    }
  });
  if (s.drums === 'big') ev.push({ b: 0, len: 2, kind: 'crash' });
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
