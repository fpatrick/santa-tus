// Prize system tests: sponsor stock (R22, R23), wheel fallbacks and caps (R24), the jackpot (R13, R25),
// the cash fallback (R27), the draw (R14), times (R26) and the safety rules (D9-D14). T35-T48, T53 in SPEC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { buildState } from '../src/ledger.js';
import { stock, liveOdds, jackpotInfo, drawState, summary, caps, timeState, cashSwitch } from '../src/prizes.js';
import { newSession, playPayment, cfgWith, forceWheel } from './helpers.mjs';

const H = 3600000;
const odds = (sess) => Object.fromEntries(liveOdds(sess.s, sess.cfg, sess.clock).list.map((x) => [x.id, x.odds]));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const win = (sess, id, extra = {}) => playPayment(sess, 'p1', { tries: [22], choices: ['sweet'], wheel: [id], nick: `P${sess.s.payments.length + 1}`, ...extra });

const JP = cfgWith({ JACKPOT_ENABLED: true }); // the jackpot code stays (R13): its tests run with it switched on
const ALL = { gold: 2, silver: 4, bronze: 13 }; // sponsor items at the start of the day (R22)
const sellOut = (sess, tiers = Object.keys(ALL)) => { for (const t of tiers) for (let i = 0; i < ALL[t]; i++) win(sess, t); };

test('T35: base odds at the start of the day: GOLD 4, SILVER 8, BRONZE 24, FREE TRY 26, +2 TICKETS 38; no cash, no jackpot (R7, R13)', () => {
  const sess = newSession();
  assert.deepEqual(odds(sess), { jackpot: 0, gold: 4, silver: 8, bronze: 24, free: 26, t2: 38, cash: 0 });
  assert.deepEqual(Object.fromEntries(Object.entries(stock(sess.s, CONFIG).tiers).map(([k, T]) => [k, T.left])), ALL);
  assert.equal(CONFIG.JACKPOT_ENABLED, false);
  assert.equal(CONFIG.CASH_FALLBACK_ENABLED, true);
  assert.equal(CONFIG.CASH_FALLBACK_MAX_WINS, 3);
});

test('T36: GOLD "DAY OUT FOR 4": the winner picks cinema or bowling; the sponsor name shows; stock 2 -> 1 (R22)', () => {
  const sess = newSession();
  const r = win(sess, 'gold', { item: 'bowl4' });
  const it = r.items.find((i) => i.kind === 'sponsor');
  assert.equal(it.tier, 'gold');
  assert.equal(it.label, 'FUN WORLD BOWLING, 4 GAMES');
  assert.equal(it.sponsorName, 'FUN WORLD');
  assert.equal(stock(sess.s, CONFIG).tiers.gold.left, 1);
  assert.deepEqual(R.itemsLeft('gold', sess.s, CONFIG).map((i) => i.id), ['vue4']);
});

test('T37: SILVER: the winner picks a voucher that is left; BRONZE: from the table (R22)', () => {
  const sess = newSession();
  win(sess, 'silver', { item: 'one4all20' });
  assert.deepEqual(R.itemsLeft('silver', sess.s, CONFIG).map((i) => [i.id, i.left]), [['lidl20', 3]]);
  win(sess, 'bronze', { item: 'candle' });
  assert.ok(!R.itemsLeft('bronze', sess.s, CONFIG).some((i) => i.id === 'candle'));
  const p = sess.s.payments[1];
  assert.throws(() => R.itemBody(p, 'candle', sess.s, CONFIG)); // already has its item, and none left
});

