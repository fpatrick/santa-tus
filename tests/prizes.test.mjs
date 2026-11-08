// Prize system tests: sponsor stock (R22, R23), wheel fallbacks and caps (R24), the jackpot (R13, R25),
// the draw (R14), times (R26) and the safety rules (D9-D14). T35-T48 in SPEC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { buildState } from '../src/ledger.js';
import { stock, liveOdds, jackpotInfo, drawState, summary, caps, timeState } from '../src/prizes.js';
import { newSession, playPayment, cfgWith } from './helpers.mjs';

const H = 3600000;
const odds = (sess) => Object.fromEntries(liveOdds(sess.s, sess.cfg, sess.clock).list.map((x) => [x.id, x.odds]));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const win = (sess, id, extra = {}) => playPayment(sess, 'p1', { tries: [22], choices: ['sweet'], wheel: [id], nick: `P${sess.s.payments.length + 1}`, ...extra });

test('T35: base odds at the start of the day: 3/4/5/20/30/38, no €10 cash (R7)', () => {
  const sess = newSession();
  assert.deepEqual(odds(sess), { jackpot: 3, gold: 4, silver: 5, bronze: 20, free: 30, t2: 38, cash: 0 });
});

test('T36: GOLD win: "GOLD: GIVE LIDL €20 VOUCHER" with the sponsor name; stock 3 -> 2 (R22)', () => {
  const sess = newSession();
  const r = win(sess, 'gold');
  const it = r.items.find((i) => i.kind === 'sponsor');
  assert.equal(it.tier, 'gold');
  assert.equal(it.label, 'LIDL €20 VOUCHER');
  assert.equal(it.sponsorName, 'LIDL');
  assert.equal(stock(sess.s, CONFIG).tiers.gold.left, 2);
});

test('T37: SILVER: the winner picks what is left; BRONZE: from the table (R22)', () => {
  const sess = newSession();
  win(sess, 'silver', { item: 'bowl4' });
  assert.deepEqual(R.itemsLeft('silver', sess.s, CONFIG).map((i) => i.id), ['vue4']);
  win(sess, 'bronze', { item: 'gem' });
  assert.ok(!R.itemsLeft('bronze', sess.s, CONFIG).some((i) => i.id === 'gem'));
  const p = sess.s.payments[1];
  assert.throws(() => R.itemBody(p, 'gem', sess.s, CONFIG)); // already has its item, and none left
});

test('T38: one sponsor prize per person per day: Y gives +2 tickets instead and frees the item (R23)', () => {
  const sess = newSession();
  win(sess, 'gold', { nick: 'SAM' });
  const r = win(sess, 'gold', { nick: 'sam', swap: true, done: false });
  assert.equal(R.alreadyWon(r.p, sess.s), true);
  assert.equal(r.p.swapped, true);
  assert.equal(r.p.tickets.length, CONFIG.tickets.swap);
  assert.ok(!r.items.some((i) => i.kind === 'sponsor'));
  assert.equal(stock(sess.s, CONFIG).tiers.gold.free, 2); // 1 given, the second one is free again
  const other = win(sess, 'bronze', { nick: 'ANA', done: false });
  assert.equal(R.alreadyWon(other.p, sess.s), false);
});

test('T39: each tier selling out: its chance goes to +2 TICKETS, €10 CASH turns on at 2%, never more (R24)', () => {
  const sess = newSession();
  for (let i = 0; i < 3; i++) win(sess, 'gold');
  let o = odds(sess);
  assert.equal(o.gold, 0);
  assert.equal(o.cash, 2);
  assert.equal(o.t2, 38 + 4 - 2);
  assert.equal(sum(o), 100);
  for (let i = 0; i < 2; i++) win(sess, 'silver');
  for (let i = 0; i < 9; i++) win(sess, 'bronze');
  o = odds(sess);
  assert.deepEqual([o.gold, o.silver, o.bronze, o.cash], [0, 0, 0, 2]);
  assert.equal(o.t2, 38 + 4 + 5 + 20 - 2);
  assert.equal(sum(o), 100);
  const lo = liveOdds(sess.s, CONFIG, sess.clock);
  assert.equal(lo.list.find((x) => x.id === 'gold').why, 'soldout');
});

