// rules.js: the prize logic only (R1-R26). No drawing and no saving.
// Every function gets the ledger state (s), the payment (p) and CONFIG (cfg), and
// returns event bodies. The caller saves them (store.js) before it shows anything (D1).

import { rankFor, lastActivePayment } from './ledger.js';
import { liveOdds, stock, jackpotInfo, drawState, itemById, cashSwitch } from './prizes.js';

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

// R3: restarts used by this payment so far (all its saved tries), and how many are left (shared by all tries).
export const restartsUsed = (p) => p.tries.reduce((a, t) => a + (t.restarts || 0), 0);
export const restartsLeft = (p, cfg, current = 0) => Math.max(0, cfg.freeRestart.max - restartsUsed(p) - current);
// R10: the next try of this payment is a free one (it never gives the chimney 10 entry, R5).
export const nextTryIsFree = (p) => p.tries.length >= p.triesBought;

// R3: a crash before chimney 5 restarts the try. restartsSoFar = restarts of the whole PAYMENT (max 3 shared).
export function isFreeRestart(pillars, restartsSoFar, cfg) {
  return pillars < cfg.freeRestart.below && restartsSoFar < cfg.freeRestart.max;
}

// The next thing that must happen for this payment (R9): all tries first, then at the end of the payment
// the chimney 10 choice, the wheel, the nickname, the sponsor item pick (R22, R28), the ONE ticket screen (R12),
// the hand-over. A free try (R10) goes back to flying, and then every prize level not had yet is checked again.
export function nextStep(p, s, cfg) {
  const th = cfg.thresholds;
  if (triesLeft(p) > 0) return { step: 'fly' }; // R2, R10
  if (p.best >= th.choice && !p.p10) return { step: 'choice', freeTile: p.best < th.beat }; // R5, R21
  if (p.best >= th.ticket && !p.wheel) return { step: 'wheel' }; // R6, R7, R15: one spin per payment
  if (cfg.consolation.on && p.p10 === 'free' && p.best < th.ticket && !p.consolation) {
    return { step: 'award', kind: 'consolation' }; // R11
  }
  if (needsNick(p, s, cfg)) return { step: 'nick' }; // S9
  if (p.sponsor && !p.item && !p.swapped) return { step: 'sponsor' }; // R22, R28
  if (!p.ticketsGiven && (ticketParts(p, cfg).total > 0 || p.best >= th.legend)) return { step: 'tickets' }; // R12, R8
  return { step: 'handover' }; // S10, R16
}

// R12: every draw ticket this payment gets, by where it comes from. [{ why, n }] + total.
// per10 = each PAID try that reached chimney 10 (R5; free tries never), bonus = key 3, p30 / p40 / p50 = chimney 30 / 40 / 50
// (R8, R20, R21: they add up, once per payment, best try counts),
// wheel / swap = added by an award. (Draw entries come only from playing: they cannot be bought.)
export function ticketParts(p, cfg) {
  const parts = [];
  const tries10 = p.tries.filter((t) => t.pillars >= cfg.thresholds.choice && (t.source || 'paid') === 'paid').length;
  if (tries10) parts.push({ why: 'per10', n: tries10 * cfg.tickets.per10, tries: tries10 });
  if (p.bonus) parts.push({ why: 'bonus', n: p.bonus });
  const L = cfg.tickets.levels;
  if (!p.p30) for (const [why, th, n] of [['p30', 'legend', L.legend], ['p40', 'mythic', L.mythic], ['p50', 'beat', L.beat]]) if (p.best >= cfg.thresholds[th]) parts.push({ why, n });
  for (const a of p.adds || []) parts.push({ why: a.kind, n: a.n });
  const list = parts.filter((x) => x.n > 0);
  return { parts: list, total: list.reduce((a, x) => a + x.n, 0) };
}

// S9: a nickname for the best players list, the ranked players (LEGEND, MYTHIC, GODLIKE) and sponsor winners (R22).
export function needsNick(p, s, cfg) {
  if (p.nickAsked) return false;
  if (p.best >= cfg.thresholds.legend) return true;
  if (p.sponsor && !p.swapped) return true;
  return p.best >= cfg.board.minPillars && rankFor(s, p) <= cfg.board.size;
}

