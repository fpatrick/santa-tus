// Rule tests: T1-T11, T15, T20, T21, T23-T25, T33, T34, T50-T56 from SPEC.md (prices, tickets, ladder, order, free tries).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { totals, leaderboard, legends, displayName, rankOf, fmtRange } from '../src/ledger.js';
import { baseOdds, summary } from '../src/prizes.js';
import { newSession, playPayment, cfgWith } from './helpers.mjs';

const kinds = (items) => items.map((i) => i.kind);

test('config has no mistakes', () => {
  assert.deepEqual(R.checkConfig(CONFIG), []);
});

test('T33: keys 1-3: €2.50/1, €6.50/3, €10/5 + 1 bonus draw entry (R1)', () => {
  // key: [amount, tries, bonus]
  const want = { 1: [2.5, 1, 0], 2: [6.5, 3, 0], 3: [10, 5, 1] };
  assert.equal(CONFIG.prices.length, 3);
  for (const [key, [amount, tries, bonus]] of Object.entries(want)) {
    const pr = CONFIG.prices.find((p) => p.key === key);
    const sess = newSession();
    const ev = sess.commit(R.payBody(sess.s, pr.id, CONFIG));
    assert.equal(ev.amount, amount, `key ${key}`);
    assert.equal(ev.tries, tries, `key ${key}`);
    assert.equal(R.triesLeft(sess.s.byPid.get(ev.pid)), tries);
    assert.equal(ev.bonus, bonus, `key ${key}`);
    assert.equal(ev.buy, undefined, `key ${key}`);
  }
  assert.equal(CONFIG.prices.find((p) => p.key === '3').badge, 'BEST VALUE +1 BONUS DRAW ENTRY');
  assert.throws(() => R.payBody(newSession().s, 'p2', CONFIG)); // the old €2 price is gone
});

test('T55: on screen a draw ticket is always a DRAW ENTRY, never a ticket or raffle ticket; a play is a TRY (R12)', () => {
  const seen = [];
  const walk = (v, path) => {
    if (typeof v === 'string') seen.push([path, v]);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(CONFIG.text, 'text');
  for (const p of CONFIG.prices) { walk(p.label, `prices.${p.id}.label`); walk(p.badge, `prices.${p.id}.badge`); }
  for (const o of CONFIG.wheel.outcomes) { walk(o.label, `wheel.${o.id}.label`); walk(o.short, `wheel.${o.id}.short`); }
  walk(CONFIG.wheel.soldOut, 'wheel.soldOut');
  walk(CONFIG.wheel.jackpotDone, 'wheel.jackpotDone');
  const bad = seen.filter(([, v]) => /TICKET|RAFFLE/i.test(v.replace(/\{\w+\}/g, ''))); // {TICKETS} is a placeholder, not a word on screen
  assert.deepEqual(bad, []);
  assert.equal(CONFIG.text.ticket, 'DRAW ENTRY');
  assert.equal(CONFIG.text.tickets, 'DRAW ENTRIES');
  assert.equal(CONFIG.wheel.outcomes.find((o) => o.id === 't2').label, '+2 DRAW ENTRIES');
  assert.equal(CONFIG.wheel.soldOut.replace('\n', ' '), 'SOLD OUT - +2 DRAW ENTRIES');
  assert.deepEqual(CONFIG.prices.map((p) => p.label), ['€2.50 = 1 TRY', '€6.50 = 3 TRIES', '€10 = 5 TRIES']);
  assert.equal(CONFIG.text.alreadyWonHint.replace('{n}', 2).split(' · ')[0], 'Y = GIVE +2 DRAW ENTRIES INSTEAD');
  assert.equal(fmtRange([12, 13, 14], CONFIG.text.rangeTo), '#0012 TO #0014');
});

test('T56: "cards used" = payments that got at least 1 draw entry (one paper card each) (R12)', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [12], choices: ['sweet'] }); // 1 entry: card 1
  playPayment(sess, 'p1', { tries: [4] }); // no entry: no card
  playPayment(sess, 'p1', { tries: [15], choices: ['sweet'] }); // 1 entry: card 2
  playPayment(sess, 'p5', { tries: [3, 3, 3, 3, 3] }); // bonus entry: card 3
  const sm = summary(sess.s, CONFIG);
  assert.equal(sm.cards, 3);
  assert.equal(sm.tickets, 3);
});

test('T50: draw entries come ONLY from playing: no price sells them, and keys 4-6 are not price keys (R1)', () => {
  assert.deepEqual(CONFIG.prices.map((p) => p.key), ['1', '2', '3']);
  for (const k of ['4', '5', '6']) assert.equal(CONFIG.prices.find((p) => p.key === k), undefined);
  assert.ok(CONFIG.prices.every((p) => p.tries > 0 && !p.buy));
  for (const id of ['t1', 't3', 't6']) assert.throws(() => R.payBody(newSession().s, id, CONFIG));
  const r = playPayment(newSession(), 'p1', { tries: [4] });
  assert.deepEqual(r.p.tickets, []); // no play past 10 = no draw entry
});

test('T51: +1 ticket for EVERY try that reaches chimney 10 (per try, not per payment), all on one screen (R5, R12)', () => {
  const r = playPayment(newSession(), 'p5', { tries: [10, 12, 3, 15, 19], choices: ['sweet'] });
  // 4 tries reached 10 = 4 tickets, + 1 bonus ticket (key 3)
  assert.equal(r.p.tickets.length, 5);
  assert.equal(r.steps.filter((x) => x === 'tickets').length, 1);
  const ev = r.sess.events.find((e) => e.t === 'award' && e.kind === 'tickets');
  assert.deepEqual(ev.parts, [{ why: 'per10', n: 4, tries: 4 }, { why: 'bonus', n: 1 }]);
  const one = playPayment(newSession(), 'p3', { tries: [9, 9, 9] });
  assert.equal(one.p.tickets.length, 0); // nobody reached 10: no ticket screen
  assert.ok(!one.steps.includes('tickets'));
});

