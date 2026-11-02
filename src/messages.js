// messages.js: what Santa says after a crash (C1-C4). Pure code, no drawing, so it is tested.
// crashMessage() looks at the payment AFTER the try is saved (or before, for a free restart)
// and returns { state, mood, title, lines }.
//   restart (C1): crash before chimney 5, the try is not used. Santa is fine.
//   tries   (C2): tries are left. Santa smiles and cheers the player on.
//   prizes  (C3): no tries left, but prizes to collect. Santa jumps for joy and lists them.
//   over    (C4): no tries left, nothing won. Santa is sad, and thanks the player for the charity.

import * as R from './rules.js';

const pick = (list, rnd) => (Array.isArray(list) ? list[Math.floor(rnd() * list.length)] : list);

function fill(text, v) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
}

// "A, B AND C"
export function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} AND ${items[items.length - 1]}`;
}

// The prizes that come next for this payment (not given yet).
export function pendingPrizes(p, cfg, pillars) {
  const th = cfg.thresholds;
  const P = cfg.text.crash.prize;
  const out = [];
  if (p.best >= th.ticket && !p.p20) out.push(P.spin);
  if (p.best >= th.legend && !p.p30) out.push(P.legend);
  if (pillars >= th.master && pillars === p.best) out.push(P.master);
  if (R.triesLeft(p) <= 0) {
    if (p.best >= th.choice && !p.p10) out.push(P.choice);
    if (cfg.consolation.on && p.p10 === 'free' && p.best < th.ticket && !p.consolation) out.push(P.consolation);
  }
  return out;
}

function nextGoal(pillars, cfg) {
  const th = cfg.thresholds;
  return [th.choice, th.ticket, th.legend, th.master, th.beat].find((g) => pillars < g);
}

// info = { pillars, freeRestart: bool, restartsLeft, prevBest (best before this try) }
export function crashMessage(p, info, cfg, rnd = Math.random) {
  const T = cfg.text.crash;
  const left = R.triesLeft(p);
  const triesWord = (n) => `${n} MORE ${n === 1 ? 'TRY' : 'TRIES'}`;
  const goal = nextGoal(info.pillars, cfg);
  const v = {
    chimney: info.pillars, tries: triesWord(left), n: info.restartsLeft, goal,
    gap: goal ? goal - info.pillars : 0, draw: cfg.event.drawTime,
  };
  if (info.freeRestart) {
    const lines = [pick(T.restart, rnd)];
    if (info.restartsLeft > 0) lines.push(fill(T.restartLeft, v));
    return { state: 'restart', mood: 'ok', title: pick(T.restartTitle, rnd), lines };
  }
  const prizes = pendingPrizes(p, cfg, info.pillars);
  v.prizes = joinList(prizes);
  if (left > 0) {
    let line;
    if (info.pillars > (info.prevBest || 0) && info.prevBest > 0) line = T.triesNewBest;
    else if (v.gap > 0 && v.gap <= 3) line = T.triesClose;
    else if (p.best >= cfg.thresholds.choice && !p.p10) line = T.triesSafe;
    else line = pick(T.tries, rnd);
    const lines = [fill(line, v)];
    if (prizes.length) lines.unshift(fill(T.first, v));
    return { state: 'tries', mood: prizes.length ? 'happy' : 'ok', title: pick(T.triesTitle, rnd), lines };
  }
  if (prizes.length) {
    const lines = [fill(T.prizes, v)];
    if (p.tickets.length) lines.push(fill(T.ticketsOnly, { ...v, n: p.tickets.length, TICKETS: p.tickets.length === 1 ? 'TICKET' : 'TICKETS' }));
    return { state: 'prizes', mood: 'happy', title: pick(T.prizesTitle, rnd), lines };
  }
  if (p.tickets.length) {
    const lines = [fill(T.ticketsOnly, { ...v, n: p.tickets.length, TICKETS: p.tickets.length === 1 ? 'TICKET' : 'TICKETS' }), T.thanks];
    return { state: 'prizes', mood: 'happy', title: pick(T.prizesTitle, rnd), lines };
  }
  const lines = [v.gap > 0 && v.gap <= 3 && goal === cfg.thresholds.choice ? fill(T.overClose, v) : pick(T.over, rnd), T.thanks];
  return { state: 'over', mood: 'sad', title: pick(T.overTitle, rnd), lines };
}
