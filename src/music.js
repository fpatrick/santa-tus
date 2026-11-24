// music.js: background music. Plays the songs in songs.js with small chiptune instruments.
// Modes: menu (title screen, Silent Night), lobby (between tries, soft Jingle Bells chorus),
// flight (full Jingle Bells, timed to Santa's distance so it ends exactly at chimney 30, then loops).
// main.js calls music.update(dist) every frame; flow.js and main.js switch the modes.

import { CONFIG } from './config.js';
import { getAudio } from './sound.js';
import { FLIGHT, LOBBY, MENU, CRASH, sectionEvents, sectionBeats, flightMap, freq } from './songs.js';

const AHEAD = 0.3; // seconds of music planned ahead
const cache = new Map();
let bus = null;
let cur = null; // { name, song, gain, clock, part, partStart, idx }

function audio() {
  const a = getAudio();
  if (!a) return null;
  if (!bus) {
    bus = a.ctx.createGain();
    bus.gain.value = CONFIG.music.volume;
    bus.connect(a.master);
  }
  return a;
}

function events(section) {
  if (!cache.has(section)) cache.set(section, sectionEvents(section));
  return cache.get(section);
}

// A wall clock (fixed tempo) or a flight clock (follows Santa's distance).
const wallClock = (bpm) => ({ kind: 'wall', bps: bpm / 60, t0: null });

function start(name, song, clock) {
  const a = audio();
  if (!a || !CONFIG.music.on) return;
  if (cur && cur.name === name && name !== 'flight') return; // already playing
  stop(0.08);
  const gain = a.ctx.createGain();
  gain.connect(bus);
  cur = { name, song, gain, clock, part: 0, partStart: 0, idx: 0 };
}

export function stop(fade = 0.1) {
  if (!cur) return;
  const a = getAudio();
  const g = cur.gain;
  g.gain.setTargetAtTime(0, a.ctx.currentTime, fade / 3);
  setTimeout(() => g.disconnect(), (fade + AHEAD + 0.5) * 1000);
  cur = null;
}

export const music = {
  menu: () => start('menu', MENU, wallClock(CONFIG.music.menuBpm)),
  lobby: () => start('lobby', LOBBY, wallClock(CONFIG.music.lobbyBpm)),
  // crash scene music: sad minor chorus, or the happy chorus when Santa has prizes to give
  crash: (mood) => (mood === 'happy' ? start('lobby', LOBBY, wallClock(CONFIG.music.lobbyBpm)) : start('crash', CRASH, wallClock(CONFIG.music.crashBpm))),
  flight: (course) => start('flight', FLIGHT, { kind: 'flight', map: flightMap(course, CONFIG) }),
  stop,
  // Wheel: music goes quiet so the wheel sounds stand out.
  duck(on) {
    if (!audio()) return;
    bus.gain.setTargetAtTime(CONFIG.music.volume * (on ? CONFIG.music.wheelDuck : 1), getAudio().ctx.currentTime, 0.15);
  },
  playing: () => (cur ? cur.name : null),
  update,
};

// Plans the notes of the next AHEAD seconds. dist = Santa's distance (flight mode only).
function update(dist = 0) {
  const a = getAudio();
  if (!cur || !a || a.ctx.state !== 'running') return;
  const now = a.ctx.currentTime;
  const c = cur.clock;
  let beatNow;
  let horizon;
  let timeOf;
  if (c.kind === 'wall') {
    if (c.t0 === null) c.t0 = now + 0.05;
    beatNow = (now - c.t0) * c.bps;
    horizon = beatNow + AHEAD * c.bps;
    timeOf = (b) => c.t0 + b / c.bps;
  } else {
    beatNow = c.map.beatAt(dist);
    horizon = c.map.beatAt(c.map.distAfter(dist, AHEAD));
    timeOf = (b) => now + c.map.secsBetween(dist, c.map.distAt(b));
  }
  const parts = cur.song.sections;
  for (let guard = 0; guard < 400; guard++) {
    const sec = parts[cur.part];
    const evs = events(sec);
    if (cur.idx >= evs.length) {
      cur.partStart += sectionBeats(sec);
      cur.part = cur.part + 1 < parts.length ? cur.part + 1 : cur.song.loopFrom;
      cur.idx = 0;
      if (cur.partStart >= horizon) break;
      continue;
    }
    const ev = evs[cur.idx];
    const gb = cur.partStart + ev.b;
    if (gb >= horizon) break;
    cur.idx += 1;
    if (gb < beatNow - 0.25) continue; // too late, skip it
    const t = Math.max(now, timeOf(gb));
    const dur = Math.max(0.04, timeOf(gb + ev.len) - timeOf(gb));
    play(a, ev, t, dur, cur.gain, sec.lead);
  }
}

