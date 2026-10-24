// Rule tests: T1-T11, T15, T20, T21, T23, T25 from SPEC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { totals, leaderboard, legends, displayName } from '../src/ledger.js';
import { newSession, playPayment, cfgWith } from './helpers.mjs';

const kinds = (items) => items.map((i) => i.kind);

test('config has no mistakes', () => {
  assert.deepEqual(R.checkConfig(CONFIG), []);
});

test('T1: €2, crash at pillar 1 gives a free restart (R3)', () => {
  assert.equal(R.isFreeRestart(1, 0, CONFIG), true);
  assert.equal(R.isFreeRestart(0, 0, CONFIG), true);
  assert.equal(R.isFreeRestart(2, 0, CONFIG), false);
});

test('T2: the 4th crash at pillar 1 uses the try, best 1, no prize (R3)', () => {
  let restarts = 0;
  while (R.isFreeRestart(1, restarts, CONFIG)) restarts++;
  assert.equal(restarts, 3);
  const sess = newSession();
  const r = playPayment(sess, 'p2', { tries: [1] });
  assert.equal(r.p.best, 1);
  assert.deepEqual(r.items, []);
});

test('T3: €2, best try 7: no prize', () => {
  const r = playPayment(newSession(), 'p2', { tries: [7] });
  assert.deepEqual(r.items, []);
  assert.equal(r.steps.at(-1), 'handover');
});

test('T4: €2, best 12, picks sticker: 1 sticker (R5)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [12], choices: ['sticker'] });
  assert.deepEqual(r.items, [{ kind: 'prize', text: '1 STICKER' }]);
});

test('T5: €2, best 12, free try, then 14: no prize; with R11 on: 1 sticker', () => {
  const off = playPayment(newSession(), 'p2', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(off.items, []);
  assert.equal(off.p.best, 14);
  const cfg = cfgWith({ consolation: { on: true, item: 'STICKER' } });
  const on = playPayment(newSession(cfg), 'p2', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(on.items, [{ kind: 'prize', text: '1 STICKER' }]);
});

test('T6: €2, best 12, free try, then 21: 1 ticket + spin, no pillar 10 prize (R5, R6, R10)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [12, 21], choices: ['free'], wheel: ['t2'] });
  assert.equal(r.steps.filter((x) => x.startsWith('choice')).length, 1);
  assert.equal(r.p.tickets.length, 3);
  assert.deepEqual(kinds(r.items), ['tickets']);
});

test('T7: €2, try 22, wheel +5: then the pillar 10 choice. Small prize + 6 tickets (R6, R7, R9)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [22], wheel: ['t5'], choices: ['token'] });
  assert.deepEqual(r.steps.slice(1, 4), ['award:p20', 'wheel', 'choice:free']);
  assert.equal(r.p.tickets.length, 6);
  assert.deepEqual(kinds(r.items), ['prize', 'tickets']);
});

test('T8: €2, try 22, wheel free try, next try 9: best 22, no second spin, then choice (R2, R10)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [22, 9], wheel: ['free'], choices: ['cookie'] });
  assert.equal(r.p.best, 22);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.ok(r.steps.includes('choice:free'));
  assert.equal(r.p.tries[1].source, 'free-wheel');
});

test('T9: €2, passes 30, crash at 33, wheel +2: 6 tickets, Legend, choice with free tile (R5, R8, R9)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [33], wheel: ['t2'], choices: ['sticker'] });
  assert.equal(r.p.tickets.length, 6);
  assert.deepEqual(r.p.tickets, [1, 2, 3, 4, 5, 6]);
  assert.ok(r.steps.includes('choice:free'));
  assert.ok(kinds(r.items).includes('legend'));
});

test('T10: €5, tries 5, 12, 9: the pillar 10 choice comes after the 3rd try (R5)', () => {
  const r = playPayment(newSession(), 'p5', { tries: [5, 12, 9], choices: ['sticker'] });
  assert.deepEqual(r.steps.slice(0, 4), ['fly', 'fly', 'fly', 'choice:free']);
});

