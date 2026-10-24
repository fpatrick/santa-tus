// Music tests: T31 (Jingle Bells is timed to chimneys 1-30) and checks on the song data (A5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { buildCourse, seeded } from '../src/course.js';
import { FLIGHT, LOBBY, MENU, parseNotes, midi, chordTones, sectionEvents, sectionBeats, flightMap } from '../src/songs.js';

const all = [...FLIGHT.sections, ...LOBBY.sections, ...MENU.sections];

test('A5: every part has full bars, known notes and known chords', () => {
  for (const s of all) {
    const notes = parseNotes(s.melody);
    const beats = notes.reduce((a, n) => a + n.beats, 0);
    assert.equal(beats, sectionBeats(s), `${s.name}: melody has ${beats} beats, chords need ${sectionBeats(s)}`);
    for (const n of notes) assert.ok(n.note === 'R' || midi(n.note) != null, `${s.name}: bad note ${n.note}`);
    for (const c of s.chords.split(/\s+/)) assert.ok(chordTones(c).length >= 3, `${s.name}: bad chord ${c}`);
    assert.ok(sectionEvents(s).length > 0);
  }
});

test('T31: Jingle Bells runs from the first click to chimney 30 without looping, then loops', () => {
  const course = buildCourse(CONFIG, seeded(7));
  const map = flightMap(course, CONFIG);
  const pass = (n) => course[n - 1].x + CONFIG.world.chimneyW / 2 - CONFIG.physics.santaX;
  let beats = 0;
  for (let k = 0; k < FLIGHT.loopFrom; k++) beats += sectionBeats(FLIGHT.sections[k]);
  assert.equal(map.beatAt(pass(30)), beats, 'the loop must start exactly at chimney 30');
  assert.equal(map.beatAt(pass(10)), sectionBeats(FLIGHT.sections[0]) + sectionBeats(FLIGHT.sections[1]), 'intro + verse end at chimney 10');
  assert.equal(map.beatAt(pass(20)), map.beatAt(pass(10)) + sectionBeats(FLIGHT.sections[2]), 'chorus ends at chimney 20');
  assert.ok(Math.abs(map.distAt(map.beatAt(12345)) - 12345) < 1e-6);
});

test('T31: the tempo of each part stays musical (140-260 beats a minute)', () => {
  const course = buildCourse(CONFIG, seeded(7));
  const map = flightMap(course, CONFIG);
  const pts = map.anchors;
  for (let k = 1; k < pts.length; k++) {
    const bpm = ((pts[k].b - pts[k - 1].b) / map.secsBetween(pts[k - 1].d, pts[k].d)) * 60;
    assert.ok(bpm > 140 && bpm < 260, `part ${k}: ${bpm.toFixed(0)} bpm`);
  }
  const secs = map.secsBetween(0, pts[pts.length - 1].d);
  assert.ok(secs > 40 && secs < 80, `song length to chimney 30: ${secs.toFixed(1)} s`);
  assert.ok(Math.abs(map.secsBetween(0, map.distAfter(0, 5)) - 5) < 1e-9);
});
