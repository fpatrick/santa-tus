// simulate.js: proves the prize math (R25, SPEC.md "Simulation results"). It plays whole market days with the
// REAL game rules (rules.js, ledger.js, prizes.js): payments, tries, the chimney 10 choice, the wheel with the live
// odds, sponsor items, the "already won?" swap, a crash and reload in the middle of the day, and the 12:45 draw.
//
// Run:  node scripts/simulate.js            (10,000 days per case, about a few minutes)
//       node scripts/simulate.js --days 500  (quick check)
//
// Things the game cannot know are guesses here (SIM below): the price mix, how often players take the free try,
// how often a winner comes back with the same nickname, and how often a draw winner is not there.

import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { emptyState, applyEvent, buildState } from '../src/ledger.js';
import { liveOdds, jackpotInfo, drawState, summary, stock } from '../src/prizes.js';

const SIM = {
  days: Number((process.argv.find((a) => a.startsWith('--days=')) || '').split('=')[1]) || (process.argv.includes('--days') ? Number(process.argv[process.argv.indexOf('--days') + 1]) : 10000),
  payments: [35, 50, 70],
  reach20: [0.5, 0.8, 1.0],
  reach30: [0.1, 0.2],
  reach10: 0.85, // chance a payment's best try passes chimney 10 (when it does not pass 20)
  priceMix: { p1: 0.45, p3: 0.35, p5: 0.2 }, // €2.50 / €6.50 / €10
  freeTryAt10: 0.35, // the player picks FREE TRY instead of the sweet
  sameNick: 0.1, // a sponsor winner comes back and wins again (staff press Y)
  notHere: 0.1, // a draw winner is not at the stall
  open: '09:00', last: CONFIG.event.lastPayment, draw: CONFIG.event.drawTime,
};

const at = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2026, 10, 26, h, m).getTime(); };
const T_OPEN = at(SIM.open);
const T_LAST = at(SIM.last);
const T_DRAW = at(SIM.draw);

function pickWeighted(map) {
  let r = Math.random();
  for (const [k, w] of Object.entries(map)) { if (r < w) return k; r -= w; }
  return Object.keys(map).at(-1);
}

// The best chimney of one try, for this case's chances.
function tryResult(c) {
  const u = Math.random();
  if (u < c.reach30) return 30 + Math.floor(Math.random() * 12);
  if (u < c.reach20) return 20 + Math.floor(Math.random() * 10);
  if (Math.random() < SIM.reach10) return 10 + Math.floor(Math.random() * 10);
  return 5 + Math.floor(Math.random() * 5);
}

function newDay() {
  const d = { s: emptyState(), events: [], clock: T_OPEN, oddsBad: 0 };
  d.commit = (body) => {
    const n = d.s.lastN + 1;
    const ev = { id: `e${n}`, n, ts: d.clock, ...body };
    d.events.push(ev);
    applyEvent(d.s, ev);
    return ev;
  };
  return d;
}

