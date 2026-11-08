// Rule tests: T1-T11, T15, T20, T21, T23-T25, T33-T35 from SPEC.md (prices, ladder, order, free tries).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { totals, leaderboard, legends, displayName, rankOf } from '../src/ledger.js';
import { newSession, playPayment, cfgWith } from './helpers.mjs';

const kinds = (items) => items.map((i) => i.kind);

test('config has no mistakes', () => {
  assert.deepEqual(R.checkConfig(CONFIG), []);
});

test('T33: each price key: €2.50 = 1 try, €6.50 = 3 tries, €10 = 5 tries "BEST VALUE" (R1)', () => {
  const want = { 1: [2.5, 1], 2: [6.5, 3], 3: [10, 5] };
  for (const [key, [amount, tries]] of Object.entries(want)) {
    const pr = CONFIG.prices.find((p) => p.key === key);
    const sess = newSession();
    const ev = sess.commit(R.payBody(sess.s, pr.id, CONFIG));
    assert.equal(ev.amount, amount);
    assert.equal(ev.tries, tries);
    assert.equal(R.triesLeft(sess.s.byPid.get(ev.pid)), tries);
  }
  assert.equal(CONFIG.prices.find((p) => p.key === '3').badge, 'BEST VALUE');
  assert.throws(() => R.payBody(newSession().s, 'p2', CONFIG)); // the old €2 price is gone
});

test('T1: crash before chimney 5 gives a free restart (R3)', () => {
  assert.equal(R.isFreeRestart(1, 0, CONFIG), true);
  assert.equal(R.isFreeRestart(0, 0, CONFIG), true);
  assert.equal(R.isFreeRestart(4, 0, CONFIG), true);
  assert.equal(R.isFreeRestart(5, 0, CONFIG), false);
});

test('T2: the 4th crash at chimney 1 uses the try, best 1, no prize (R3)', () => {
  let restarts = 0;
  while (R.isFreeRestart(1, restarts, CONFIG)) restarts++;
  assert.equal(restarts, 3);
  const r = playPayment(newSession(), 'p1', { tries: [1] });
  assert.equal(r.p.best, 1);
  assert.deepEqual(r.items, []);
});

test('T3: €2.50, best try 7: no prize', () => {
  const r = playPayment(newSession(), 'p1', { tries: [7] });
  assert.deepEqual(r.items, []);
  assert.equal(r.steps.at(-1), 'handover');
});

test('T4: €2.50, best 12, picks SWEET: "GIVE 1 SWEET" (R5)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [12], choices: ['sweet'] });
  assert.deepEqual(r.items, [{ kind: 'prize', text: '1 SWEET' }]);
  assert.deepEqual(CONFIG.choice.map((c) => c.id), ['sweet', 'free']); // cookie, 3D token and sticker are gone
});

test('T5: best 12, free try, then 14: no prize; with R11 on: 1 sweet', () => {
  const off = playPayment(newSession(), 'p1', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(off.items, []);
  assert.equal(off.p.best, 14);
  const on = playPayment(newSession(cfgWith({ consolation: { on: true, item: 'SWEET' } })), 'p1', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(on.items, [{ kind: 'prize', text: '1 SWEET' }]);
});

test('T6: best 12, free try, then 21: a wheel spin, no sweet, the choice only once (R5, R6, R10)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [12, 21], choices: ['free'], wheel: ['t2'] });
  assert.equal(r.steps.filter((x) => x.startsWith('choice')).length, 1);
  assert.equal(r.p.tickets.length, 2);
  assert.deepEqual(kinds(r.items), ['tickets']);
});

test('T7: €2.50, try 22: at the end the choice comes first, then the wheel (R9)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [22], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(r.steps.filter((x) => x !== 'nick'), ['fly', 'choice:free', 'wheel', 'handover']);
  assert.deepEqual(kinds(r.items), ['prize', 'tickets']);
  assert.deepEqual(r.p.tickets, [1, 2]);
});

test('T8: try 22, sweet, wheel free try, next try 9: best 22, no second spin (R2, R10, R15)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [22, 9], wheel: ['free'], choices: ['sweet'] });
  assert.equal(r.p.best, 22);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.equal(r.p.tries[1].source, 'free-wheel');
  assert.throws(() => R.wheelBody(r.p, newSession().s, CONFIG));
});

test('T9: passes 30, crash at 33: choice, wheel +2, then 3 tickets + LEGEND (R8, R9)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [33], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(r.steps.slice(1, 4), ['choice:free', 'wheel', 'award:p30']);
  assert.deepEqual(r.p.tickets, [1, 2, 3, 4, 5]);
  assert.ok(kinds(r.items).includes('legend'));
});

test('T10: €6.50, tries 5, 12, 9: the chimney 10 choice comes after the 3rd try (R5)', () => {
  const r = playPayment(newSession(), 'p3', { tries: [5, 12, 9], choices: ['sweet'] });
  assert.deepEqual(r.steps.slice(0, 4), ['fly', 'fly', 'fly', 'choice:free']);
});