test('T11: €5, try 1 reaches 23, wheel free try: ticket + spin after try 1, then 3 tries left (R6, R10)', () => {
  const sess = newSession();
  const r = playPayment(sess, 'p5', { tries: [23], wheel: ['free'] });
  assert.equal(r.stoppedAt, 'fly');
  assert.deepEqual(r.steps.slice(0, 4), ['fly', 'award:p20', 'wheel', 'fly']);
  assert.equal(R.triesLeft(r.p), 3);
});

test('T15: 100,000 spins: each slice within 0.5 points of its odds (R7)', () => {
  const n = 100000;
  const count = {};
  for (let i = 0; i < n; i++) {
    const o = R.pickOutcome(CONFIG);
    count[o.id] = (count[o.id] || 0) + 1;
  }
  for (const o of CONFIG.wheel.outcomes) {
    const pct = ((count[o.id] || 0) / n) * 100;
    assert.ok(Math.abs(pct - o.odds) < 0.5, `${o.id}: ${pct.toFixed(2)}% vs ${o.odds}%`);
  }
});

test('T20: 30 x €2 and 10 x €5 (€110): the jackpot is €21 (R13)', () => {
  const sess = newSession();
  for (let i = 0; i < 30; i++) playPayment(sess, 'p2', { tries: [3] });
  for (let i = 0; i < 10; i++) playPayment(sess, 'p5', { tries: [3, 3, 3] });
  const t = totals(sess.s, CONFIG);
  assert.equal(t.moneyIn, 110);
  assert.equal(t.jackpot, 21);
});

test('T21: two players tie on 18: the first one ranks higher (L1)', () => {
  const sess = newSession();
  playPayment(sess, 'p2', { tries: [18], choices: ['sticker'], nick: 'FIRST' });
  playPayment(sess, 'p2', { tries: [18], choices: ['sticker'], nick: 'SECOND' });
  const board = leaderboard(sess.s, CONFIG);
  assert.deepEqual(board.map((p) => p.nick), ['FIRST', 'SECOND']);
});

test('T23: crash at 37: same prizes as 30, the leaderboard shows 37 (R19)', () => {
  const a = playPayment(newSession(), 'p2', { tries: [37], wheel: ['t2'], choices: ['sticker'] });
  const b = playPayment(newSession(), 'p2', { tries: [30], wheel: ['t2'], choices: ['sticker'] });
  assert.deepEqual(a.items, b.items);
  assert.equal(a.p.best, 37);
});

test('T24: passing 40 shows MASTER before the nickname (R20)', () => {
  const sess = newSession();
  const r = playPayment(sess, 'p2', { tries: [41], wheel: ['t2'], choices: ['sticker'], nick: 'SAM' });
  assert.equal(displayName(r.p, CONFIG), 'MASTER SAM');
  assert.equal(legends(sess.s, CONFIG).length, 1);
});

test('T25: passing 50: the choice has no free-try tile (R5, R21)', () => {
  const r = playPayment(newSession(), 'p2', { tries: [50], wheel: ['cash'], choices: ['token'] });
  assert.ok(r.steps.includes('choice:nofree'));
  assert.throws(() => R.choiceBody(r.p, 'free', CONFIG));
  assert.ok(kinds(r.items).includes('cash'));
});

test('R15: each prize level is given at most once per payment', () => {
  const r = playPayment(newSession(), 'p5', { tries: [25, 31, 35], wheel: ['t5'], choices: ['cookie'] });
  assert.equal(r.steps.filter((x) => x === 'award:p20').length, 1);
  assert.equal(r.steps.filter((x) => x === 'award:p30').length, 1);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.equal(r.p.tickets.length, 1 + 5 + 3);
});

test('S9: no nickname is asked when the score does not reach the top 10', () => {
  const sess = newSession();
  for (let i = 0; i < 10; i++) playPayment(sess, 'p2', { tries: [15], choices: ['sticker'] });
  const r = playPayment(sess, 'p2', { tries: [4] });
  assert.ok(!r.steps.includes('nick'));
});