function playOne(d, c, m, nicks) {
  const priceId = pickWeighted(SIM.priceMix);
  const pay = d.commit(R.payBody(d.s, priceId, CONFIG));
  const p = d.s.byPid.get(pay.pid);
  let firstTry = true;
  for (let guard = 0; guard < 40; guard++) {
    const st = R.nextStep(p, d.s, CONFIG);
    if (st.step === 'fly') {
      // the payment's chances apply to its best try: the first try is drawn, the other paid tries are short
      const v = firstTry || p.tries.length >= p.triesBought ? tryResult(c) : 5;
      firstTry = false;
      d.commit(R.tryBody(p, v));
    } else if (st.step === 'choice') {
      const free = st.freeTile && Math.random() < SIM.freeTryAt10;
      d.commit(R.choiceBody(p, free ? 'free' : 'sweet', CONFIG));
    } else if (st.step === 'wheel') {
      const live = liveOdds(d.s, CONFIG, d.clock);
      const sum = live.list.reduce((a, x) => a + x.odds, 0);
      if (sum !== 100 || live.list.some((x) => x.odds < 0)) d.oddsBad += 1;
      const ev = d.commit(R.wheelBody(p, d.s, CONFIG, Math.random, d.clock));
      m.spins += 1;
      if (ev.sponsor) {
        const T = stock(d.s, CONFIG).tiers[ev.sponsor];
        if (T.free === 0 && m.soldAt[ev.sponsor] == null) m.soldAt[ev.sponsor] = (d.clock - T_OPEN) / 60000;
      }
    } else if (st.step === 'award') {
      d.commit(R.awardBody(st.kind, p, d.s, CONFIG));
    } else if (st.step === 'nick') {
      const again = p.sponsor && nicks.length && Math.random() < SIM.sameNick;
      d.commit(R.nickBody(p, again ? nicks[Math.floor(Math.random() * nicks.length)] : `P${p.pid}`, CONFIG));
    } else if (st.step === 'handover') {
      if (p.sponsor && !p.item && !p.swapped) {
        const left = R.itemsLeft(p.sponsor, d.s, CONFIG);
        if (!left.length || R.alreadyWon(p, d.s)) d.commit(R.awardBody('swap', p, d.s, CONFIG));
        else {
          const it = left[Math.floor(Math.random() * left.length)];
          d.commit(R.itemBody(p, it.id, d.s, CONFIG));
          m.won[p.sponsor] += 1;
          if (p.nick) nicks.push(p.nick);
        }
      }
      d.commit(R.doneBody(p));
      return;
    }
  }
  throw new Error('payment never ended');
}

// The state that a reload must give back exactly (D9).
const snapshot = (s, now) => JSON.stringify([liveOdds(s, CONFIG, now), summary(s, CONFIG, now), drawState(s, CONFIG).next, s.nextTicket]);

function playDay(c) {
  const d = newDay();
  const m = { spins: 0, won: { gold: 0, silver: 0, bronze: 0 }, soldAt: {}, reloadOk: true };
  const times = Array.from({ length: c.payments }, () => T_OPEN + Math.random() * (T_LAST - T_OPEN)).sort((a, b) => a - b);
  const nicks = [];
  const half = Math.floor(c.payments / 2);
  times.forEach((t, k) => {
    d.clock = Math.max(d.clock, Math.round(t));
    if (k === half) { // a crash and reload in the middle of the day: rebuild everything from the saved events
      const before = snapshot(d.s, d.clock);
      const again = buildState([...d.events].reverse());
      if (snapshot(again, d.clock) !== before) m.reloadOk = false;
      d.s = again;
    }
    playOne(d, c, m, nicks);
  });
  // the 12:45 draw: every item left, then the jackpot
  d.clock = T_DRAW;
  m.itemsForDraw = drawState(d.s, CONFIG).unitsLeft;
  for (let guard = 0; guard < 200; guard++) {
    const ds = drawState(d.s, CONFIG);
    if (!ds.next) break;
    const ev = d.commit(R.drawBody(d.s, CONFIG, Math.random, d.clock));
    if (ev.ticket != null && Math.random() < SIM.notHere) d.commit(R.notHereBody(ev, 'not here (simulated)'));
    d.clock += 30000;
  }
  const sm = summary(d.s, CONFIG, d.clock);
  const jp = jackpotInfo(d.s, CONFIG, d.clock);
  Object.assign(m, {
    taken: sm.taken, jackpotPaid: jp.paid, wheelJackpots: jp.wheelWins, cashPaid: sm.cashPaid, tickets: sm.tickets, sweets: sm.sweets,
    oddsBad: d.oddsBad, net: sm.taken - jp.paid - sm.cashPaid,
  });
  return m;
}

function stats(list) {
  const v = [...list].sort((a, b) => a - b);
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return { avg, p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))], max: v.at(-1), min: v[0] };
}
const f1 = (x) => (Math.round(x * 10) / 10).toString();

