// rules.js: the prize logic only (R1-R21). No drawing and no saving.
// Every function gets the ledger state (s), the payment (p) and CONFIG (cfg), and
// returns event bodies. The caller saves them (store.js) before it shows anything (D1).

import { rankFor, totals, drawPool, lastActivePayment } from './ledger.js';

// R7, K3: a secure random number in [0, 1).
export function secureRandom() {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

// Adds the fields every saved event needs: id, order number n, time ts.
export function stamp(s, body, ts = Date.now()) {
  const n = s.lastN + 1;
  const id = `${ts.toString(36)}-${n}-${Math.floor(secureRandom() * 1e9).toString(36)}`;
  return { id, n, ts, ...body };
}

// R1, R2, R10
export function triesLeft(p) {
  return p.triesBought + p.extraTries - p.tries.length;
}

// R3: a crash before pillar 2 restarts the try, at most 3 times per try.
export function isFreeRestart(pillars, restartsSoFar, cfg) {
  return pillars < cfg.freeRestart.below && restartsSoFar < cfg.freeRestart.max;
}

// The next thing that must happen for this payment. The order follows R5-R11 and S6-S10.
export function nextStep(p, s, cfg) {
  const th = cfg.thresholds;
  if (p.best >= th.ticket && !p.p20) return { step: 'award', kind: 'p20' }; // R6
  if (p.p20 && !p.wheel) return { step: 'wheel' }; // R6, R7
  if (p.best >= th.legend && !p.p30) return { step: 'award', kind: 'p30' }; // R8
  if (triesLeft(p) > 0) return { step: 'fly' }; // R2, R10
  if (p.best >= th.choice && !p.p10) return { step: 'choice', freeTile: p.best < th.beat }; // R5, R21
  if (cfg.consolation.on && p.p10 === 'free' && p.best < th.ticket && !p.consolation) {
    return { step: 'award', kind: 'consolation' }; // R11
  }
  if (needsNick(p, s, cfg)) return { step: 'nick' }; // S9
  return { step: 'handover' }; // S10, R16
}

// S9: a nickname only for the top 10, the Legends or MASTER.
export function needsNick(p, s, cfg) {
  if (p.nickAsked) return false;
  if (p.best >= cfg.thresholds.legend) return true;
  return p.best >= cfg.board.minPillars && rankFor(s, p) <= cfg.board.size;
}

// R1 + K2: a new payment. priceId is 'p2', 'p5' or 'free'.
export function payBody(s, priceId, cfg, reason = '') {
  const pid = s.payments.length + 1;
  if (priceId === 'free') return { t: 'pay', pid, kind: 'free', amount: 0, tries: cfg.freePlay.tries, reason };
  const pr = cfg.prices.find((x) => x.id === priceId);
  if (!pr) throw new Error(`Unknown price ${priceId}`);
  return { t: 'pay', pid, kind: pr.id, amount: pr.amount, tries: pr.tries };
}

// One finished try. restarts = free restarts used inside it (R3).
export function tryBody(p, pillars, restarts = 0) {
  const k = p.tries.length;
  const source = k < p.triesBought ? 'paid' : `free-${p.freeFrom[k - p.triesBought] || 'extra'}`;
  return { t: 'try', pid: p.pid, tryNo: k + 1, pillars, restarts, source };
}

function takeTickets(s, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(s.nextTicket + i);
  return out;
}

// R6, R8, R11: fixed awards.
export function awardBody(kind, p, s, cfg) {
  if (kind === 'p20') return { t: 'award', pid: p.pid, kind, tickets: takeTickets(s, cfg.tickets.p20) };
  if (kind === 'p30') return { t: 'award', pid: p.pid, kind, tickets: takeTickets(s, cfg.tickets.p30), legend: true };
  if (kind === 'consolation') return { t: 'award', pid: p.pid, kind, item: cfg.consolation.item, tickets: [] };
  throw new Error(`Unknown award ${kind}`);
}

// R7: picks the wheel result with a secure random number, before any animation.
export function pickOutcome(cfg, rnd = secureRandom) {
  const list = cfg.wheel.outcomes;
  const total = list.reduce((a, o) => a + o.odds, 0);
  let r = rnd() * total;
  for (const o of list) {
    if (r < o.odds) return o;
    r -= o.odds;
  }
  return list[list.length - 1];
}

export function wheelBody(p, s, cfg, rnd = secureRandom) {
  const o = pickOutcome(cfg, rnd);
  return {
    t: 'award', pid: p.pid, kind: 'wheel', result: o.id,
    tickets: takeTickets(s, o.tickets || 0), cash: o.cash || 0, freeTry: !!o.freeTry,
  };
}

// R5: the pillar 10 choice. 'free' gives up the prize for 1 more try.
export function choiceBody(p, choiceId, cfg) {
  const tile = cfg.choice.find((c) => c.id === choiceId && c.enabled);
  if (!tile) throw new Error(`Unknown choice ${choiceId}`);
  if (choiceId === 'free' && p.best >= cfg.thresholds.beat) throw new Error('No free try after beating the game (R5)');
  return { t: 'award', pid: p.pid, kind: 'p10', choice: choiceId, label: tile.label, freeTry: choiceId === 'free', tickets: [] };
}

export function nickBody(p, nick, cfg) {
  const clean = (nick || '').toUpperCase().replace(/[^A-Z0-9 ._-]/g, '').trim().slice(0, cfg.board.nickMax);
  return { t: 'nick', pid: p.pid, nick: clean || null };
}

export function doneBody(p) {
  return { t: 'done', pid: p.pid };
}

// R16: everything staff must hand over. Each item: { kind, text }.
export function handoverItems(p, cfg) {
  const items = [];
  if (p.p10 && p.p10 !== 'free') {
    const tile = cfg.choice.find((c) => c.id === p.p10);
    items.push({ kind: 'prize', text: `1 ${tile ? tile.label : p.p10.toUpperCase()}` });
  }
  if (p.consolation) items.push({ kind: 'prize', text: `1 ${cfg.consolation.item}` });
  if (p.tickets.length) items.push({ kind: 'tickets', count: p.tickets.length, tickets: p.tickets });
  if (p.cash) items.push({ kind: 'cash', amount: p.cash });
  if (p.best >= cfg.thresholds.legend) items.push({ kind: 'legend' });
  if (p.best >= cfg.thresholds.master) items.push({ kind: 'master' });
  return items;
}

// K2: undo the last payment that is not undone yet. Returns null if there is none.
export function undoBody(s) {
  const p = lastActivePayment(s);
  return p ? { t: 'undo', pid: p.pid } : null;
}

// R14, K3: the draw. A second draw needs a reason.
export function drawBody(s, cfg, rnd = secureRandom, reason = '') {
  if (s.draws.length && !reason) throw new Error('A second draw needs a reason (K3)');
  const pool = drawPool(s);
  const jp = totals(s, cfg).jackpot;
  if (!pool.length) return { t: 'draw', ticket: null, jackpot: jp, count: 0, reason };
  const ticket = pool[Math.floor(rnd() * pool.length)];
  return { t: 'draw', ticket, jackpot: jp, count: pool.length, reason };
}

export function staffBody(action, detail = '') {
  return { t: 'staff', action, detail };
}

// Checks CONFIG for mistakes. Returns a list of problems (empty = fine).
export function checkConfig(cfg) {
  const errs = [];
  const odds = cfg.wheel.outcomes.reduce((a, o) => a + o.odds, 0);
  if (Math.abs(odds - 100) > 1e-9) errs.push(`R7: wheel odds add up to ${odds}, not 100`);
  const lv = cfg.levels;
  if (lv[lv.length - 1].to !== cfg.thresholds.beat) errs.push('R4: the last level must end at the beat number');
  for (let i = 1; i < lv.length; i++) if (lv[i].to <= lv[i - 1].to) errs.push('R4: levels must go up');
  if (!cfg.choice.some((c) => c.enabled && c.id !== 'free')) errs.push('R5: at least one small prize must be enabled');
  if (!cfg.staffCode) errs.push('K1: staff code is empty');
  return errs;
}
