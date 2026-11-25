// Final test pass (part 3, 25 Nov 2026): every sold-out mix of the wheel (R24, R27), the wheel picks, GTA 6 (R14, R22),
// no top score prize (R29), the times (R26), the draw with a crash, NOT HERE and undo (R14, D9, D13), and CSV totals (K2).
// T60-T67 in SPEC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { buildState } from '../src/ledger.js';
import { liveOdds, drawState, summary, stock, timeState } from '../src/prizes.js';
import { buildPieces } from '../src/wheel.js';
import { buildCsv } from '../src/report.js';
import { newSession, playPayment } from './helpers.mjs';

const ALL = { gold: 5, silver: 8, bronze: 7 };
const win = (sess, id) => playPayment(sess, 'p1', { tries: [22], choices: ['sweet'], wheel: [id], nick: `P${sess.s.payments.length + 1}` });
const sellOut = (sess, tiers) => { for (const t of tiers) for (let i = 0; i < ALL[t]; i++) win(sess, t); };
const CODE = { gold: 'G', silver: 'S', bronze: 'B', free: 'F', t2: 'E', cash: 'C' };
const show = (live) => live.list.filter((x) => x.odds > 0).map((x) => `${CODE[x.id]}${x.odds}`).join(' ');

// The table from the part 3 request: sold-out tiers -> the exact live odds.
const TABLE = [
  [[], 'G4 S12 B14 F26 E44'], [['gold'], 'S16 B14 F26 E44'], [['silver'], 'G4 B26 F26 E44'],
  [['gold', 'silver'], 'B30 F26 E44'], [['bronze'], 'G4 S12 F26 E58'], [['gold', 'bronze'], 'S16 F26 E58'],
  [['silver', 'bronze'], 'G4 F26 E70'], [['gold', 'silver', 'bronze'], 'F26 E74'],
];
const files = (dir, ext) => readdirSync(new URL(`../${dir}/`, import.meta.url)).filter((f) => f.endsWith(ext)).map((f) => [`${dir}/${f}`, readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8')]);
const CODE_FILES = [...files('src', '.js'), ...files('print', '.html'), ['index.html', readFileSync(new URL('../index.html', import.meta.url), 'utf8')]];

test('T60: every sold-out mix gives exactly the agreed odds; all + cash ON = F26 E72 C2 (R24, R27)', () => {
  for (const [tiers, want] of TABLE) {
    const sess = newSession();
    sellOut(sess, tiers);
    const live = liveOdds(sess.s, CONFIG, sess.clock);
    assert.equal(show(live), want, `sold out: ${tiers.join('+') || 'none'}`);
    assert.equal(live.list.reduce((a, x) => a + x.odds, 0), 100);
    if (tiers.length < 3) assert.throws(() => R.cashSwitchBody(sess.s, CONFIG, true), 'cash switch is greyed out while any tier has stock');
  }
  const sess = newSession();
  sellOut(sess, ['gold', 'silver', 'bronze']);
  sess.commit(R.cashSwitchBody(sess.s, CONFIG, true));
  assert.equal(show(liveOdds(sess.s, CONFIG, sess.clock)), 'F26 E72 C2');
});

test('T61: the wheel never lands on a 0% slice, and slice sizes and real picks match the live odds (R7, R24)', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [tiers] of TABLE) {
    const sess = newSession();
    sellOut(sess, tiers);
    const live = liveOdds(sess.s, CONFIG, sess.clock);
    const pieces = buildPieces(CONFIG, live);
    for (const x of live.list) {
      const area = pieces.filter((p) => p.gives === x.id).reduce((a, p) => a + p.size, 0) / (2 * Math.PI) * 100;
      assert.ok(Math.abs(area - x.odds) < 1e-9, `${x.id}: slice ${area} vs ${x.odds}`);
    }
    const n = 20000;
    const got = {};
    for (let i = 0; i < n; i++) { const id = R.pickOutcome(live.list, rnd); got[id] = (got[id] || 0) + 1; }
    for (const x of live.list) {
      if (x.odds === 0) assert.equal(got[x.id] || 0, 0, `${x.id} is 0% but was picked`);
      else assert.ok(Math.abs((100 * (got[x.id] || 0)) / n - x.odds) < 1.2, `${x.id}: ${(100 * got[x.id]) / n}% vs ${x.odds}%`);
    }
  }
});

