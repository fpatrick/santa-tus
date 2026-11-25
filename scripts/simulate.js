// simulate.js: proves the prize math (R25, R27, SPEC.md "Simulation results"). It plays whole market days with the
// REAL game rules (rules.js, ledger.js, prizes.js): payments, tries, the chimney 10 choice, the wheel with the live
// odds, sponsor items, the "already won?" swap, a crash and reload in the middle of the day, and the 13:00 draw.
//
// Run:  node scripts/simulate.js            (10,000 days per case, 36 cases, about half an hour)
//       node scripts/simulate.js --days 500  (quick check)
//
// Things the game cannot know are guesses here (SIM below): the price mix, how often players take the free try,
// how often a winner comes back with the same nickname, and how often a draw winner is not there.

import { CONFIG } from '../src/config.js';
import * as R from '../src/rules.js';
import { emptyState, applyEvent, buildState } from '../src/ledger.js';
import { liveOdds, drawState, summary, stock } from '../src/prizes.js';

const SIM = {
  days: Number((process.argv.find((a) => a.startsWith('--days=')) || '').split('=')[1]) || (process.argv.includes('--days') ? Number(process.argv[process.argv.indexOf('--days') + 1]) : 10000),
  payments: [35, 50, 70], // play payments a day
  reach10: [0.5, 0.7, 0.9], // chance one try passes chimney 10
  reach20: [0.5, 0.8], // chance a try that passed 10 also passes 20
  reach30: [0.1, 0.2], // chance a try that passed 20 also passes 30
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

// The chimney one try reaches, for this case's chances (every try, paid or free, is drawn the same way).
function tryResult(c) {
  if (Math.random() >= c.reach10) return 3 + Math.floor(Math.random() * 7);
  if (Math.random() >= c.reach20) return 10 + Math.floor(Math.random() * 10);
  if (Math.random() >= c.reach30) return 20 + Math.floor(Math.random() * 10);
  return 30 + Math.floor(Math.random() * 12);
}

function newDay() {
  const d = { s: emptyState(), events: [], clock: T_OPEN, oddsBad: 0, stockBad: 0 };
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
  for (let guard = 0; guard < 40; guard++) {
    const st = R.nextStep(p, d.s, CONFIG);
    if (st.step === 'fly') {
      d.commit(R.tryBody(p, tryResult(c)));
    } else if (st.step === 'choice') {
      const free = st.freeTile && Math.random() < SIM.freeTryAt10;
      d.commit(R.choiceBody(p, free ? 'free' : 'sweet', CONFIG));
    } else if (st.step === 'wheel') {
      const live = liveOdds(d.s, CONFIG, d.clock);
      const sum = live.list.reduce((a, x) => a + x.odds, 0);
      if (sum !== 100 || live.list.some((x) => x.odds < 0) || live.list.some((x) => x.id === 'cash' && x.odds > 0)) d.oddsBad += 1;
      const ev = d.commit(R.wheelBody(p, d.s, CONFIG, Math.random, d.clock));
      m.spins += 1;
      const tiers = stock(d.s, CONFIG).tiers;
      for (const t of TIERS) if (tiers[t].free === 0 && m.soldAt[t] == null) m.soldAt[t] = (d.clock - T_OPEN) / 60000;
      if (m.allAt == null && TIERS.every((t) => tiers[t].free === 0)) m.allAt = (d.clock - T_OPEN) / 60000;
    } else if (st.step === 'award') {
      d.commit(R.awardBody(st.kind, p, d.s, CONFIG));
    } else if (st.step === 'nick') {
      const again = p.sponsor && nicks.length && Math.random() < SIM.sameNick;
      d.commit(R.nickBody(p, again ? nicks[Math.floor(Math.random() * nicks.length)] : `P${p.pid}`, CONFIG));
    } else if (st.step === 'sponsor') { // R23
      const left = R.itemsLeft(p.sponsor, d.s, CONFIG);
      if (!left.length || R.alreadyWon(p, d.s)) d.commit(R.awardBody('swap', p, d.s, CONFIG));
      else {
        const it = left[Math.floor(Math.random() * left.length)];
        d.commit(R.itemBody(p, it.id, d.s, CONFIG));
        m.won[p.sponsor] += 1;
        if (Object.values(stock(d.s, CONFIG).tiers).some((T) => T.left < 0 || T.free < 0)) d.stockBad += 1;
        if (p.nick) nicks.push(p.nick);
      }
    } else if (st.step === 'tickets') { // R12
      d.commit(R.awardBody('tickets', p, d.s, CONFIG));
    } else if (st.step === 'handover') {
      if (p.cash) m.cashSeen += p.cash; // must never happen: the cash fallback is off (manual)
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
  const m = { spins: 0, won: { gold: 0, silver: 0, bronze: 0 }, soldAt: {}, allAt: null, reloadOk: true, cashSeen: 0 };
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
  // the draw entries in the box, by where they came from (R12)
  m.from = { per10: 0, bonus: 0, wheel: 0, p30: 0 };
  for (const ev of d.events) if (ev.t === 'award' && ev.kind === 'tickets') for (const x of ev.parts) { const k = x.why === 'swap' ? 'wheel' : x.why; m.from[k] = (m.from[k] || 0) + x.n; }
  // the 13:00 draw: every sponsor item left, then GTA 6 last
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
  const reserved = stock(d.s, CONFIG).tiers.reserved;
  Object.assign(m, {
    cashPaid: sm.cashPaid + m.cashSeen, tickets: sm.tickets, cards: sm.cards, sweets: sm.sweets, oddsBad: d.oddsBad, stockBad: d.stockBad,
    gtaOk: !reserved || reserved.given === (CONFIG.reserved.items.reduce((a, it) => a + it.count, 0)),
  });
  return m;
}

function stats(list) {
  const v = [...list].sort((a, b) => a - b);
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return { avg, p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))], max: v.at(-1), min: v[0] };
}
const TIERS = ['gold', 'silver', 'bronze'];
const f1 = (x) => (Math.round(x * 10) / 10).toString();

