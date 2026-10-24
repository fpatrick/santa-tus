// ledger.js: turns the saved events into the current state: payments, leaderboard, totals.
// Pure code: no drawing, no saving, no config changes. Used by the game, the board and the tests.
// Event types are listed in SPEC.md "Saved events".

export function emptyState() {
  return { events: [], payments: [], byPid: new Map(), nextTicket: 1, draws: [], staff: [], lastN: 0 };
}

function newPayment(ev) {
  return {
    pid: ev.pid, ts: ev.ts, kind: ev.kind, amount: ev.amount || 0, triesBought: ev.tries, reason: ev.reason || '',
    status: 'open', tries: [], extraTries: 0, freeFrom: [], best: 0, bestTs: 0,
    p10: null, p20: false, wheel: null, p30: false, consolation: false,
    tickets: [], cash: 0, nick: null, nickAsked: false, hidden: false, legendTs: 0, doneTs: 0,
  };
}

// Adds one event to the state. Unknown event types are kept but ignored.
export function applyEvent(s, ev) {
  s.events.push(ev);
  s.lastN = Math.max(s.lastN, ev.n || 0);
  const p = ev.pid != null ? s.byPid.get(ev.pid) : null;
  switch (ev.t) {
    case 'pay': {
      const np = newPayment(ev);
      s.payments.push(np);
      s.byPid.set(np.pid, np);
      break;
    }
    case 'try':
      if (!p) break;
      p.tries.push({ no: ev.tryNo, pillars: ev.pillars, restarts: ev.restarts || 0, source: ev.source, ts: ev.ts });
      if (ev.pillars > p.best) { p.best = ev.pillars; p.bestTs = ev.ts; }
      break;
    case 'award':
      if (!p) break;
      applyAward(s, p, ev);
      break;
    case 'nick':
      if (!p) break;
      p.nick = ev.nick || null;
      p.nickAsked = true;
      break;
    case 'done':
      if (p && p.status === 'open') { p.status = 'done'; p.doneTs = ev.ts; }
      break;
    case 'undo':
      if (p) p.status = 'undone';
      break;
    case 'hide':
      if (p) p.hidden = true;
      break;
    case 'draw':
      s.draws.push({ ts: ev.ts, ticket: ev.ticket, jackpot: ev.jackpot, count: ev.count, reason: ev.reason || '' });
      break;
    case 'staff':
      s.staff.push({ ts: ev.ts, action: ev.action, detail: ev.detail || '' });
      break;
    default:
      break;
  }
  return s;
}

function applyAward(s, p, ev) {
  const tickets = ev.tickets || [];
  p.tickets.push(...tickets);
  if (tickets.length) s.nextTicket = Math.max(s.nextTicket, Math.max(...tickets) + 1);
  p.cash += ev.cash || 0;
  if (ev.freeTry) { p.extraTries += 1; p.freeFrom.push(ev.kind); }
  if (ev.kind === 'p20') p.p20 = true;
  if (ev.kind === 'wheel') p.wheel = ev.result;
  if (ev.kind === 'p30') { p.p30 = true; p.legendTs = ev.ts; }
  if (ev.kind === 'p10') p.p10 = ev.choice;
  if (ev.kind === 'consolation') p.consolation = true;
}

// Builds the state from a list of events, in the order they were made (field n).
export function buildState(events) {
  const s = emptyState();
  const sorted = [...events].sort((a, b) => (a.n - b.n) || (a.ts - b.ts));
  for (const ev of sorted) applyEvent(s, ev);
  return s;
}

export function openPayment(s) {
  for (let i = s.payments.length - 1; i >= 0; i--) {
    if (s.payments[i].status === 'open') return s.payments[i];
  }
  return null;
}

export function lastActivePayment(s) {
  for (let i = s.payments.length - 1; i >= 0; i--) {
    if (s.payments[i].status !== 'undone') return s.payments[i];
  }
  return null;
}

// R20: MASTER tag. L2: hidden nicknames show as "PLAYER 37".
export function displayName(p, cfg) {
  const base = (!p.nick || p.hidden) ? `${cfg.board.defaultNick} ${p.pid}` : p.nick;
  return p.best >= cfg.thresholds.master ? `MASTER ${base}` : base;
}

function beats(a, b) {
  return a.best > b.best || (a.best === b.best && a.bestTs < b.bestTs);
}

// L1: best pillars per payment, highest first. A tie: who got there first stays above.
export function leaderboard(s, cfg, limit = cfg.board.size) {
  return s.payments
    .filter((p) => p.status === 'done' && p.best >= cfg.board.minPillars)
    .sort((a, b) => (b.best - a.best) || (a.bestTs - b.bestTs))
    .slice(0, limit);
}

// The rank this payment would get on the leaderboard (1 = top).
export function rankFor(s, p) {
  let rank = 1;
  for (const o of s.payments) {
    if (o !== p && o.status === 'done' && beats(o, p)) rank += 1;
  }
  return rank;
}

// R8, L2: everyone who passed 30, in the order they did it.
export function legends(s, cfg) {
  return s.payments
    .filter((p) => p.status === 'done' && p.best >= cfg.thresholds.legend)
    .sort((a, b) => a.legendTs - b.legendTs);
}

// R13 + K2 totals. Undone payments never count.
export function totals(s, cfg) {
  const live = s.payments.filter((p) => p.status !== 'undone');
  const t = { count: {}, moneyIn: 0, cashOut: 0, tickets: 0, payments: live.length, undone: s.payments.length - live.length };
  for (const pr of cfg.prices) t.count[pr.id] = 0;
  t.count.free = 0;
  for (const p of live) {
    t.count[p.kind] = (t.count[p.kind] || 0) + 1;
    t.moneyIn += p.amount;
    t.cashOut += p.cash;
    t.tickets += p.tickets.length;
  }
  t.jackpot = jackpot(t.moneyIn, cfg);
  t.lastDraw = s.draws.length ? s.draws[s.draws.length - 1] : null;
  return t;
}

export function jackpot(moneyIn, cfg) {
  return Math.round((cfg.jackpot.base + (moneyIn * cfg.jackpot.percent) / 100) * 100) / 100;
}

// R14: tickets that can win. Tickets of undone payments are out.
export function drawPool(s) {
  const pool = [];
  for (const p of s.payments) if (p.status !== 'undone') pool.push(...p.tickets);
  return pool.sort((a, b) => a - b);
}

export function fmtEuro(v) {
  return Number.isInteger(v) ? `€${v}` : `€${v.toFixed(2)}`;
}

export function fmtTicket(n) {
  return `#${String(n).padStart(4, '0')}`;
}

// Groups ticket numbers into ranges: [41,42,43,50] -> "#0041 TO #0043, #0050"
export function fmtTickets(list) {
  const nums = [...list].sort((a, b) => a - b);
  const parts = [];
  let i = 0;
  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(i === j ? fmtTicket(nums[i]) : `${fmtTicket(nums[i])} TO ${fmtTicket(nums[j])}`);
    i = j + 1;
  }
  return parts.join(', ');
}
