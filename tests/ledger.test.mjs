// Ledger, draw, undo and course tests: T12 (logic), T16-T19, T26.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { buildState, openPayment, totals, leaderboard, drawPool, fmtTickets, fmtRange, fmtEuro } from '../src/ledger.js';
import { drawState, stock } from '../src/prizes.js';
import { buildCourse, checkCourse, seeded, levelFor } from '../src/course.js';
import { newSession, playPayment } from './helpers.mjs';

test('T12 (logic): a rebuilt state reopens the €6.50 payment with 2 tries left and the best kept (D3)', () => {
  const sess = newSession();
  const r = playPayment(sess, 'p3', { tries: [7], done: false });
  assert.equal(r.stoppedAt, 'fly');
  const again = buildState(sess.events);
  const p = openPayment(again);
  assert.ok(p);
  assert.equal(R.triesLeft(p), 2);
  assert.equal(p.best, 7);
});

test('T16: a draw with no tickets: the items stay with the team, the jackpot stays with the charity (R14)', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [5] });
  const rest = sess.commit(R.drawBody(sess.s, CONFIG));
  assert.equal(rest.prize, 'rest');
  assert.equal(rest.items.length, 14); // 9 bronze + 2 silver + 3 gold, in draw order
  assert.equal(rest.items[0], 'shirtS');
  const jp = sess.commit(R.drawBody(sess.s, CONFIG));
  assert.equal(jp.prize, 'jackpot');
  assert.equal(jp.ticket, null);
  assert.equal(drawState(sess.s, CONFIG).done, true);
});

test('T17: the draw picks only issued tickets, each ticket wins once, and it cannot run twice unless undone (R14, D13)', () => {
  const sess = newSession();
  for (let i = 0; i < 12; i++) playPayment(sess, 'p1', { tries: [33], wheel: ['t2'], choices: ['sweet'] }); // 5 tickets each
  const pool = drawPool(sess.s);
  assert.equal(pool.length, 60);
  const winners = [];
  for (let guard = 0; guard < 40 && drawState(sess.s, CONFIG).next; guard++) {
    const ev = sess.commit(R.drawBody(sess.s, CONFIG));
    if (ev.ticket != null) { assert.ok(pool.includes(ev.ticket)); winners.push(ev.ticket); }
  }
  assert.equal(new Set(winners).size, winners.length, 'one ticket wins only once');
  assert.equal(winners.length, 14 + 1); // every item, then the jackpot
  assert.throws(() => R.drawBody(sess.s, CONFIG));
  assert.throws(() => R.undoDrawBody(''));
  sess.commit(R.undoDrawBody('wrong button'));
  assert.equal(drawState(sess.s, CONFIG).done, false);
  assert.equal(stock(sess.s, CONFIG).tiers.gold.left, 3); // the items are back for the new draw
});

test('T18: test plays live in their own ledger and never reach the live board or totals (K2, D7)', () => {
  const live = newSession();
  const testLedger = newSession();
  playPayment(testLedger, 'p3', { tries: [40, 2, 2], wheel: ['gold'], choices: ['sweet'] });
  assert.equal(stock(live.s, CONFIG).tiers.gold.left, 3);
  assert.equal(totals(live.s, CONFIG).moneyIn, 0);
  assert.equal(leaderboard(live.s, CONFIG).length, 0);
});

test('T19: undo last payment: out of the totals, the stock and the caps, kept as "undone" (K2, D5)', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [5] });
  playPayment(sess, 'p3', { tries: [22, 1, 1], choices: ['sweet'], wheel: ['gold'], done: false });
  assert.equal(stock(sess.s, CONFIG).tiers.gold.free, 2);
  sess.commit(R.undoBody(sess.s));
  const t = totals(sess.s, CONFIG);
  assert.equal(t.moneyIn, 2.5);
  assert.equal(sess.s.payments[1].status, 'undone');
  assert.equal(sess.s.payments.length, 2);
  assert.deepEqual(drawPool(sess.s), []);
  assert.equal(openPayment(sess.s), null);
  assert.equal(stock(sess.s, CONFIG).tiers.gold.free, 3);
});

test('R12: ticket numbers keep counting across payments; "#0012-#0013" on the GIVE screen', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [21], wheel: ['t2'], choices: ['sweet'] });
  const r = playPayment(sess, 'p1', { tries: [31], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(r.p.tickets, [3, 4, 5, 6, 7]);
  assert.equal(fmtRange([12, 13]), '#0012-#0013');
  assert.equal(fmtTickets([41, 42, 43, 50]), '#0041 TO #0043, #0050');
  assert.equal(fmtEuro(21), '€21');
  assert.equal(fmtEuro(2.5), '€2.50');
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