function runCase(c) {
  const days = [];
  for (let i = 0; i < SIM.days; i++) days.push(playDay(c));
  const S = (k) => stats(days.map((d) => d[k]));
  const tiers = {};
  const soldInfo = (key) => { const sold = days.filter((d) => key(d) != null); return { pct: (100 * sold.length) / days.length, at: sold.length ? sold.reduce((a, d) => a + key(d), 0) / sold.length : null }; };
  for (const t of TIERS) tiers[t] = { wonAvg: days.reduce((a, d) => a + d.won[t], 0) / days.length, ...soldInfo((d) => d.soldAt[t]) };
  const from = {};
  for (const k of ['per10', 'bonus', 'wheel', 'p30']) from[k] = days.reduce((a, d) => a + (d.from[k] || 0), 0) / days.length;
  return {
    c, spins: S('spins'), left: S('itemsForDraw'), tickets: S('tickets'), cards: S('cards'), sweets: S('sweets'), tiers, all: soldInfo((d) => d.allAt), from,
    checks: {
      noCash: days.every((d) => d.cashPaid === 0), // R27: the fallback is off, so never any cash
      odds100: days.every((d) => d.oddsBad === 0),
      stock0: days.every((d) => d.stockBad === 0),
      reload: days.every((d) => d.reloadOk),
      gtaLast: days.every((d) => d.gtaOk),
    },
  };
}

const clock = (mins) => { if (mins == null) return '-'; const t = new Date(T_OPEN + mins * 60000); return `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; };

const results = [];
const t0 = Date.now();
const total = SIM.payments.length * SIM.reach10.length * SIM.reach20.length * SIM.reach30.length;
for (const payments of SIM.payments) for (const reach10 of SIM.reach10) for (const reach20 of SIM.reach20) for (const reach30 of SIM.reach30) {
  results.push(runCase({ payments, reach10, reach20, reach30 }));
  process.stderr.write(`case ${results.length}/${total} done (${Math.round((Date.now() - t0) / 1000)} s)\n`);
}

const lines = [];
lines.push(`Simulation: ${SIM.days.toLocaleString('en-IE')} days per case, ${results.length} cases (node scripts/simulate.js). Guesses: price mix ${Object.values(SIM.priceMix).map((x) => `${Math.round(x * 100)}%`).join('/')} (€2.50/€6.50/€10), free try at chimney 10 ${SIM.freeTryAt10 * 100}%, same nickname wins again ${SIM.sameNick * 100}%, draw winner not here ${SIM.notHere * 100}%, payments spread from ${SIM.open} to ${SIM.last}, one crash and reload at mid-day. Cash fallback OFF (manual). Gold stock ${CONFIG.sponsors.gold.items.reduce((a, it) => a + it.count, 0)}.`);
lines.push('');
lines.push('| Pay | P10 | P20 | P30 | Spins | Won G / S / B | Sold out % (avg time) G / S / B | All sold out % (time) | Left for draw | Entries: ch10 / bonus / wheel / ch30 = total | Cards | Sweets |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of results) {
  const t = r.tiers;
  const so = (x) => `${f1(x.pct)}% (${clock(x.at)})`;
  lines.push(`| ${r.c.payments} | ${r.c.reach10} | ${r.c.reach20} | ${r.c.reach30} | ${f1(r.spins.avg)} | ${f1(t.gold.wonAvg)} / ${f1(t.silver.wonAvg)} / ${f1(t.bronze.wonAvg)} | ${so(t.gold)} / ${so(t.silver)} / ${so(t.bronze)} | ${so(r.all)} | ${f1(r.left.avg)} | ${f1(r.from.per10)} / ${f1(r.from.bonus)} / ${f1(r.from.wheel)} / ${f1(r.from.p30)} = ${f1(r.tickets.avg)} | ${f1(r.cards.avg)} | ${f1(r.sweets.avg)} |`);
}
lines.push('');
const all = (k) => results.every((r) => r.checks[k]);
const ok = (k) => `**${all(k) ? 'PASS' : 'FAIL'}**`;
lines.push(`Checks over all ${(SIM.days * results.length).toLocaleString('en-IE')} days: odds add up to 100% before every spin (no cash slice): ${ok('odds100')} · stock never below 0: ${ok('stock0')} · no cash paid: ${ok('noCash')} · state after reload = before: ${ok('reload')} · GTA 6 given in every draw: ${ok('gtaLast')}.`);
console.log(lines.join('\n'));
if (!Object.keys(results[0].checks).every(all)) process.exitCode = 1;
