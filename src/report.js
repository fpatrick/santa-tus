// report.js: the CSV export for the Finance cash book (K2) and the end-of-day summary.
// Pure code: takes the ledger state, returns text. One row per payment, then the summary, the draw and staff changes.

import { displayName, fmtTicket } from './ledger.js';
import { summary, itemById, drawValidity } from './prizes.js';

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const time = (ts) => (ts ? new Date(ts).toLocaleString('en-IE') : '');

export function buildCsv(s, cfg, label = 'live', now = Date.now()) {
  const rows = [[
    'time', 'payment', 'price_eur', 'price', 'status', 'tries_bought', 'tries_played', 'best_chimney', 'nickname',
    'chimney10', 'wheel', 'sponsor_tier', 'sponsor_item', 'sponsor', 'ticket_numbers', 'jackpot_paid_eur', 'cash10_paid_eur',
    'legend', 'mythic', 'godlike', 'reason',
  ]];
  for (const p of s.payments) {
    const it = p.item ? itemById(cfg, p.item) : null;
    rows.push([
      time(p.ts), p.pid, p.amount, p.kind, p.status, p.triesBought, p.tries.length, p.best, displayName(p, cfg),
      p.p10 || '', p.wheel || '', p.swapped ? `${p.sponsor} (swapped for tickets)` : p.sponsor || '', it ? it.label : '', it ? it.sponsor : '',
      p.tickets.map(fmtTicket).join(' '), p.jackpotWon || 0, p.cash || 0,
      p.best >= cfg.thresholds.legend ? 'yes' : '', p.best >= cfg.thresholds.mythic ? 'yes' : '', p.best >= cfg.thresholds.beat ? 'yes' : '', p.reason,
    ]);
  }
  const sm = summary(s, cfg, now);
  const count = (id) => s.payments.filter((p) => p.status !== 'undone' && p.kind === id).length;
  rows.push([]);
  rows.push(['END OF DAY SUMMARY', label]);
  for (const pr of cfg.prices) rows.push([`payments ${pr.label}`, count(pr.id)]);
  rows.push(['free plays', count('free')]);
  rows.push(['undone payments', s.payments.filter((p) => p.status === 'undone').length]);
  rows.push(['total taken (eur)', sm.taken]);
  rows.push(['jackpot paid (eur)', sm.jackpotPaid]);
  rows.push(['10 eur cash paid (eur)', sm.cashPaid]);
  rows.push(['sweets given', sm.sweets]);
  for (const [tier, x] of Object.entries(sm.tiers)) rows.push([`${tier} items given / left`, x.given, x.left]);
  rows.push(['tickets given', sm.tickets]);
  const v = drawValidity(s);
  rows.push([]);
  rows.push(['DRAW', 'time', 'prize', 'ticket', 'amount_eur', 'note']);
  for (const d of s.draws) {
    const it = d.item ? itemById(cfg, d.item) : null;
    const note = d.n <= v.undoN ? 'undone' : v.notHere.has(d.id) ? 'not here' : '';
    const prize = d.prize === 'item' ? `${d.tier}: ${it ? it.label : d.item}` : d.prize === 'rest' ? `kept by team: ${(d.items || []).length} items` : 'jackpot';
    rows.push(['draw', time(d.ts), prize, d.ticket ? fmtTicket(d.ticket) : 'none', d.amount || '', note]);
  }
  rows.push([]);
  rows.push(['STAFF CHANGES', 'time', 'what', 'detail']);
  for (const ev of s.events) {
    if (ev.t === 'stock') rows.push(['stock', time(ev.ts), ev.item, `${ev.before} -> ${ev.left}`]);
    if (ev.t === 'jackpot') rows.push(['jackpot fix', time(ev.ts), `${ev.before} -> ${ev.value}`, '']);
    if (ev.t === 'nothere') rows.push(['not here', time(ev.ts), fmtTicket(ev.ticket), ev.reason]);
    if (ev.t === 'undo') rows.push(['undo', time(ev.ts), ev.what || `payment ${ev.pid}`, ev.reason || '']);
    if (ev.t === 'staff') rows.push(['staff', time(ev.ts), ev.action, ev.detail || '']);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