test('T38: one sponsor prize per nickname per day: Y gives +2 tickets instead (on the same ticket screen) and frees the item (R23)', () => {
  const sess = newSession();
  win(sess, 'gold', { nick: 'SAM' });
  const r = win(sess, 'gold', { nick: 'sam', swap: true, done: false });
  assert.equal(R.alreadyWon(r.p, sess.s), true);
  assert.equal(r.p.swapped, true);
  assert.equal(r.p.tickets.length, 1 + CONFIG.tickets.swap); // chimney 10 ticket + the swap
  assert.deepEqual(r.steps.filter((x) => ['nick', 'sponsor', 'tickets'].includes(x)), ['nick', 'sponsor', 'tickets']);
  assert.ok(!r.items.some((i) => i.kind === 'sponsor'));
  assert.equal(stock(sess.s, CONFIG).tiers.gold.free, 1); // 1 given, the second one is free again
  const other = win(sess, 'bronze', { nick: 'ANA', done: false });
  assert.equal(R.alreadyWon(other.p, sess.s), false);
});

test('T39: each tier selling out: its chance goes to +2 TICKETS and the slice says SOLD OUT; NO cash until ALL are sold out (R24, R27)', () => {
  const sess = newSession();
  sellOut(sess, ['gold']);
  let o = odds(sess);
  assert.deepEqual([o.gold, o.cash, o.t2], [0, 0, 38 + 4]);
  assert.equal(liveOdds(sess.s, CONFIG, sess.clock).list.find((x) => x.id === 'gold').why, 'soldout');
  sellOut(sess, ['silver']);
  o = odds(sess);
  assert.deepEqual([o.gold, o.silver, o.cash, o.t2], [0, 0, 0, 38 + 4 + 8]);
  assert.equal(sum(o), 100);
  sellOut(sess, ['bronze']); // now ALL tiers are sold out: €10 CASH at 2%, taken from +2 TICKETS
  o = odds(sess);
  assert.deepEqual([o.gold, o.silver, o.bronze, o.cash], [0, 0, 0, 2]);
  assert.equal(o.t2, 38 + 4 + 8 + 24 - 2);
  assert.equal(sum(o), 100);
  assert.equal(liveOdds(sess.s, CONFIG, sess.clock).allEmpty, true);
  // only bronze sold out (gold and silver left): still no cash
  const b = newSession();
  sellOut(b, ['bronze']);
  assert.equal(odds(b).cash, 0);
});

test('T40: €10 CASH at most 3 times a day, then its chance goes back to +2 TICKETS; "PAY €10" is in the hand-over (R27)', () => {
  const sess = newSession();
  sellOut(sess);
  for (let i = 0; i < 3; i++) {
    const r = win(sess, 'cash');
    assert.ok(r.items.some((x) => x.kind === 'cash' && x.amount === 10));
  }
  assert.equal(caps(sess.s).cashWins, 3);
  const o = odds(sess);
  assert.equal(o.cash, 0);
  assert.equal(o.t2, 74);
  assert.throws(() => win(sess, 'cash'));
  assert.equal(summary(sess.s, CONFIG).cashPaid, 30); // worst case €30 a day (R27)
});

test('T53: the F9 cash switch: off = no cash slice even when all is sold out; on again = 2%; each switch is logged (R27)', () => {
  const sess = newSession();
  sellOut(sess);
  assert.equal(cashSwitch(sess.s, CONFIG), true);
  sess.commit({ ...R.staffBody('cash-fallback', 'off'), on: false });
  assert.equal(cashSwitch(sess.s, CONFIG), false);
  assert.equal(odds(sess).cash, 0);
  assert.equal(odds(sess).t2, 74);
  assert.throws(() => win(sess, 'cash'));
  sess.commit({ ...R.staffBody('cash-fallback', 'on'), on: true });
  assert.equal(odds(sess).cash, 2);
  assert.equal(sess.s.staff.filter((x) => x.action === 'cash-fallback').length, 2);
  const off = newSession(cfgWith({ CASH_FALLBACK_ENABLED: false })); // config off: never cash
  sellOut(off);
  assert.equal(odds(off).cash, 0);
  // the cash payout confirmation is logged once, and not asked again after a reload
  const c = win(sess, 'cash', { done: false });
  sess.commit({ ...R.staffBody('cash-paid', '€10'), pid: c.p.pid });
  assert.equal(buildState(sess.events).byPid.get(c.p.pid).cashPaid, true);
});

