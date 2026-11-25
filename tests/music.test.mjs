// Music tests: T31 (Jingle Bells is timed to chimneys 1-30) and checks on the song data (A5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { buildCourse, seeded } from '../src/course.js';
import { FLIGHT, LOBBY, MENU, CRASH, parseNotes, midi, chordTones, sectionEvents, sectionBeats, flightMap } from '../src/songs.js';

const all = [...FLIGHT.sections, ...LOBBY.sections, ...MENU.sections, ...CRASH.sections];

test('A5: every part has full bars, known notes and known chords', () => {
  for (const s of all) {
    const notes = parseNotes(s.melody);
    const beats = Math.round(notes.reduce((a, n) => a + n.beats, 0) * 1e6) / 1e6; // triplets (1/3) add float dust
    assert.equal(beats, sectionBeats(s),`${s.name}: melody has ${beats} beats, chords need ${sectionBeats(s)}`);
    for (const n of notes) assert.ok(n.note === 'R' || midi(n.note) != null, `${s.name}: bad note ${n.note}`);
    for (const c of s.chords.split(/\s+/)) assert.ok(chordTones(c).length >= 3, `${s.name}: bad chord ${c}`);
    assert.ok(sectionEvents(s).length > 0);
    if (!s.counter) continue;
    const fill = parseNotes(s.counter);
    assert.equal(Math.round(fill.reduce((a, n) => a + n.beats, 0) * 1e6) / 1e6, sectionBeats(s), `${s.name}: fills must have full bars`);
    for (const n of fill) assert.ok(n.note === 'R' || midi(n.note) != null, `${s.name}: bad fill note ${n.note}`);
  }
});

test('A5: the title song is a grand chiptune RPG theme in a rolling 6/8 (no dance kick), light first then building up', () => {
  const beats = MENU.sections.reduce((a, s) => a + sectionBeats(s), 0);
  const secs = (beats / CONFIG.music.menuBpm) * 60;
  assert.ok(CONFIG.music.menuBpm >= 140, `title tempo ${CONFIG.music.menuBpm} is too slow`);
  assert.ok(secs > 45 && secs < 80, `title loop is ${secs.toFixed(1)} s`);
  for (const s of MENU.sections) {
    assert.equal(s.beatsPerBar, 6, `${s.name}: 6/8`);
    assert.equal(s.lead, 'rpg');
    const ev = sectionEvents(s);
    const bars = sectionBeats(s) / s.beatsPerBar;
    assert.ok(ev.filter((e) => e.kind === 'arp').length >= bars * 5, `${s.name}: the harp must roll`);
    assert.ok(ev.filter((e) => e.kind === 'kick').length <= bars * 2, `${s.name}: no kick on every beat (not a dance song)`);
  }
  const kicks = (i) => sectionEvents(MENU.sections[i]).filter((e) => e.kind === 'kick').length;
  assert.equal(kicks(1), 0, 'verse 1 is light: no drum kit');
  assert.ok(kicks(2) > 0, 'verse 2 builds up: drums come in');
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