test('T62: cash: max 3 wins a day, then back to +2; restocking switches it off by itself (R27)', () => {
  const sess = newSession();
  sellOut(sess, ['gold', 'silver', 'bronze']);
  sess.commit(R.cashSwitchBody(sess.s, CONFIG, true));
  for (let i = 0; i < CONFIG.CASH_FALLBACK_MAX_WINS; i++) win(sess, 'cash');
  assert.equal(show(liveOdds(sess.s, CONFIG, sess.clock)), 'F26 E74');
  assert.equal(summary(sess.s, CONFIG, sess.clock).cashPaid, 10 * CONFIG.CASH_FALLBACK_MAX_WINS);
  const b = newSession();
  sellOut(b, ['gold', 'silver', 'bronze']);
  b.commit(R.cashSwitchBody(b.s, CONFIG, true));
  b.commit(R.stockBody(b.s, CONFIG, 'shirt', 1));
  const off = R.cashAutoOffBody(b.s, CONFIG);
  assert.ok(off, 'restock gives a logged cash-off event');
  b.commit(off);
  assert.equal(show(liveOdds(b.s, CONFIG, b.clock)), 'B30 F26 E44'); // gold and silver still move down to bronze
});

test('T63: GTA 6 is never on the wheel or at a hand-over, and the draw gives it exactly once, last, even after NOT HERE (R14, R22)', () => {
  assert.ok(!CONFIG.wheel.outcomes.some((o) => o.sponsor === 'reserved' || o.id === 'gta6'));
  for (const t of Object.keys(ALL)) assert.ok(!R.itemsLeft(t, newSession().s, CONFIG).some((it) => it.id === 'gta6'));
  const sess = newSession();
  for (let i = 0; i < 12; i++) win(sess, 't2');
  const order = [];
  for (let g = 0; g < 60 && drawState(sess.s, CONFIG).next; g++) {
    const d = sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock));
    order.push(d);
    if (d.item === 'gta6' && order.filter((x) => x.item === 'gta6').length === 1) sess.commit(R.notHereBody(d, 'not at the stall'));
  }
  const gta = order.filter((d) => d.item === 'gta6');
  assert.equal(gta.length, 2, 'drawn, NOT HERE, drawn again');
  assert.notEqual(gta[0].ticket, gta[1].ticket);
  assert.equal(order.at(-1).item, 'gta6', 'GTA 6 last');
  assert.equal(stock(sess.s, CONFIG).tiers.reserved.given, 1, 'given once');
  assert.throws(() => R.drawBody(sess.s, CONFIG), 'no second GTA 6');
  const won = order.filter((d) => d.ticket != null).map((d) => d.ticket);
  assert.equal(new Set(won).size, won.length, 'one draw entry wins once');
});

test('T64: a crash and reload DURING the draw goes on from where it stopped; draw undo lets it run again (R14, D9, D13)', () => {
  const sess = newSession();
  for (let i = 0; i < 12; i++) win(sess, 't2');
  for (let k = 0; k < 9; k++) sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock));
  const before = JSON.stringify([drawState(sess.s, CONFIG).next, summary(sess.s, CONFIG, sess.clock)]);
  sess.s = buildState([...sess.events].reverse());
  assert.equal(JSON.stringify([drawState(sess.s, CONFIG).next, summary(sess.s, CONFIG, sess.clock)]), before);
  for (let g = 0; g < 60 && drawState(sess.s, CONFIG).next; g++) sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock));
  assert.equal(drawState(sess.s, CONFIG).done, true);
  assert.equal(summary(sess.s, CONFIG, sess.clock).drawWinners.length, 21);
  assert.throws(() => R.undoDrawBody(''));
  sess.commit(R.undoDrawBody('wrong box used'));
  assert.ok(drawState(sess.s, CONFIG).next, 'the draw can run again');
  assert.equal(summary(sess.s, CONFIG, sess.clock).drawWinners.length, 0);
  assert.equal(stock(sess.s, CONFIG).tiers.reserved.given, 0);
});

test('T65: the CSV summary totals match the summary, also after an undo (K2, D5)', () => {
  const sess = newSession();
  playPayment(sess, 'p3', { tries: [12, 4, 31], choices: ['sweet'], wheel: ['bronze'], nick: 'AMY' });
  playPayment(sess, 'p5', { tries: [3, 3, 3, 3, 3] });
  win(sess, 't2');
  sess.commit(R.undoBody(sess.s));
  const sm = summary(sess.s, CONFIG, sess.clock);
  const csv = buildCsv(sess.s, CONFIG, 'live', sess.clock);
  const row = (name) => csv.split('\n').find((l) => l.startsWith(name)).split(',');
  assert.equal(Number(row('total taken (eur)')[1]), sm.taken);
  assert.equal(sm.taken, 16.5);
  assert.equal(Number(row('draw entries given')[1]), sm.tickets);
  assert.equal(Number(row('cards used')[1]), sm.cards);
  assert.equal(Number(row('sweets given')[1]), sm.sweets);
  assert.equal(Number(row('undone payments')[1]), 1);
  assert.equal(Number(row('10 eur cash paid (eur)')[1]), 0);
});