test('T52: key 3 gives +1 bonus ticket even when no try reaches 10 (R1)', () => {
  const r = playPayment(newSession(), 'p5', { tries: [3, 3, 3, 3, 3] });
  assert.deepEqual(r.steps.slice(-2), ['tickets', 'handover']);
  assert.deepEqual(r.p.tickets, [1]);
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
  assert.deepEqual(r.items, [{ kind: 'prize', text: '1 SWEET' }, { kind: 'tickets', count: 1, tickets: [1] }]);
  assert.deepEqual(CONFIG.choice.map((c) => c.id), ['sweet', 'free']); // cookie, 3D token and sticker are gone
});

test('T5: best 12, free try, then 14: no prize; with R11 on: 1 sweet', () => {
  const off = playPayment(newSession(), 'p1', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(kinds(off.items), ['tickets']); // only the chimney 10 entry of the PAID try (the free try gives none, R5)
  assert.equal(off.p.tickets.length, 1);
  assert.equal(off.p.best, 14);
  const on = playPayment(newSession(cfgWith({ consolation: { on: true, item: 'SWEET' } })), 'p1', { tries: [12, 14], choices: ['free'] });
  assert.deepEqual(on.items[0], { kind: 'prize', text: '1 SWEET' });
});

test('T6: best 12, free try, then 21: a wheel spin, no sweet, the choice only once (R5, R6, R10)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [12, 21], choices: ['free'], wheel: ['t2'] });
  assert.equal(r.steps.filter((x) => x.startsWith('choice')).length, 1);
  assert.equal(r.p.tickets.length, 1 + 2); // the paid try reached 10 (the free try gives no ch10 entry) + the wheel +2
  assert.deepEqual(kinds(r.items), ['tickets']);
});

test('T7: €2.50, try 22: at the end the choice comes first, then the wheel (R9)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [22], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(r.steps.filter((x) => x !== 'nick'), ['fly', 'choice:free', 'wheel', 'tickets', 'handover']);
  assert.deepEqual(kinds(r.items), ['prize', 'tickets']);
  assert.deepEqual(r.p.tickets, [1, 2, 3]); // 1 (chimney 10) + 2 (wheel)
});

test('T8: try 22, sweet, wheel free try, next try 9: best 22, no second spin (R2, R10, R15)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [22, 9], wheel: ['free'], choices: ['sweet'] });
  assert.equal(r.p.best, 22);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.equal(r.p.tries[1].source, 'free-wheel');
  assert.throws(() => R.wheelBody(r.p, newSession().s, CONFIG));
});

test('T9: passes 30, crash at 33: choice, wheel +2, then 5 tickets + LEGEND on the ticket screen (R8, R9)', () => {
  const r = playPayment(newSession(), 'p1', { tries: [33], wheel: ['t2'], choices: ['sweet'] });
  assert.deepEqual(r.steps.filter((x) => x !== 'nick').slice(1, 4), ['choice:free', 'wheel', 'tickets']);
  assert.deepEqual(r.p.tickets, [1, 2, 3, 4, 5, 6]); // 1 (chimney 10) + 3 (chimney 30) + 2 (wheel)
  assert.equal(r.p.p30, true);
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
  assert.deepEqual(r.steps.filter((x) => x !== 'nick'), ['fly', 'choice:free', 'fly', 'wheel', 'fly', 'tickets', 'handover']);
  assert.equal(r.p.tries.length, 3);
  assert.deepEqual(r.p.tries.map((t) => t.source), ['paid', 'free-p10', 'free-wheel']);
  assert.equal(r.p.tickets.length, 1 + 3); // only the PAID try's chimney 10 entry (1) + chimney 30 won by a free try (3)
  // a free-try chain that ends low keeps the chimney 10 entry of the paid try
  const low = playPayment(newSession(), 'p1', { tries: [12, 4], choices: ['free'] });
  assert.equal(low.p.tickets.length, 1);
});

test('T15: 100,000 spins on the base odds: each slice within 0.5 points (R7)', () => {
  const base = baseOdds(CONFIG).map((x) => ({ id: x.o.id, odds: x.odds }));
  assert.deepEqual(Object.fromEntries(base.filter((x) => x.odds > 0).map((x) => [x.id, x.odds])), { gold: 4, silver: 12, bronze: 14, free: 26, t2: 44 });
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
  assert.equal(r.steps.filter((x) => x === 'tickets').length, 1);
  assert.equal(r.steps.filter((x) => x === 'wheel').length, 1);
  assert.equal(r.p.tickets.length, 3 + 1 + 3 + 2); // 3 paid tries reached 10, bonus, chimney 30, wheel
  assert.throws(() => R.awardBody('tickets', r.p, newSession().s, CONFIG)); // never a 2nd ticket screen
  assert.throws(() => R.choiceBody(r.p, 'sweet', CONFIG));
});

test('S9: no nickname when the score does not reach the best players list; always for a sponsor winner (R23)', () => {
  const sess = newSession();
  for (let i = 0; i < CONFIG.board.size; i++) playPayment(sess, 'p1', { tries: [15], choices: ['sweet'] });
  assert.ok(!playPayment(sess, 'p1', { tries: [4] }).steps.includes('nick'));
  const w = playPayment(sess, 'p1', { tries: [20], choices: ['sweet'], wheel: ['bronze'] });
  assert.ok(w.steps.includes('nick'));
});