test('T40: €10 CASH at most 3 times a day, then its chance goes back to +2 TICKETS (R24)', () => {
  const sess = newSession();
  for (let i = 0; i < 3; i++) win(sess, 'gold');
  for (let i = 0; i < 3; i++) {
    const r = win(sess, 'cash');
    assert.ok(r.items.some((x) => x.kind === 'cash' && x.amount === 10));
  }
  assert.equal(caps(sess.s).cashWins, 3);
  const o = odds(sess);
  assert.equal(o.cash, 0);
  assert.equal(o.t2, 42);
  assert.throws(() => win(sess, 'cash'));
});

test('T41: the wheel jackpot at most 2 times a day, then its chance goes to +2 TICKETS (R24)', () => {
  const sess = newSession();
  win(sess, 'jackpot');
  win(sess, 'jackpot');
  const o = odds(sess);
  assert.equal(o.jackpot, 0);
  assert.equal(o.t2, 41);
  assert.equal(sum(o), 100);
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
  const sess = newSession();
  const t0 = 10 * H;
  sess.clock = t0;
  assert.equal(jackpotInfo(sess.s, CONFIG, t0).started, false);
  sess.commit(R.payBody(sess.s, 'free', CONFIG, 'test')); // a free play does not start it
  assert.equal(jackpotInfo(sess.s, CONFIG, t0 + 2 * H).value, 10);
  playPayment(sess, 'p1', { tries: [3], at: t0 + 1000 });
  const start = sess.s.payments[1].ts;
  assert.equal(jackpotInfo(sess.s, CONFIG, start + 59 * 60000).value, 10);
  assert.equal(jackpotInfo(sess.s, CONFIG, start + 59 * 60000).nextMins, 1);
  assert.equal(jackpotInfo(sess.s, CONFIG, start + H).value, 20);
  assert.equal(jackpotInfo(sess.s, CONFIG, start + 2 * H).value, 30);
  assert.equal(jackpotInfo(sess.s, CONFIG, start + 9 * H).value, 30);
  const r = win(sess, 'jackpot', { at: start + 2 * H + 5 * 60000 });
  assert.ok(r.items.some((x) => x.kind === 'jackpot' && x.amount === 30));
  assert.equal(jackpotInfo(sess.s, CONFIG, sess.clock).value, 10);
  assert.equal(jackpotInfo(sess.s, CONFIG, sess.clock + H).value, 20);
});

test('T44: a laptop clock that goes back never lowers the jackpot; a jump forward never passes €30 or the day window (D10, R25)', () => {
  const sess = newSession();
  playPayment(sess, 'p1', { tries: [3], at: 10 * H });
  playPayment(sess, 'p1', { tries: [3], at: 12 * H }); // 2 hours later: €30
  assert.equal(jackpotInfo(sess.s, CONFIG, 12 * H).value, 30);
  assert.equal(jackpotInfo(sess.s, CONFIG, 8 * H).value, 30, 'clock went back: still €30');
  // after a win the new jackpot can only grow until 3 h 45 min after the first paid game
  win(sess, 'jackpot', { at: 13 * H });
  assert.equal(jackpotInfo(sess.s, CONFIG, 40 * H).value, 10, 'the day window is over: no more growth');
});