test('T41: the wheel jackpot (only when JACKPOT_ENABLED) at most 2 times a day, then its chance goes to +2 TICKETS (R13, R24)', () => {
  const sess = newSession(JP);
  assert.equal(odds(sess).jackpot, 3);
  assert.equal(odds(sess).t2, 35);
  win(sess, 'jackpot');
  win(sess, 'jackpot');
  const o = odds(sess);
  assert.equal(o.jackpot, 0);
  assert.equal(o.t2, 38);
  assert.equal(sum(o), 100);
  assert.equal(R.checkConfig(JP).length, 0);
});

test('T54: JACKPOT_ENABLED = false hides the jackpot: no wheel slice, not in the draw (R13)', () => {
  const sess = newSession();
  for (let i = 0; i < 2; i++) win(sess, 't2');
  assert.equal(odds(sess).jackpot, 0);
  assert.throws(() => win(sess, 'jackpot'));
  const ds = drawState(sess.s, CONFIG);
  assert.equal(ds.next.prize, 'item');
  assert.equal(ds.done, false);
});

test('T42: the odds always add up to exactly 100% (2,000 random days of spins) (R24)', () => {
  for (let d = 0; d < 2000; d++) {
    const sess = newSession();
    for (let k = 0; k < 30; k++) {
      const o = odds(sess);
      assert.equal(sum(o), 100);
      for (const v of Object.values(o)) assert.ok(v >= 0);
      const p = sess.commit(R.payBody(sess.s, 'p1', CONFIG));
      const pay = sess.s.byPid.get(p.pid);
      sess.commit(R.tryBody(pay, 25));
      sess.commit(R.wheelBody(pay, sess.s, CONFIG, Math.random, sess.clock));
      if (pay.sponsor) {
        const left = R.itemsLeft(pay.sponsor, sess.s, CONFIG);
        assert.ok(left.length > 0, 'stock never below 0');
        sess.commit(R.itemBody(pay, left[0].id, sess.s, CONFIG));
      }
    }
    for (const T of Object.values(stock(sess.s, CONFIG).tiers)) assert.ok(T.left >= 0 && T.free >= 0);
  }
});

test('T43: the jackpot grows €10 every hour from the first paid game, max €30, and starts again after a win (R13)', () => {
  const sess = newSession(JP);
  const t0 = 10 * H;
  sess.clock = t0;
  assert.equal(jackpotInfo(sess.s, JP, t0).started, false);
  sess.commit(R.payBody(sess.s, 'free', JP, 'test')); // a free play does not start it
  assert.equal(jackpotInfo(sess.s, JP, t0 + 2 * H).value, 10);
  playPayment(sess, 'p1', { tries: [3], at: t0 + 1000 });
  const start = sess.s.payments[1].ts;
  assert.equal(jackpotInfo(sess.s, JP, start + 59 * 60000).value, 10);
  assert.equal(jackpotInfo(sess.s, JP, start + 59 * 60000).nextMins, 1);
  assert.equal(jackpotInfo(sess.s, JP, start + H).value, 20);
  assert.equal(jackpotInfo(sess.s, JP, start + 2 * H).value, 30);
  assert.equal(jackpotInfo(sess.s, JP, start + 9 * H).value, 30);
  const r = win(sess, 'jackpot', { at: start + 2 * H + 5 * 60000 });
  assert.ok(r.items.some((x) => x.kind === 'jackpot' && x.amount === 30));
  assert.equal(jackpotInfo(sess.s, JP, sess.clock).value, 10);
  assert.equal(jackpotInfo(sess.s, JP, sess.clock + H).value, 20);
});

test('T44: a laptop clock that goes back never lowers the jackpot; a jump forward never passes €30 or the day window (D10, R25)', () => {
  const sess = newSession(JP);
  playPayment(sess, 'p1', { tries: [3], at: 10 * H });
  playPayment(sess, 'p1', { tries: [3], at: 12 * H }); // 2 hours later: €30
  assert.equal(jackpotInfo(sess.s, JP, 12 * H).value, 30);
  assert.equal(jackpotInfo(sess.s, JP, 8 * H).value, 30, 'clock went back: still €30');
  // after a win the new jackpot can only grow until 3 h 45 min after the first paid game
  win(sess, 'jackpot', { at: 13 * H });
  assert.equal(jackpotInfo(sess.s, JP, 40 * H).value, 10, 'the day window is over: no more growth');
});

