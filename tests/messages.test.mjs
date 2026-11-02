// Crash message tests: T32 (C1-C4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { crashMessage, joinList, readTime } from '../src/messages.js';
import { newSession, forceWheel } from './helpers.mjs';

const first = () => 0; // always the first line of each list
function pay(priceId) {
  const sess = newSession();
  const ev = sess.commit(R.payBody(sess.s, priceId, CONFIG));
  return { sess, p: sess.s.byPid.get(ev.pid) };
}
function fly(sess, p, pillars) {
  const prevBest = p.best;
  sess.commit(R.tryBody(p, pillars));
  return crashMessage(p, { pillars, prevBest, freeRestart: false }, CONFIG, first);
}
const text = (m) => [m.title, ...m.lines].join(' ');

test('T32 C1: a crash before chimney 5 is a free restart, Santa says it does not count', () => {
  const { p } = pay('p2');
  const m = crashMessage(p, { pillars: 2, freeRestart: true, restartsLeft: 2 }, CONFIG, first);
  assert.equal(m.state, 'restart');
  assert.match(text(m), /FREE RESTARTS LEFT: 2/);
});

test('T32 C2: tries left: Santa smiles and says how many', () => {
  const { sess, p } = pay('p5');
  const m = fly(sess, p, 6);
  assert.equal(m.state, 'tries');
  assert.equal(m.mood, 'ok');
  assert.match(text(m), /2 MORE TRIES/);
  const close = fly(sess, p, 8); // new best AND close to 10: new best wins
  assert.match(text(close), /NEW BEST: CHIMNEY 8/);
  const again = fly(sess, p, 7);
  assert.notEqual(again.state, 'tries'); // the last try
});

test('T32 C2: passing 20 with tries left: "but first: a spin on the wheel"', () => {
  const { sess, p } = pay('p5');
  const m = fly(sess, p, 23);
  assert.equal(m.state, 'tries');
  assert.equal(m.mood, 'happy');
  assert.match(m.lines[0], /BUT FIRST: A SPIN ON THE WHEEL/);
});

test('T32 C3: no tries left but prizes: Santa is happy and lists them', () => {
  const { sess, p } = pay('p2');
  const m = fly(sess, p, 33);
  assert.equal(m.state, 'prizes');
  assert.equal(m.mood, 'happy');
  assert.match(m.lines[0], /A SPIN ON THE WHEEL, 3 JACKPOT TICKETS AND THE LEGEND TAG AND A PRIZE FROM CHIMNEY 10/);
});

test('T32 C3: prizes already given, jackpot tickets kept: Santa reminds about the draw', () => {
  const { sess, p } = pay('p2');
  sess.commit(R.tryBody(p, 22));
  sess.commit(R.awardBody('p20', p, sess.s, CONFIG));
  sess.commit(R.wheelBody(p, sess.s, CONFIG, forceWheel(CONFIG, 'free')));
  sess.commit(R.choiceBody(p, 'free', CONFIG)); // gave up the chimney 10 prize for a free try
  assert.equal(fly(sess, p, 6).state, 'tries'); // the wheel's free try
  const m = fly(sess, p, 6); // the chimney 10 free try: now nothing left and no tickets
  assert.equal(m.state, 'over');
  const s2 = pay('p2');
  s2.sess.commit(R.tryBody(s2.p, 21));
  s2.sess.commit(R.awardBody('p20', s2.p, s2.sess.s, CONFIG));
  s2.sess.commit(R.wheelBody(s2.p, s2.sess.s, CONFIG, forceWheel(CONFIG, 't2')));
  s2.sess.commit(R.choiceBody(s2.p, 'free', CONFIG));
  const m2 = fly(s2.sess, s2.p, 4);
  assert.equal(m2.state, 'prizes');
  assert.match(text(m2), /KEEP YOUR 2 JACKPOT TICKETS SAFE/);
});

test('T32 C4: nothing won: Santa is sad, close call and charity thanks', () => {
  const { sess, p } = pay('p2');
  const m = fly(sess, p, 8);
  assert.equal(m.state, 'over');
  assert.equal(m.mood, 'sad');
  assert.match(text(m), /ONLY 2 AWAY/);
  assert.match(text(m), /THANK YOU/);
  assert.doesNotMatch(text(m), /PLAY AGAIN/); // R17: never "play again?"
});

test('joinList makes a readable list', () => {
  assert.equal(joinList(['A']), 'A');
  assert.equal(joinList(['A', 'B', 'C']), 'A, B AND C');
});

test('T32: a long speech box stays longer than a short one', () => {
  const short = { state: 'tries', title: 'NICE TRY!', lines: ['GO AGAIN!'] };
  const long = { state: 'tries', title: 'NICE TRY!', lines: ['BUT FIRST: A SPIN ON THE WHEEL, 3 JACKPOT TICKETS AND THE LEGEND TAG!', 'SO CLOSE! ONLY 2 MORE TO 40. 2 MORE TRIES LEFT!'] };
  assert.ok(readTime(short) >= CONFIG.crash.read.tries);
  assert.ok(readTime(long) > readTime(short) + 3, `long text: ${readTime(long).toFixed(1)} s`);
});
