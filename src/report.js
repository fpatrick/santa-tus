// report.js: the CSV export for the Finance cash book (K2) and the end-of-day totals.
// Pure code: takes the ledger state, returns text.

import { totals, displayName, fmtTicket } from './ledger.js';

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const time = (ts) => (ts ? new Date(ts).toLocaleString('en-IE') : '');

export function buildCsv(s, cfg, label = 'live') {
  const rows = [[
    'payment', 'time', 'type', 'amount_eur', 'status', 'tries_bought', 'tries_played', 'best', 'nickname',
    'pillar10_choice', 'wheel', 'tickets', 'cash_prize_eur', 'legend', 'master', 'reason',
  ]];
  for (const p of s.payments) {
    rows.push([
      p.pid, time(p.ts), p.kind, p.amount, p.status, p.triesBought, p.tries.length, p.best, displayName(p, cfg),
      p.p10 || '', p.wheel || '', p.tickets.map(fmtTicket).join(' '), p.cash,
      p.best >= cfg.thresholds.legend ? 'yes' : '', p.best >= cfg.thresholds.master ? 'yes' : '', p.reason,
    ]);
  }
  const t = totals(s, cfg);
  rows.push([]);
  rows.push(['TOTALS', label]);
  for (const pr of cfg.prices) rows.push([`payments ${pr.id}`, t.count[pr.id] || 0]);
  rows.push(['free plays', t.count.free || 0]);
  rows.push(['undone payments', t.undone]);
  rows.push(['money in (eur)', t.moneyIn]);
  rows.push(['cash prizes paid (eur)', t.cashOut]);
  rows.push(['tickets issued', t.tickets]);
  rows.push(['jackpot (eur)', t.jackpot]);
  for (const d of s.draws) rows.push(['draw', time(d.ts), d.ticket ? fmtTicket(d.ticket) : 'no tickets', `jackpot ${d.jackpot}`, d.reason]);
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
