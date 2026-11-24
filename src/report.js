// report.js: the CSV export for the Finance cash book (K2) and the end-of-day summary.
// Pure code: takes the ledger state, returns text. One row per payment, then the summary, the draw and staff changes.

import { displayName, fmtTicket } from './ledger.js';
import { summary, itemById, drawValidity, topGiven } from './prizes.js';
import { handoverItems } from './rules.js';

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const time = (ts) => (ts ? new Date(ts).toLocaleString('en-IE') : '');

export function buildCsv(s, cfg, label = 'live', now = Date.now()) {
  const top = topGiven(s);
  const swapWhy = (p) => { // "+2 instead": R23 (already won) or R28 (no item wanted)
    const ev = s.events.find((e) => e.t === 'award' && e.kind === 'swap' && e.pid === p.pid);
    return ev ? (ev.why === 'declined' ? '+2 instead (no item wanted)' : '+2 instead (already won today)') : '';
  };
  const rows = [[
    'time', 'payment', 'payment_key', 'price_eur', 'status', 'tries_bought', 'tries_played', 'best_chimney', 'nickname',
    'prizes', 'chimney10', 'wheel', 'sponsor_tier', 'sponsor_item', 'sponsor', 'plus2_instead', 'draw_entry_numbers', 'cash10_paid_eur',
    'jackpot_paid_eur', 'top_score_prize', 'reason',
  ]];
  for (const p of s.payments) {
    const it = p.item ? itemById(cfg, p.item) : null;
    const pr = cfg.prices.find((x) => x.id === p.kind);
    const prizes = handoverItems(p, cfg).map((x) => (x.kind === 'prize' ? x.text : x.kind === 'sponsor' ? `${x.tier}: ${x.label}` : x.kind === 'tickets' ? `${x.count} draw entries`
      : x.kind === 'cash' ? `€${x.amount} cash` : x.kind === 'jackpot' ? `jackpot €${x.amount}` : x.kind)).join('; ');
    rows.push([
      time(p.ts), p.pid, pr ? pr.key : p.kind, p.amount, p.status, p.triesBought, p.tries.length, p.best, displayName(p, cfg),
      prizes, p.p10 || '', p.wheel || '', p.sponsor || '', it ? it.label : '', it ? it.sponsor : '', swapWhy(p),
      p.tickets.map(fmtTicket).join(' '), p.cash || 0, p.jackpotWon || 0, top && top.pid === p.pid ? 'ONE4ALL €20 (top score)' : '', p.reason,
    ]);
  }
  const sm = summary(s, cfg, now);
  const count = (id) => s.payments.filter((p) => p.status !== 'undone' && p.kind === id).length;
  rows.push([]);
  rows.push(['END OF DAY SUMMARY', label]);
  for (const pr of cfg.prices) rows.push([`payments key ${pr.key} (${pr.label})`, count(pr.id)]);
  rows.push(['free plays', count('free')]);
  rows.push(['undone payments', s.payments.filter((p) => p.status === 'undone').length]);
  rows.push(['total taken (eur)', sm.taken]);
  if (cfg.JACKPOT_ENABLED) rows.push(['jackpot paid (eur)', sm.jackpotPaid]);
  rows.push(['10 eur cash paid (eur)', sm.cashPaid]);
  rows.push(['+2 instead (count)', sm.swaps]);
  rows.push(['sweets given', sm.sweets]);
  for (const [tier, x] of Object.entries(sm.tiers)) rows.push([`${tier} items given / left`, x.given, x.left]);
  rows.push(['draw entries given', sm.tickets]);
  rows.push(['cards used', sm.cards]);
  rows.push(['top score winner', top ? `${top.nick || `PLAYER ${top.pid}`} (payment ${top.pid})` : 'not given', top ? top.best : '']);
  for (const w of sm.drawWinners) { const it = itemById(cfg, w.item); rows.push(['draw winner', it ? it.label : w.item, fmtTicket(w.ticket)]); }
  const v = drawValidity(s);
  rows.push([]);
  rows.push(['DRAW', 'time', 'prize', 'draw_entry', 'amount_eur', 'note']);
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
    if (ev.t === 'top') rows.push(['top score prize', time(ev.ts), `${ev.nick || `PLAYER ${ev.pid}`} · ${ev.best}`, ev.item]);
    if (ev.t === 'jackpot') rows.push(['jackpot fix', time(ev.ts), `${ev.before} -> ${ev.value}`, '']);
    if (ev.t === 'nothere') rows.push(['not here', time(ev.ts), fmtTicket(ev.ticket), ev.reason]);
    if (ev.t === 'undo') rows.push(['undo', time(ev.ts), ev.what || `payment ${ev.pid}`, ev.reason || '']);
    if (ev.t === 'staff') rows.push(['staff', time(ev.ts), ev.action, ev.detail || '']);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