test('T45: worst case: jackpot paid per day is never more than €60 (R25)', () => {
  let worst = 0;
  for (let k = 0; k < 3000; k++) {
    const sess = newSession();
    const t0 = 9 * H;
    playPayment(sess, 'p1', { tries: [3], at: t0 });
    const times = [Math.random(), Math.random(), Math.random()].map((x) => t0 + x * 6 * H).sort((a, b) => a - b);
    win(sess, 'jackpot', { at: times[0] });
    if (odds(sess).jackpot > 0) win(sess, 'jackpot', { at: times[1] });
    assert.equal(odds(sess).jackpot, 0);
    sess.clock = times[2];
    const d = R.drawBody(sess.s, CONFIG, Math.random, times[2]);
    if (d.prize === 'jackpot') sess.commit(d);
    const paid = jackpotInfo(sess.s, CONFIG, times[2]).paid + (d.prize === 'jackpot' ? 0 : jackpotInfo(sess.s, CONFIG, times[2]).value);
    worst = Math.max(worst, paid);
    assert.ok(paid <= 60, `paid ${paid}`);
  }
  assert.ok(worst >= 50, `worst case found ${worst}`);
});

test('T46: the draw: bronze, silver, gold, then the jackpot last; NOT HERE draws the same prize again (R14)', () => {
  const sess = newSession();
  for (let i = 0; i < 4; i++) win(sess, 't2'); // 8 tickets
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
  for (let g = 0; g < 30 && drawState(sess.s, CONFIG).next; g++) order.push(sess.commit(R.drawBody(sess.s, CONFIG, Math.random, sess.clock)));
  const prizes = order.map((d) => (d.prize === 'item' ? d.tier : d.prize));
  // 8 tickets - 1 out = 7: 6 items can be drawn, then the last ticket is kept for the jackpot
  assert.deepEqual(prizes, ['bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'rest', 'jackpot']);
  const jp = order.at(-1);
  assert.ok(jp.ticket != null);
  assert.equal(jp.amount, 20);
  const s = summary(sess.s, CONFIG, sess.clock);
  assert.equal(s.jackpotPaid, 20);
  assert.equal(s.tiers.bronze.given, 6);
  assert.equal(s.tiers.gold.left, 3); // stays with the team
  assert.equal(liveOdds(sess.s, CONFIG, sess.clock).list.find((x) => x.id === 'jackpot').odds, 0); // drawn: no more wheel jackpot
});

test('T47: a crash and reload gives the exact same state (D9, D11)', () => {
  const sess = newSession();
  for (let i = 0; i < 3; i++) win(sess, 'gold');
  win(sess, 'cash');
  win(sess, 'jackpot');
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

test('T48: staff fixes are logged; test mode keeps its own stock; times only count on the event day (D7, D14, R26)', () => {
  const sess = newSession();
  const st = sess.commit(R.stockBody(sess.s, CONFIG, 'works', 0));
  assert.equal(st.before, 2);
  assert.equal(stock(sess.s, CONFIG).left.works, 0);
  assert.throws(() => R.stockBody(sess.s, CONFIG, 'works', -1));
  playPayment(sess, 'p1', { tries: [3], at: 10 * H });
  const fx = sess.commit(R.jackpotFixBody(sess.s, CONFIG, 25, sess.clock));
  assert.equal(fx.before, 10);
  assert.equal(jackpotInfo(sess.s, CONFIG, sess.clock).value, 25);
  assert.equal(jackpotInfo(sess.s, CONFIG, sess.clock + H).value, 30);
  assert.throws(() => R.jackpotFixBody(sess.s, CONFIG, 31));
  assert.equal(stock(newSession().s, CONFIG).left.works, 2);
  const day = (h, m) => new Date(2026, 10, 26, h, m);
  assert.equal(timeState(CONFIG, day(12, 29)), '');
  assert.equal(timeState(CONFIG, day(12, 30)), 'warn');
  assert.equal(timeState(CONFIG, day(12, 35)), 'late');
  assert.equal(timeState(CONFIG, new Date(2026, 10, 20, 12, 40)), '');
  assert.equal(timeState(cfgWith({}), day(9, 0)), '');
});