test('T45: worst case: jackpot paid per day is never more than €60 (R25)', () => {
  let worst = 0;
  for (let k = 0; k < 3000; k++) {
    const sess = newSession(JP);
    const t0 = 9 * H;
    playPayment(sess, 'p1', { tries: [3], at: t0 });
    const times = [Math.random(), Math.random(), Math.random()].map((x) => t0 + x * 6 * H).sort((a, b) => a - b);
    win(sess, 'jackpot', { at: times[0] });
    if (odds(sess).jackpot > 0) win(sess, 'jackpot', { at: times[1] });
    assert.equal(odds(sess).jackpot, 0);
    sess.clock = times[2];
    const d = R.drawBody(sess.s, JP, Math.random, times[2]);
    if (d.prize === 'jackpot') sess.commit(d);
    const paid = jackpotInfo(sess.s, JP, times[2]).paid + (d.prize === 'jackpot' ? 0 : jackpotInfo(sess.s, JP, times[2]).value);
    worst = Math.max(worst, paid);
    assert.ok(paid <= 60, `paid ${paid}`);
  }
  assert.ok(worst >= 50, `worst case found ${worst}`);
});

test('T46: the draw (jackpot off): bronze, silver, gold; NOT HERE draws the same prize again; no tickets left: the rest stays with the team (R14)', () => {
  const sess = newSession();
  for (let i = 0; i < 4; i++) win(sess, 't2'); // 4 x (1 chimney 10 ticket + 2 wheel tickets) = 12 tickets
  assert.equal(sess.s.payments.flatMap((p) => p.tickets).length, 12);
  sess.clock += H;
  const first = sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock));
  assert.equal(first.prize, 'item');
  assert.equal(first.tier, 'bronze');
  assert.throws(() => R.notHereBody(first, ''));
  sess.commit(R.notHereBody(first, 'not at the stall'));
  const again = sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock));
  assert.equal(again.item, first.item, 'the same prize again');
  assert.notEqual(again.ticket, first.ticket, 'the NOT HERE ticket is out');
  const order = [again];
  for (let g = 0; g < 40 && drawState(sess.s, CONFIG).next; g++) order.push(sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock)));
  const prizes = order.map((d) => (d.prize === 'item' ? d.tier : d.prize));
  // 12 tickets - 1 out = 11 winners, all bronze (13 bronze items first), then the rest stays with the team
  assert.deepEqual(prizes, [...Array(11).fill('bronze'), 'rest']);
  assert.equal(new Set(order.filter((d) => d.ticket != null).map((d) => d.ticket)).size, 11, 'each ticket wins once');
  const ds = drawState(sess.s, CONFIG);
  assert.equal(ds.done, true);
  assert.throws(() => R.drawBody(sess.s, CONFIG));
  const s = summary(sess.s, CONFIG, sess.clock);
  assert.equal(s.jackpotPaid, 0);
  assert.equal(s.tiers.bronze.given, 11);
  assert.equal(s.tiers.gold.left, 2); // stays with the team
});

test('T46b: the draw with the jackpot on: the items, then the jackpot last; one ticket kept for it (R13, R14)', () => {
  const sess = newSession(JP);
  for (let i = 0; i < 4; i++) win(sess, 't2'); // 12 tickets
  sess.clock += H;
  const order = [];
  for (let g = 0; g < 40 && drawState(sess.s, JP).next; g++) order.push(sess.commit(R.drawBody(sess.s, JP, Math.random, sess.clock)));
  const prizes = order.map((d) => (d.prize === 'item' ? d.tier : d.prize));
  assert.deepEqual(prizes, [...Array(11).fill('bronze'), 'rest', 'jackpot']);
  const jp = order.at(-1);
  assert.ok(jp.ticket != null);
  assert.equal(jp.amount, 20);
  assert.equal(summary(sess.s, JP, sess.clock).jackpotPaid, 20);
  assert.equal(liveOdds(sess.s, JP, sess.clock).list.find((x) => x.id === 'jackpot').odds, 0); // drawn: no more wheel jackpot
});

