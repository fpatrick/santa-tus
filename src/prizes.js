// prizes.js: sponsor stock, the jackpot, the live wheel odds and the draw (R13, R14, R22-R25).
// Pure code: everything is worked out from the ledger state (the saved events in s.events), never from
// timers in memory (D9). A reload gives the same state. `now` is only the laptop clock, and the latest
// saved time always counts more (D10), so a clock that goes back never changes a result.

const MIN = 60000;
const live = (s, pid) => { const p = s.byPid.get(pid); return !!p && p.status !== 'undone'; };
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Every sponsor item: [{ tier, id, label, sponsor, count }], tiers in config order.
export function allItems(cfg) {
  const out = [];
  for (const [tier, t] of Object.entries(cfg.sponsors)) for (const it of t.items) out.push({ tier, ...it });
  return out;
}
export function itemById(cfg, id) { return allItems(cfg).find((it) => it.id === id) || null; }

// Which draw events still count: after the last "undo the draw", and not marked "not here".
export function drawValidity(s) {
  let undoN = 0;
  for (const ev of s.events) if (ev.t === 'undo' && ev.what === 'draw') undoN = Math.max(undoN, ev.n);
  const notHere = new Set();
  for (const ev of s.events) if (ev.t === 'nothere' && ev.n > undoN) notHere.add(ev.draw);
  const draws = s.events.filter((ev) => ev.t === 'draw' && ev.n > undoN);
  return { undoN, notHere, draws, won: draws.filter((d) => !notHere.has(d.id)) };
}

// R22, D12: items left per item and per tier. A wheel win reserves one item of its tier until staff give it.
export function stock(s, cfg) {
  const items = allItems(cfg);
  const left = {};
  const given = {};
  const team = {};
  for (const it of items) { left[it.id] = it.count; given[it.id] = 0; team[it.id] = 0; }
  const { won } = drawValidity(s);
  const wonIds = new Set(won.map((d) => d.id));
  const take = (id, bucket) => { if (left[id] == null) return; if (left[id] > 0) left[id] -= 1; bucket[id] += 1; };
  for (const ev of s.events) { // saved order: staff edits set the count at that moment
    if (ev.t === 'stock' && left[ev.item] != null) left[ev.item] = Math.max(0, Math.floor(ev.left));
    else if (ev.t === 'item' && live(s, ev.pid)) take(ev.item, given);
    else if (ev.t === 'draw' && wonIds.has(ev.id)) {
      if (ev.prize === 'item' && ev.ticket != null) take(ev.item, given);
      if (ev.prize === 'rest') for (const id of ev.items || []) take(id, team);
    }
  }
  const tiers = {};
  for (const tier of Object.keys(cfg.sponsors)) tiers[tier] = { left: 0, reserved: 0, given: 0, team: 0, items: [] };
  for (const it of items) {
    const T = tiers[it.tier];
    T.left += left[it.id];
    T.given += given[it.id];
    T.team += team[it.id];
    T.items.push({ ...it, left: left[it.id], given: given[it.id] });
  }
  for (const p of s.payments) {
    if (p.status !== 'undone' && p.sponsor && !p.item && !p.swapped && tiers[p.sponsor]) tiers[p.sponsor].reserved += 1;
  }
  for (const T of Object.values(tiers)) T.free = Math.max(0, T.left - T.reserved); // what the wheel can still give
  return { left, given, team, tiers };
}

// R24 caps: wheel jackpot wins and €10 cash wins today (undone payments do not count).
export function caps(s) {
  let jackpotWins = 0;
  let cashWins = 0;
  for (const p of s.payments) {
    if (p.status === 'undone') continue;
    if (p.wheel === 'jackpot') jackpotWins += 1;
    if (p.wheel === 'cash') cashWins += 1;
  }
  return { jackpotWins, cashWins };
}

// R13, R25, D10: the jackpot now. Returns { value, started, nextMins, atMax, closed, wheelWins, paid, drawn }.
export function jackpotInfo(s, cfg, now = Date.now()) {
  const J = cfg.jackpot;
  const stepMs = J.stepMins * MIN;
  const windowMs = (mins(cfg.event.drawTime) - mins(cfg.event.open)) * MIN;
  const { won } = drawValidity(s);
  const wonIds = new Set(won.map((d) => d.id));
  let tEff = 0;
  let first = null; // time of the first paid game
  let start = null; // when this jackpot started (null = not yet)
  let base = J.start;
  let paid = 0;
  let wheelWins = 0;
  let drawn = null;
  const clampV = (v) => Math.max(0, Math.min(J.max, v));
  const valueAt = (t) => {
    if (start == null) return clampV(base);
    const cut = first + windowMs;
    const run = Math.max(0, Math.min(t, cut) - Math.min(start, cut));
    return clampV(base + J.step * Math.floor(run / stepMs));
  };
  for (const ev of s.events) {
    tEff = Math.max(tEff, ev.ts || 0);
    if (ev.t === 'pay' && ev.amount > 0 && first == null && live(s, ev.pid)) { first = tEff; start = tEff; }
    else if (ev.t === 'award' && ev.kind === 'wheel' && ev.jackpot > 0 && live(s, ev.pid)) {
      paid += ev.jackpot; wheelWins += 1; start = tEff; base = J.start;
    } else if (ev.t === 'jackpot') { base = clampV(ev.value); if (start != null) start = tEff; }
    else if (ev.t === 'draw' && ev.prize === 'jackpot' && wonIds.has(ev.id)) {
      drawn = ev;
      if (ev.ticket != null) paid += ev.amount || 0;
    }
  }
  const nowEff = Math.max(now, tEff);
  const value = drawn ? 0 : valueAt(nowEff);
  let nextMins = null;
  if (!drawn && start != null && value < J.max) {
    const cut = first + windowMs;
    const t = Math.min(nowEff, cut);
    const nextAt = t + (stepMs - ((t - Math.min(start, cut)) % stepMs));
    if (nextAt <= cut) nextMins = Math.max(1, Math.ceil((nextAt - nowEff) / MIN));
  }
  return { value, started: start != null, nextMins, atMax: value >= J.max, closed: !!drawn, wheelWins, paid, drawn };
}