function runCase(c) {
  const days = [];
  for (let i = 0; i < SIM.days; i++) days.push(playDay(c));
  const S = (k) => stats(days.map((d) => d[k]));
  const tiers = {};
  for (const t of ['gold', 'silver', 'bronze']) {
    const sold = days.filter((d) => d.soldAt[t] != null);
    tiers[t] = { wonAvg: days.reduce((a, d) => a + d.won[t], 0) / days.length, soldPct: (100 * sold.length) / days.length,
      soldAtAvg: sold.length ? sold.reduce((a, d) => a + d.soldAt[t], 0) / sold.length : null };
  }
  return {
    c, spins: S('spins'), jackpot: S('jackpotPaid'), wheelJackpots: S('wheelJackpots'), cash: S('cashPaid'), left: S('itemsForDraw'),
    tickets: S('tickets'), sweets: S('sweets'), taken: S('taken'), net: S('net'), tiers,
    checks: {
      jackpot60: days.every((d) => d.jackpotPaid <= 60),
      total90: days.every((d) => d.jackpotPaid + d.cashPaid <= 90),
      odds100: days.every((d) => d.oddsBad === 0),
      reload: days.every((d) => d.reloadOk),
    },
    lossDays: days.filter((d) => d.net < 0).length,
  };
}

const clock = (mins) => { if (mins == null) return '-'; const t = new Date(T_OPEN + mins * 60000); return `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; };

const results = [];
const t0 = Date.now();
for (const payments of SIM.payments) for (const reach20 of SIM.reach20) for (const reach30 of SIM.reach30) {
  const r = runCase({ payments, reach20, reach30 });
  results.push(r);
  process.stderr.write(`case ${results.length}/18 done (${Math.round((Date.now() - t0) / 1000)} s)\n`);
}

const lines = [];
lines.push(`Simulation: ${SIM.days.toLocaleString('en-IE')} days per case, ${results.length} cases (node scripts/simulate.js). Guesses: price mix ${Object.values(SIM.priceMix).map((x) => `${x * 100}%`).join('/')} (€2.50/€6.50/€10), free try at chimney 10 ${SIM.freeTryAt10 * 100}%, same nickname wins again ${SIM.sameNick * 100}%, draw winner not here ${SIM.notHere * 100}%, payments spread from ${SIM.open} to ${SIM.last}, one crash and reload at mid-day.`);
lines.push('');
lines.push('| Payments | P(20) | P(30) | Spins avg | Jackpot paid avg / 95% / max | Wheel jackpot wins avg | €10 cash avg / 95% / max | Gold / silver / bronze won (wheel) avg | Sold out % (avg time) G / S / B | Items left for draw avg | Tickets avg | Sweets avg | Taken avg | Left for charity avg / min |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of results) {
  const t = r.tiers;
  lines.push(`| ${r.c.payments} | ${r.c.reach20} | ${r.c.reach30} | ${f1(r.spins.avg)} | €${f1(r.jackpot.avg)} / €${r.jackpot.p95} / €${r.jackpot.max} | ${f1(r.wheelJackpots.avg)} | €${f1(r.cash.avg)} / €${r.cash.p95} / €${r.cash.max} | ${f1(t.gold.wonAvg)} / ${f1(t.silver.wonAvg)} / ${f1(t.bronze.wonAvg)} | ${f1(t.gold.soldPct)}% (${clock(t.gold.soldAtAvg)}) / ${f1(t.silver.soldPct)}% (${clock(t.silver.soldAtAvg)}) / ${f1(t.bronze.soldPct)}% (${clock(t.bronze.soldAtAvg)}) | ${f1(r.left.avg)} | ${f1(r.tickets.avg)} | ${f1(r.sweets.avg)} | €${f1(r.taken.avg)} | €${f1(r.net.avg)} / €${f1(r.net.min)} |`);
}
lines.push('');
const all = (k) => results.every((r) => r.checks[k]);
lines.push(`Checks over all ${(SIM.days * results.length).toLocaleString('en-IE')} days: jackpot paid <= €60: **${all('jackpot60') ? 'PASS' : 'FAIL'}** (highest €${Math.max(...results.map((r) => r.jackpot.max))}) · jackpot + €10 cash <= €90: **${all('total90') ? 'PASS' : 'FAIL'}** · odds add up to 100% before every spin: **${all('odds100') ? 'PASS' : 'FAIL'}** · state after reload = before: **${all('reload') ? 'PASS' : 'FAIL'}** · days where prize money was more than the takings: **${results.reduce((a, r) => a + r.lossDays, 0)}**.`);
console.log(lines.join('\n'));
if (!['jackpot60', 'total90', 'odds100', 'reload'].every(all)) process.exitCode = 1;