test('T47: a crash and reload gives the exact same state (D9, D11)', () => {
  const sess = newSession();
  sellOut(sess);
  win(sess, 'cash');
  sess.commit({ ...R.staffBody('cash-fallback', 'off'), on: false });
  sess.commit(R.stockBody(sess.s, CONFIG, 'lidl20', 1)); // staff found one more voucher
  win(sess, 'silver', { done: false }); // the hand-over is still open
  const again = buildState([...sess.events].reverse()); // the order comes from n, not from the list
  const now = sess.clock + 30 * 60000;
  assert.deepEqual(liveOdds(again, CONFIG, now), liveOdds(sess.s, CONFIG, now));
  assert.deepEqual(summary(again, CONFIG, now), summary(sess.s, CONFIG, now));
  assert.deepEqual(drawState(again, CONFIG).next, drawState(sess.s, CONFIG).next);
  const p = again.payments.at(-1);
  assert.equal(p.wheel, 'silver');
  assert.equal(R.nextStep(p, again, CONFIG).step, 'handover'); // never spins again
});

test('T47b: a crash with reload DURING the wheel: the saved result comes back, the same payment never spins again (R7, D1, D11)', () => {
  const sess = newSession();
  const pay = sess.commit(R.payBody(sess.s, 'p1', CONFIG));
  const p = sess.s.byPid.get(pay.pid);
  sess.commit(R.tryBody(p, 24));
  sess.commit(R.choiceBody(p, 'sweet', CONFIG));
  assert.equal(R.nextStep(p, sess.s, CONFIG).step, 'wheel');
  const ev = sess.commit(R.wheelBody(p, sess.s, CONFIG, forceWheel(sess, 'bronze'), sess.clock)); // saved BEFORE the animation
  // the laptop crashes now, in the middle of the spin animation
  const again = buildState(sess.events);
  const q = again.byPid.get(pay.pid);
  assert.equal(q.wheel, ev.result);
  assert.equal(q.sponsor, 'bronze');
  assert.notEqual(R.nextStep(q, again, CONFIG).step, 'wheel');
  assert.throws(() => R.wheelBody(q, again, CONFIG));
  assert.equal(stock(again, CONFIG).tiers.bronze.reserved, 1); // the item stays reserved for this player
});

test('T48: staff fixes are logged; test mode keeps its own stock; times only count on the event day (D7, D14, R26)', () => {
  const sess = newSession();
  const st = sess.commit(R.stockBody(sess.s, CONFIG, 'ps10', 0));
  assert.equal(st.before, 4);
  assert.equal(stock(sess.s, CONFIG).left.ps10, 0);
  assert.throws(() => R.stockBody(sess.s, CONFIG, 'ps10', -1));
  const j = newSession(JP);
  playPayment(j, 'p1', { tries: [3], at: 10 * H });
  const fx = j.commit(R.jackpotFixBody(j.s, JP, 25, j.clock));
  assert.equal(fx.before, 10);
  assert.equal(jackpotInfo(j.s, JP, j.clock).value, 25);
  assert.equal(jackpotInfo(j.s, JP, j.clock + H).value, 30);
  assert.throws(() => R.jackpotFixBody(j.s, JP, 31));
  assert.equal(stock(newSession().s, CONFIG).left.ps10, 4);
  const day = (h, m) => new Date(2026, 10, 26, h, m);
  assert.equal(timeState(CONFIG, day(12, 29)), '');
  assert.equal(timeState(CONFIG, day(12, 30)), 'warn');
  assert.equal(timeState(CONFIG, day(12, 35)), 'late');
  assert.equal(timeState(CONFIG, new Date(2026, 10, 20, 12, 40)), '');
  assert.equal(timeState(cfgWith({}), day(9, 0)), '');
});