// R7, R24: the live wheel odds. list = [{ id, odds, why }] (always adds up to 100), plus stock and caps.
export function liveOdds(s, cfg, now = Date.now()) {
  const W = cfg.wheel;
  const st = stock(s, cfg);
  const cp = caps(s);
  const jp = jackpotInfo(s, cfg, now);
  const list = W.outcomes.map((o) => ({ id: o.id, odds: o.odds, why: '' }));
  let anyEmpty = false;
  for (const [k, o] of W.outcomes.entries()) {
    if (o.sponsor && (!st.tiers[o.sponsor] || st.tiers[o.sponsor].free <= 0)) { list[k].odds = 0; list[k].why = 'soldout'; anyEmpty = true; }
    if (o.jackpot && (cp.jackpotWins >= cfg.jackpot.wheelMaxWins || jp.closed)) { list[k].odds = 0; list[k].why = 'done'; }
  }
  for (const [k, o] of W.outcomes.entries()) {
    if (o.cash) list[k].odds = anyEmpty && cp.cashWins < o.maxWins ? o.onWhenEmpty : 0;
  }
  const to = list.find((x) => x.id === W.fallbackTo);
  to.odds = 100 - list.reduce((a, x) => a + (x === to ? 0 : x.odds), 0);
  return { list, tiers: st.tiers, caps: cp, jackpot: jp, anyEmpty };
}

// All tickets that can win (tickets of undone payments are out).
export function ticketPool(s) {
  const pool = [];
  for (const p of s.payments) if (p.status !== 'undone') pool.push(...p.tickets);
  return pool.sort((a, b) => a - b);
}

// R14: what the draw does next. next = { prize: 'item', tier, item } | { prize: 'rest', items } | { prize: 'jackpot' } | null (done).
export function drawState(s, cfg) {
  const v = drawValidity(s);
  const used = new Set(v.draws.map((d) => d.ticket).filter((t) => t != null));
  const pool = ticketPool(s).filter((t) => !used.has(t));
  const jackpotDraw = v.won.find((d) => d.prize === 'jackpot') || null;
  const st = stock(s, cfg);
  const units = [];
  for (const tier of cfg.drawOrder) for (const it of st.tiers[tier].items) for (let k = 0; k < it.left; k++) units.push({ tier, item: it.id });
  let next = null;
  if (!jackpotDraw) {
    if (!units.length) next = { prize: 'jackpot' };
    else if (pool.length <= 1) next = { prize: 'rest', items: units.map((u) => u.item) }; // keep the last ticket for the jackpot
    else next = { prize: 'item', tier: units[0].tier, item: units[0].item };
  }
  return { ...v, pool, next, done: !!jackpotDraw, jackpotDraw, started: v.draws.length > 0, unitsLeft: units.length };
}

// K2 end-of-day summary (and the CSV totals).
export function summary(s, cfg, now = Date.now()) {
  const jp = jackpotInfo(s, cfg, now);
  const st = stock(s, cfg);
  const out = { taken: 0, payments: 0, cashPaid: 0, sweets: 0, tickets: 0, jackpotPaid: jp.paid, jackpotNow: jp.value, tiers: {} };
  for (const p of s.payments) {
    if (p.status === 'undone') continue;
    out.payments += 1;
    out.taken += p.amount;
    out.cashPaid += p.cash;
    out.tickets += p.tickets.length;
    if (p.p10 === 'sweet' || p.consolation) out.sweets += 1;
  }
  out.taken = Math.round(out.taken * 100) / 100;
  for (const [tier, T] of Object.entries(st.tiers)) out.tiers[tier] = { given: T.given, left: T.left + T.team, reserved: T.reserved };
  return out;
}

// R26: 'late' after the last payment time, 'warn' after the last-games warning, '' otherwise (only on the event day).
export function timeState(cfg, date = new Date()) {
  const p = (v) => String(v).padStart(2, '0');
  const day = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  if (day !== cfg.event.date) return '';
  const m = date.getHours() * 60 + date.getMinutes();
  if (m >= mins(cfg.event.lastPayment)) return 'late';
  if (m >= mins(cfg.event.lastGameWarn)) return 'warn';
  return '';
}
