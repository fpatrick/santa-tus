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
  const { p } = pay('p1');
  const m = crashMessage(p, { pillars: 2, freeRestart: true, restartsLeft: 2 }, CONFIG, first);
  assert.equal(m.state, 'restart');
  assert.match(text(m), /FREE RESTARTS LEFT: 2/);
});

test('T32 C2: tries left: Santa smiles and says how many', () => {
  const { sess, p } = pay('p3');
  const m = fly(sess, p, 6);
  assert.equal(m.state, 'tries');
  assert.equal(m.mood, 'ok');
  assert.match(text(m), /2 MORE TRIES/);
  const close = fly(sess, p, 8); // new best AND close to 10: new best wins
  assert.match(text(close), /NEW BEST: CHIMNEY 8/);
  const again = fly(sess, p, 7);
  assert.notEqual(again.state, 'tries'); // the last try
});

test('T32 C2: passing 20 with tries left: "waiting for you at the end: a sweet or a free try and a spin on the wheel"', () => {
  const { sess, p } = pay('p3');
  const m = fly(sess, p, 23);
  assert.equal(m.state, 'tries');
  assert.equal(m.mood, 'happy');
  assert.match(m.lines[0], /WAITING FOR YOU AT THE END: A SWEET OR A FREE TRY AND A SPIN ON THE WHEEL/);
});

test('T32 C3: no tries left but prizes: Santa is happy and lists them', () => {
  const { sess, p } = pay('p1');
  const m = fly(sess, p, 33);
  assert.equal(m.state, 'prizes');
  assert.equal(m.mood, 'happy');
  assert.match(m.lines[0], /A SWEET OR A FREE TRY, A SPIN ON THE WHEEL AND 3 DRAW TICKETS AND THE LEGEND TAG/);
});

test('T32 C3: after free tries: the wheel still waits; with tickets kept Santa reminds about the draw', () => {
  const { sess, p } = pay('p1');
  sess.commit(R.tryBody(p, 22));
  sess.commit(R.choiceBody(p, 'free', CONFIG)); // gave up the sweet for a free try
  const m1 = fly(sess, p, 6);
  assert.equal(m1.state, 'prizes'); // the wheel is still to come
  assert.match(text(m1), /A SPIN ON THE WHEEL/);
  sess.commit(R.wheelBody(p, sess.s, CONFIG, forceWheel(sess, 'free')));
  const m = fly(sess, p, 6); // the wheel's free try: now nothing left and no tickets
  assert.equal(m.state, 'over');
  const s2 = pay('p1');
  s2.sess.commit(R.tryBody(s2.p, 21));
  s2.sess.commit(R.choiceBody(s2.p, 'sweet', CONFIG));
  s2.sess.commit(R.wheelBody(s2.p, s2.sess.s, CONFIG, forceWheel(s2.sess, 't2')));
  const m2 = crashMessage(s2.p, { pillars: 4, prevBest: 21, freeRestart: false }, CONFIG, first);
  assert.equal(m2.state, 'prizes');
  assert.match(text(m2), /KEEP YOUR 2 DRAW TICKETS SAFE/);
});

test('T32 C4: nothing won: Santa is sad, close call and charity thanks', () => {
  const { sess, p } = pay('p1');
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
  const long = { state: 'tries', title: 'NICE TRY!', lines: ['WAITING FOR YOU AT THE END: A SPIN ON THE WHEEL AND 3 DRAW TICKETS AND THE LEGEND TAG!', 'SO CLOSE! ONLY 2 MORE TO 40. 2 MORE TRIES LEFT!'] };
  assert.ok(readTime(short) >= CONFIG.crash.read.tries);
  assert.ok(readTime(long) > readTime(short) + 3, `long text: ${readTime(long).toFixed(1)} s`);
});
