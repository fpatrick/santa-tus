// music.js: background music. Plays the songs in songs.js with small chiptune instruments.
// Modes: menu (title screen, Silent Night), lobby (between tries, soft Jingle Bells chorus),
// flight (full Jingle Bells, timed to Santa's distance so it ends exactly at chimney 30, then loops).
// main.js calls music.update(dist) every frame; flow.js and main.js switch the modes.

import { CONFIG } from './config.js';
import { getAudio } from './sound.js';
import { FLIGHT, LOBBY, MENU, sectionEvents, sectionBeats, flightMap, freq } from './songs.js';

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
function play(a, ev, t, dur, out, lead) {
  const v = ev.vol || 1;
  switch (ev.kind) {
    case 'lead': return lead === 'bell' ? bell(a, ev.m, t, dur, 0.16 * v, out) : osc(a, 'square', ev.m, t, dur * 0.9, 0.075 * v, out);
    case 'lead2': return osc(a, 'square', ev.m, t, dur * 0.85, 0.03 * v, out);
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

function osc(a, type, m, t, dur, vol, out) {
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq(m);
  o.connect(env(a, t, dur, vol, out));
  o.start(t);
  o.stop(t + dur + 0.02);
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