// ---------- instruments ----------
const PIANO_VOL = { lead: 0.28, lead2: 0.12, harm: 0.09, counter: 0.12, bass: 0.15, arp: 0.08 }; // melody forward, left hand under it
function play(a, ev, t, dur, out, lead) {
  const v = ev.vol || 1;
  if (lead === 'piano' && PIANO_VOL[ev.kind]) { // a person playing: tiny timing and touch differences
    const human = 0.9 + Math.random() * 0.15;
    return piano(a, ev.m, t + Math.random() * 0.008, dur, PIANO_VOL[ev.kind] * v * human, out, ev.kind === 'bass' || ev.kind === 'arp');
  }
  if (lead === 'rpg') { // the grand RPG theme (A5): heroic lead, harp, strings, timpani
    switch (ev.kind) {
      case 'lead': return osc(a, 'square', ev.m, t, dur * 0.92, 0.07 * v, out, 0.007);
      case 'lead2': return osc(a, 'triangle', ev.m, t, dur * 0.9, 0.09 * v, out, 0.006);
      case 'harm': return osc(a, 'square', ev.m, t, dur * 0.88, 0.035 * v, out, 0.005);
      case 'counter': return bell(a, ev.m, t, dur, 0.09 * v, out);
      case 'arp': return bell(a, ev.m, t, dur, 0.055 * v, out);
      case 'bass': return osc(a, 'triangle', ev.m, t, Math.min(dur, 1.2), 0.24 * v, out);
      case 'pad': return pad(a, ev.m, t, dur, 0.022 * v, out);
      case 'timp': return timp(a, ev.m, t, 0.5 * v, out);
      default: break;
    }
  }
  switch (ev.kind) {
    case 'lead': return lead === 'bell' ? bell(a, ev.m, t, dur, 0.16 * v, out) : osc(a, 'square', ev.m, t, dur * 0.9, 0.075 * v, out);
    case 'lead2': return osc(a, 'square', ev.m, t, dur * 0.85, 0.03 * v, out);
    case 'counter': return bell(a, ev.m, t, dur, 0.08 * v, out);
    case 'bass': return osc(a, 'triangle', ev.m, t, Math.min(dur, 0.6), 0.26 * v, out);
    case 'arp': return lead === 'bell' ? bell(a, ev.m, t, dur, 0.05 * v, out) : osc(a, 'triangle', ev.m, t, dur * 0.7, 0.05 * v, out);
    case 'kick': return kick(a, t, 0.35 * v, out);
    case 'snare': return noise(a, t, 0.1, 0.16 * v, 1800, 'bandpass', out);
    case 'sleigh': return noise(a, t, 0.05, (ev.accent ? 0.07 : 0.04) * v, 7500, 'highpass', out);
    case 'crash': return noise(a, t, 1.2, 0.12 * v, 5000, 'highpass', out);
    default: return null;
  }
}

function env(a, t, dur, vol, out) {
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol, t + Math.max(0.006, dur - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
}

// vib = vibrato depth (part of the pitch) on long notes, like a singer or a violin.
function osc(a, type, m, t, dur, vol, out, vib = 0) {
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq(m);
  if (vib && dur > 0.3) {
    const lfo = a.ctx.createOscillator();
    const depth = a.ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq(m) * vib, t + Math.min(0.35, dur * 0.6));
    lfo.connect(depth);
    depth.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  o.connect(env(a, t, dur, vol, out));
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Piano: a hammer attack, a few soft overtones (slightly out of tune, like real strings), a lowpass that closes
// as the note fades (bright at first, warm after), and a long fade that is shorter for high notes.
// pedal = the left hand: it rings longer (sustain pedal feel).
function piano(a, m, t, dur, vol, out, pedal) {
  const f = freq(m);
  const high = Math.max(0, Math.min(1, (m - 48) / 48));
  const len = Math.min(3.2, Math.max(0.5, (pedal ? 1.6 : 1.1) * dur + 0.6)) * (1 - 0.45 * high);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const lp = a.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(12000, f * 9), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + Math.min(0.9, len));
  lp.connect(g);
  g.connect(out);
  for (const [mult, lv, type] of [[1, 1, 'triangle'], [1.003, 0.5, 'sine'], [2.002, 0.35, 'sine'], [3.01, 0.12, 'sine'], [4.02, 0.05, 'sine']]) {
    const o = a.ctx.createOscillator();
    const og = a.ctx.createGain();
    o.type = type;
    o.frequency.value = f * mult;
    og.gain.value = lv;
    o.connect(og);
    og.connect(lp);
    o.start(t);
    o.stop(t + len + 0.05);
  }
}

// Soft strings: a slow swell and a slow fade under everything.
function pad(a, m, t, dur, vol, out) {
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.4));
  g.gain.setValueAtTime(vol, t + Math.max(0.41, dur * 0.8));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
  g.connect(out);
  for (const det of [-0.004, 0.004]) {
    const o = a.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq(m) * (1 + det);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.3);
  }
}

// Timpani: a low tuned drum, the pitch falls a little, a long boom.
function timp(a, m, t, vol, out) {
  const o = a.ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq(m) * 1.08, t);
  o.frequency.exponentialRampToValueAtTime(freq(m), t + 0.08);
  o.connect(env(a, t, 1.1, vol, out));
  o.start(t);
  o.stop(t + 1.15);
  noise(a, t, 0.06, vol * 0.25, 900, 'lowpass', out);
}

// Music-box bell: a sine with a soft overtone and a long fade.
function bell(a, m, t, dur, vol, out) {
  const len = Math.max(0.6, Math.min(2.2, dur * 1.6));
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g.connect(out);
  for (const [mult, lv] of [[1, 1], [2, 0.28], [3.01, 0.08]]) {
    const o = a.ctx.createOscillator();
    const og = a.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq(m) * mult;
    og.gain.value = lv;
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + len + 0.02);
  }
}

function kick(a, t, vol, out) {
  const o = a.ctx.createOscillator();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  o.connect(env(a, t, 0.16, vol, out));
  o.start(t);
  o.stop(t + 0.2);
}

function noise(a, t, dur, vol, hz, type, out) {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noiseBuf;
  const f = a.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  src.connect(f);
  f.connect(env(a, t, dur, vol, out));
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}
