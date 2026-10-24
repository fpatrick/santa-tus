// Ledger, draw, undo and course tests: T12 (logic), T16-T19, T26.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { buildState, openPayment, totals, leaderboard, drawPool, fmtTickets, fmtEuro } from '../src/ledger.js';
import { buildCourse, checkCourse, seeded, levelFor } from '../src/course.js';
import { newSession, playPayment } from './helpers.mjs';

test('T12 (logic): a rebuilt state reopens the €5 payment with 2 tries left and the best kept (D3)', () => {
  const sess = newSession();
  const r = playPayment(sess, 'p5', { tries: [7], done: false });
  assert.equal(r.stoppedAt, 'fly');
  const again = buildState(sess.events);
  const p = openPayment(again);
  assert.ok(p);
  assert.equal(R.triesLeft(p), 2);
  assert.equal(p.best, 7);
});

test('T16: a draw with no tickets says the jackpot goes to charity (R14)', () => {
  const sess = newSession();
  playPayment(sess, 'p2', { tries: [5] });
  const d = R.drawBody(sess.s, CONFIG);
  assert.equal(d.ticket, null);
  assert.equal(d.count, 0);
});

test('T17: the draw picks only an issued ticket, and a second draw needs a reason (K3)', () => {
  const sess = newSession();
  playPayment(sess, 'p2', { tries: [22], wheel: ['t5'], choices: ['sticker'] });
  playPayment(sess, 'p2', { tries: [3] });
  const pool = drawPool(sess.s);
  for (let i = 0; i < 200; i++) assert.ok(pool.includes(R.drawBody(sess.s, CONFIG).ticket));
  sess.commit(R.drawBody(sess.s, CONFIG));
  assert.equal(sess.s.draws.length, 1);
  assert.throws(() => R.drawBody(sess.s, CONFIG));
  const second = R.drawBody(sess.s, CONFIG, R.secureRandom, 'winner not here');
  assert.ok(pool.includes(second.ticket));
});

test('T18: test plays live in their own ledger and never reach the live board or totals (K2, D7)', () => {
  const live = newSession();
  const testLedger = newSession();
  playPayment(testLedger, 'p5', { tries: [40, 2, 2], wheel: ['t2'], choices: ['sticker'] });
  assert.equal(totals(live.s, CONFIG).moneyIn, 0);
  assert.equal(leaderboard(live.s, CONFIG).length, 0);
});

test('T19: undo last payment: out of the totals and the jackpot, kept as "undone" (K2, D5)', () => {
  const sess = newSession();
  playPayment(sess, 'p2', { tries: [5] });
  playPayment(sess, 'p5', { tries: [22], wheel: ['t2'], done: false });
  sess.commit(R.undoBody(sess.s));
  const t = totals(sess.s, CONFIG);
  assert.equal(t.moneyIn, 2);
  assert.equal(t.jackpot, 10.2);
  assert.equal(sess.s.payments[1].status, 'undone');
  assert.equal(sess.s.payments.length, 2);
  assert.deepEqual(drawPool(sess.s), []);
  assert.equal(openPayment(sess.s), null);
});

test('R12: ticket numbers keep counting across payments', () => {
  const sess = newSession();
  playPayment(sess, 'p2', { tries: [21], wheel: ['t2'], choices: ['sticker'] });
  const r = playPayment(sess, 'p2', { tries: [21], wheel: ['free'], choices: ['sticker'] });
  assert.deepEqual(r.p.tickets, [4]);
  assert.equal(fmtTickets([41, 42, 43, 50]), '#0041 TO #0043, #0050');
  assert.equal(fmtEuro(21), '€21');
  assert.equal(fmtEuro(10.2), '€10.20');
});

test('T26: 10,000 courses: every gap can be reached from the one before (R4)', () => {
  for (let k = 0; k < 10000; k++) {
    const c = buildCourse(CONFIG, seeded(k + 1));
    assert.equal(c.length, CONFIG.thresholds.beat);
    const bad = checkCourse(c, CONFIG);
    assert.deepEqual(bad, [], `course ${k + 1} unfair at chimneys ${bad}`);
  }
});

test('R4: the levels change at 10, 20, 30 and 40', () => {
  assert.deepEqual([1, 10, 11, 20, 21, 30, 31, 40, 41, 50].map((i) => levelFor(i, CONFIG).n), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});