test('T66: no top score prize anywhere: not in the code, the words, the F9 summary or the CSV (R29)', () => {
  for (const [name, text] of CODE_FILES) assert.ok(!/top.?score/i.test(text), `${name} mentions a top score`);
  assert.ok(!/top.?score/i.test(JSON.stringify(CONFIG)));
  const sess = newSession();
  win(sess, 't2');
  assert.ok(!Object.keys(summary(sess.s, CONFIG, sess.clock)).some((k) => /top/i.test(k)));
  assert.ok(!/top/i.test(buildCsv(sess.s, CONFIG, 'live', sess.clock)));
});

test('T67: times: 12:45 warning, 12:50 last payment, 13:00 draw; no other screen time for the draw (R26)', () => {
  assert.deepEqual([CONFIG.event.lastGameWarn, CONFIG.event.lastPayment, CONFIG.event.drawTime], ['12:45', '12:50', '13:00']);
  for (const [name, text] of CODE_FILES) {
    if (name === 'src/config.js') continue;
    assert.ok(!/12:(30|35|45)/.test(text), `${name} has an old time written in it`);
  }
  assert.ok(!/12:(30|35|45)/.test(JSON.stringify(CONFIG.text)), 'no old time in the screen words');
  assert.ok(CONFIG.text.drawHeadline.includes('{draw}'));
  const day = (h, m) => new Date(2026, 10, 26, h, m);
  assert.deepEqual([timeState(CONFIG, day(12, 44)), timeState(CONFIG, day(12, 45)), timeState(CONFIG, day(12, 50))], ['', 'warn', 'late']);
});

test('T68: chimney 10 entry for PAID tries only; free tries still win 20/30; key 3 bonus stays (R5, R10)', () => {
  const sess = newSession();
  const a = playPayment(sess, 'p1', { tries: [12, 15], choices: ['free'] }); // €2.50: paid 12, free try 15
  assert.deepEqual(a.p.tries.map((t) => t.source), ['paid', 'free-p10']);
  assert.equal(a.p.tickets.length, 1, 'the free try reached 10 but gives no entry');
  const b = playPayment(sess, 'p1', { tries: [12, 31], choices: ['free'], wheel: ['t2'] }); // the free try reaches 31
  assert.equal(b.p.tickets.length, 1 + 3 + 2, 'paid ch10 + chimney 30 and the wheel won by the free try');
  const c = playPayment(sess, 'p5', { tries: [3, 3, 3, 3, 3] });
  assert.equal(c.p.tickets.length, 1, '€10 bonus entry');
});

test('T69: restarts are 3 per PAYMENT, shared by all its tries (R3)', () => {
  const sess = newSession();
  sess.commit(R.payBody(sess.s, 'p5', CONFIG));
  const p = sess.s.payments.at(-1);
  assert.equal(R.restartsLeft(p, CONFIG), 3);
  assert.ok(R.isFreeRestart(2, R.restartsUsed(p) + 2, CONFIG));
  sess.commit(R.tryBody(p, 8, 2)); // try 1 used 2 restarts
  assert.equal(R.restartsLeft(sess.s.payments.at(-1), CONFIG), 1);
  sess.commit(R.tryBody(sess.s.payments.at(-1), 7, 1)); // try 2 used the last one
  const q = sess.s.payments.at(-1);
  assert.equal(R.restartsLeft(q, CONFIG), 0);
  assert.ok(!R.isFreeRestart(2, R.restartsUsed(q), CONFIG), 'with 0 left a crash before 5 ends the try');
});

test('T70: chimney 30 / 40 / 50 give 3 / 7 / 12 draw entries, once per payment, also in test mode (R8, R20, R21)', () => {
  for (const [best, want] of [[31, 3], [42, 7], [50, 12]]) {
    const sess = newSession();
    sess.commit({ ...R.payBody(sess.s, 'p1', CONFIG), mode: 'test' });
    const p = sess.s.payments.at(-1);
    sess.commit(R.tryBody(p, best));
    const parts = R.ticketParts(sess.s.payments.at(-1), CONFIG).parts.filter((x) => ['p30', 'p40', 'p50'].includes(x.why));
    assert.equal(parts.reduce((a, x) => a + x.n, 0), want, `best ${best}`);
  }
  const r = playPayment(newSession(), 'p3', { tries: [50, 45, 33], choices: ['sweet'], wheel: ['t2'] });
  assert.equal(r.p.tickets.length, 3 + 12 + 2, 'three paid tries at 10, levels once (best 50), wheel');
});