// R1 + K2: a new payment. priceId is one of CONFIG.prices (p1, p3, p5) or 'free'.
// bonus = draw tickets that come with the price (key 3), given at the end (R12).
export function payBody(s, priceId, cfg, reason = '') {
  const pid = s.payments.length + 1;
  if (priceId === 'free') return { t: 'pay', pid, kind: 'free', amount: 0, tries: cfg.freePlay.tries, reason };
  const pr = cfg.prices.find((x) => x.id === priceId);
  if (!pr) throw new Error(`Unknown price ${priceId}`);
  return { t: 'pay', pid, kind: pr.id, amount: pr.amount, tries: pr.tries, bonus: pr.bonus || 0 };
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

// R8, R11, R12, R28: fixed awards. 'swap' = +2 draw tickets instead of a sponsor item (given on the ticket
// screen): why 'declined' = the player wants no item left (R28) ('already' = a 2nd prize today, only in old saved days: R23 has no limit now). The item stays in stock. 'tickets' = the ONE ticket screen at the end: all numbers at once, in order, never twice (R12).
// 'p30' is only for old saved days (chimney 30 tickets are now part of 'tickets').
export function awardBody(kind, p, s, cfg, why = 'declined') {
  if (kind === 'p30') return { t: 'award', pid: p.pid, kind, tickets: takeTickets(s, cfg.tickets.p30), legend: true };
  if (kind === 'consolation') return { t: 'award', pid: p.pid, kind, item: cfg.consolation.item, tickets: [] };
  if (kind === 'swap') {
    if (!p.sponsor || p.item || p.swapped) throw new Error('Nothing to swap (R28)');
    return { t: 'award', pid: p.pid, kind, tier: p.sponsor, tickets: [], add: cfg.tickets.swap, why };
  }
  if (kind === 'tickets') {
    if (p.ticketsGiven) throw new Error('This payment already got its tickets (R12)');
    const tp = ticketParts(p, cfg);
    return { t: 'award', pid: p.pid, kind, tickets: takeTickets(s, tp.total), parts: tp.parts, legend: p.best >= cfg.thresholds.legend };
  }
  throw new Error(`Unknown award ${kind}`);
}

// R7: picks one outcome id from a list [{ id, odds }] with a secure random number, before any animation.
export function pickOutcome(list, rnd = secureRandom) {
  const total = list.reduce((a, o) => a + o.odds, 0);
  let r = rnd() * total;
  for (const o of list) {
    if (o.odds <= 0) continue;
    if (r < o.odds) return o.id;
    r -= o.odds;
  }
  return [...list].reverse().find((o) => o.odds > 0).id;
}

// R7, R24, D1, D12: the live odds are worked out from the saved log first (stock, caps), then the result is picked.
export function wheelBody(p, s, cfg, rnd = secureRandom, now = Date.now()) {
  if (p.wheel) throw new Error('This payment already spun the wheel (R15)');
  const live = liveOdds(s, cfg, now);
  const id = pickOutcome(live.list, rnd);
  const o = cfg.wheel.outcomes.find((x) => x.id === id);
  return {
    t: 'award', pid: p.pid, kind: 'wheel', result: id,
    tickets: [], add: o.tickets || 0, cash: o.cash || 0, freeTry: !!o.freeTry, // +2 TICKETS: given on the ticket screen (R12)
    jackpot: o.jackpot ? live.jackpot.value : 0, sponsor: o.sponsor || null,
    odds: Object.fromEntries(live.list.map((x) => [x.id, x.odds])),
  };
}

// R22: the sponsor item staff give at the hand-over. Stock can never go below 0 (D12).
export function itemBody(p, itemId, s, cfg) {
  const it = itemById(cfg, itemId);
  if (!it || it.tier !== p.sponsor) throw new Error(`Item ${itemId} is not in the ${p.sponsor} tier`);
  if (p.item || p.swapped) throw new Error('This payment already has its sponsor prize');
  if (stock(s, cfg).left[itemId] <= 0) throw new Error(`No ${it.label} left`);
  return { t: 'item', pid: p.pid, tier: it.tier, item: it.id };
}

// The items of a tier that are left (for the hand-over pick).
export function itemsLeft(tier, s, cfg) {
  return stock(s, cfg).tiers[tier].items.filter((it) => it.left > 0);
}

// R5: the pillar 10 choice. 'free' gives up the prize for 1 more try.
export function choiceBody(p, choiceId, cfg) {
  const tile = cfg.choice.find((c) => c.id === choiceId && c.enabled);
  if (!tile) throw new Error(`Unknown choice ${choiceId}`);
  if (choiceId === 'free' && p.best >= cfg.thresholds.beat) throw new Error('No free try after beating the game (R5)');
  if (p.p10) throw new Error('The chimney 10 choice was already made (R15)');
  return { t: 'award', pid: p.pid, kind: 'p10', choice: choiceId, label: tile.label, freeTry: choiceId === 'free', tickets: [] };
}

export function nickBody(p, nick, cfg) {
  const clean = (nick || '').toUpperCase().replace(/[^A-Z0-9 ._-]/g, '').trim().slice(0, cfg.board.nickMax);
  return { t: 'nick', pid: p.pid, nick: clean || null };
}

export function doneBody(p) {
  return { t: 'done', pid: p.pid };
}

// R16: everything staff must hand over. Each item: { kind, ... }.
export function handoverItems(p, cfg) {
  const items = [];
  if (p.p10 && p.p10 !== 'free') {
    const tile = cfg.choice.find((c) => c.id === p.p10);
    items.push({ kind: 'prize', text: `1 ${tile ? tile.label : p.p10.toUpperCase()}` });
  }
  if (p.consolation) items.push({ kind: 'prize', text: `1 ${cfg.consolation.item}` });
  if (p.sponsor && !p.swapped) {
    const it = p.item ? itemById(cfg, p.item) : null;
    items.push({ kind: 'sponsor', tier: p.sponsor, item: p.item, label: it ? it.label : '', sponsorName: it ? it.sponsor : '' });
  }
  if (p.tickets.length) items.push({ kind: 'tickets', count: p.tickets.length, tickets: p.tickets });
  if (p.jackpotWon) items.push({ kind: 'jackpot', amount: p.jackpotWon });
  if (p.cash) items.push({ kind: 'cash', amount: p.cash });
  if (p.best >= cfg.thresholds.legend) items.push({ kind: 'legend' });
  if (p.best >= cfg.thresholds.mythic) items.push({ kind: 'mythic' });
  if (p.best >= cfg.thresholds.beat) items.push({ kind: 'godlike' });
  return items;
}

// K2: undo the last payment that is not undone yet. Returns null if there is none.
export function undoBody(s) {
  const p = lastActivePayment(s);
  return p ? { t: 'undo', pid: p.pid } : null;
}

// R14, K3: one draw step. Saved BEFORE the number shows (D1, D13). Throws when the draw is done.
export function drawBody(s, cfg, rnd = secureRandom, now = Date.now()) {
  const ds = drawState(s, cfg);
  if (!ds.next) throw new Error('The draw is done. Undo it first (D13)');
  const n = ds.next;
  if (n.prize === 'rest') return { t: 'draw', prize: 'rest', items: n.items, ticket: null, count: ds.pool.length };
  const ticket = ds.pool.length ? ds.pool[Math.floor(rnd() * ds.pool.length)] : null;
  if (n.prize === 'jackpot') return { t: 'draw', prize: 'jackpot', ticket, amount: jackpotInfo(s, cfg, now).value, count: ds.pool.length };
  return { t: 'draw', prize: 'item', tier: n.tier, item: n.item, ticket, count: ds.pool.length };
}

// R14: the drawn winner is not there. The same prize is drawn again; this ticket is out.
export function notHereBody(drawEv, reason) {
  if (!reason) throw new Error('A reason is needed (R14)');
  return { t: 'nothere', draw: drawEv.id, ticket: drawEv.ticket, reason };
}

// D13: undo the whole draw (it can then run again).
export function undoDrawBody(reason) {
  if (!reason) throw new Error('A reason is needed (D13)');
  return { t: 'undo', what: 'draw', reason };
}

// K2, D14: staff set the items left of one item, or fix the jackpot.
export function stockBody(s, cfg, itemId, left) {
  const it = itemById(cfg, itemId);
  if (!it) throw new Error(`Unknown item ${itemId}`);
  const n = Math.floor(Number(left));
  if (!(n >= 0) || n > 999) throw new Error('Items left must be 0 or more');
  return { t: 'stock', item: it.id, left: n, before: stock(s, cfg).left[it.id] };
}

export function jackpotFixBody(s, cfg, value, now = Date.now()) {
  const v = Number(value);
  if (!(v >= 0) || v > cfg.jackpot.max) throw new Error(`The jackpot must be between 0 and ${cfg.jackpot.max}`);
  return { t: 'jackpot', value: v, before: jackpotInfo(s, cfg, now).value };
}

// R27: the F9 cash fallback switch. ON only when GOLD, SILVER and BRONZE are all sold out (else it throws). OFF always.
export function cashSwitchBody(s, cfg, on) {
  if (on && !liveOdds(s, cfg).allEmpty) throw new Error('R27: cash fallback only when all tiers are sold out');
  return { ...staffBody('cash-fallback', on ? 'on' : 'off'), on: !!on };
}

// R27: stock came back (F9 edit or undo) while the switch is on: the switch goes off by itself. null = nothing to do.
export function cashAutoOffBody(s, cfg) {
  if (!cashSwitch(s, cfg) || liveOdds(s, cfg).allEmpty) return null;
  return { ...staffBody('cash-fallback', 'auto: stock is back'), on: false };
}

export function staffBody(action, detail = '') {
  return { t: 'staff', action, detail };
}

// Checks CONFIG for mistakes. Returns a list of problems (empty = fine).
export function checkConfig(cfg) {
  const errs = [];
  const W = cfg.wheel;
  const odds = W.outcomes.reduce((a, o) => a + o.odds, 0);
  if (Math.abs(odds - 100) > 1e-9) errs.push(`R7: wheel odds add up to ${odds}, not 100`);
  const to = W.outcomes.find((o) => o.id === W.fallbackTo);
  if (!to) errs.push('R24: wheel.fallbackTo is not a wheel outcome');
  const jp = W.outcomes.find((o) => o.jackpot);
  for (const o of W.outcomes) {
    if (o.sponsor && !cfg.sponsors[o.sponsor]) errs.push(`R22: the wheel slice ${o.id} needs the sponsor tier ${o.sponsor}`);
    if (o.cash && (o.odds !== 0 || !(o.onWhenAllEmpty > 0) || (to && o.onWhenAllEmpty + (jp ? jp.jackpotOdds || 0 : 0) > to.odds))) errs.push('R27: the cash slice must have odds 0 and onWhenAllEmpty <= the fallback odds');
    if (o.jackpot && o.odds !== 0) errs.push('R13: the jackpot slice must have odds 0 (it uses jackpotOdds when JACKPOT_ENABLED)');
  }
  if (!(cfg.CASH_FALLBACK_MAX_WINS >= 0)) errs.push('R27: CASH_FALLBACK_MAX_WINS must be 0 or more');
  for (const pr of cfg.prices) if (!(pr.tries > 0)) errs.push(`R1: price ${pr.id} needs tries`);
  for (const tier of cfg.drawOrder) if (!cfg.sponsors[tier]) errs.push(`R14: drawOrder has an unknown tier ${tier}`);
  const keys = cfg.prices.map((p) => p.key);
  if (new Set(keys).size !== keys.length) errs.push('R1: two prices use the same key');
  const lv = cfg.levels;
  if (lv[lv.length - 1].to !== cfg.thresholds.beat) errs.push('R4: the last level must end at the beat number');
  for (let i = 1; i < lv.length; i++) if (lv[i].to <= lv[i - 1].to) errs.push('R4: levels must go up');
  if (!cfg.choice.some((c) => c.enabled && c.id !== 'free')) errs.push('R5: at least one small prize must be enabled');
  if (!cfg.staffCode) errs.push('K1: staff code is empty');
  return errs;
}