test('T11: €10, try 1 reaches 23: no prize until all 5 tries are played (R9)', () => {
  const r = playPayment(newSession(), 'p5', { tries: [23, 1, 1, 1] });
  assert.equal(r.stoppedAt, 'fly');
  assert.deepEqual(r.steps, ['fly', 'fly', 'fly', 'fly', 'fly']);
  assert.equal(R.triesLeft(r.p), 1);
});

test('T34: a chain of free tries: 12 -> free try -> 21 -> wheel free try -> 31: ch30 tickets after it (R10)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [12, 21, 31], choices: ['free'], wheel: ['free'] });
  assert.deepEqual(r.steps.filter((x) => x !== 'nick'), ['fly', 'choice:free', 'fly', 'wheel', 'fly', 'award:p30', 'handover']);
  assert.equal(r.p.tries.length, 3);
  assert.deepEqual(r.p.tries.map((t) => t.source), ['paid', 'free-p10', 'free-wheel']);
  assert.equal(r.p.tickets.length, 3);
});

test('T15: 100,000 spins on the base odds: each slice within 0.5 points (R7)', () => {
  const base = CONFIG.wheel.outcomes.map((o) => ({ id: o.id, odds: o.odds }));
  const n = 100000;
  const count = {};
  for (let i = 0; i < n; i++) { const id = R.pickOutcome(base); count[id] = (count[id] || 0) + 1; }
  for (const o of base) {
    const pct = ((count[o.id] || 0) / n) * 100;
    assert.ok(Math.abs(pct - o.odds) < 0.5, `${o.id}: ${pct.toFixed(2)}% vs ${o.odds}%`);
  }
  assert.equal(count.cash || 0, 0); // the €10 CASH slice is off at the start of the day
});

test('T20: 4 x €2.50, 2 x €6.50 and 1 x €10 = €33 taken (R1)', () => {
  const sess = newSession();
  for (let i = 0; i < 4; i++) playPayment(sess, 'p1', { tries: [3] });
  for (let i = 0; i < 2; i++) playPayment(sess, 'p3', { tries: [3, 3, 3] });
  playPayment(sess, 'p5', { tries: [3, 3, 3, 3, 3] });
  assert.equal(totals(sess.s, CONFIG).moneyIn, 33);
});

test('T21: two players tie on 18: the latest one ranks higher (L1)', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [18], choices: ['sweet'], nick: 'FIRST' });
  playPayment(sess, 'p1', { tries: [18], choices: ['sweet'], nick: 'SECOND' });
  assert.deepEqual(leaderboard(sess.s, CONFIG).map((p) => p.nick), ['SECOND', 'FIRST']);
});

test('T23: crash at 37: same prizes as 30, the leaderboard shows 37 (R19)', () => {
  const a = playPayment(newSession(), 'p1', { tries: [37], wheel: ['t2'], choices: ['sweet'] });
  const b = playPayment(newSession(), 'p1', { tries: [30], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(a.items, b.items);
  assert.equal(a.p.best, 37);
});

test('T24: passing 40 shows MYTHIC before the nickname (R20)', () => {
  const sess = newSession();
  const r = playPayment(sess, 'p1', { tries: [41], wheel: ['t2'], choices: ['sweet'], nick: 'SAM' });
  assert.equal(displayName(r.p, CONFIG), 'MYTHIC SAM');
  const l = playPayment(sess, 'p1', { tries: [31], wheel: ['t2'], choices: ['sweet'], nick: 'ANA' });
  assert.equal(displayName(l.p, CONFIG), 'LEGEND ANA');
  assert.equal(legends(sess.s, CONFIG).length, 2);
});

test('T25: passing 50: no free-try tile, GODLIKE before the nickname (R5, R21)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [50], wheel: ['t2'], choices: ['sweet'], nick: 'ZED' });
  assert.ok(r.steps.includes('choice:nofree'));
  assert.throws(() => R.choiceBody({ ...r.p, p10: null }, 'free', CONFIG));
  assert.equal(displayName(r.p, CONFIG), 'GODLIKE ZED');
  assert.ok(kinds(r.items).includes('godlike'));
  const m = playPayment(newSession(), 'p1', { tries: [45], wheel: ['t2'], choices: ['sweet'] });
  assert.equal(rankOf(m.p, CONFIG), 'mythic');
  assert.ok(!kinds(m.items).includes('godlike'));
});

test('R15: each prize level at most once per payment, never 2 wheel spins or 2 choices', () => {
  const r = playPayment(newSession(), 'p5', { tries: [25, 31, 35, 2, 2], wheel: ['t2'], choices: ['sweet'] });
  assert.equal(r.steps.filter((x) => x === 'award:p30').length, 1);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.equal(r.p.tickets.length, 2 + 3);
  assert.throws(() => R.choiceBody(r.p, 'sweet', CONFIG));
});

test('S9: no nickname when the score does not reach the best players list; always for a sponsor winner (R23)', () => {
  const sess = newSession();
  for (let i = 0; i < CONFIG.board.size; i++) playPayment(sess, 'p1', { tries: [15], choices: ['sweet'] });
  assert.ok(!playPayment(sess, 'p1', { tries: [4] }).steps.includes('nick'));
  const w = playPayment(sess, 'p1', { tries: [20], choices: ['sweet'], wheel: ['bronze'] });
  assert.ok(w.steps.includes('nick'));
});
