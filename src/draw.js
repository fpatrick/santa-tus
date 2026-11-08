// draw.js: the 12:45 draw (R14, S12, K3), started by staff in F9, never automatic. One prize at a time, in the
// order of drawState(): bronze items, silver, gold, then the jackpot last. Each step is SAVED before its number
// shows (D1, D13); a stopped draw goes on from where it stopped. N = NOT HERE: a reason is typed (logged) and
// the same prize is drawn again.

import { CONFIG } from './config.js';
import * as R from './rules.js';
import { drawState, itemById } from './prizes.js';
import { fmtEuro, fmtTicket } from './ledger.js';
import { open, close, setKeys } from './screens.js';
import * as fx from './fx.js';
import { sfx } from './sound.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function prizeName(n, s) {
  if (n.prize === 'jackpot') return `${CONFIG.text.jackpot} ${fmtEuro(n.amount != null ? n.amount : s)}`;
  if (n.prize === 'rest') return 'THE ITEMS THAT ARE LEFT';
  const it = itemById(CONFIG, n.item);
  return `${CONFIG.sponsors[n.tier].name}: ${it.label}`;
}

// app: { led(name), commit(name, body) }. jackpotNow() = the jackpot value now (for the intro screen).
export async function runDraw(app, name, jackpotNow) {
  for (;;) {
    const ds = drawState(app.led(name), CONFIG);
    if (!ds.next) { await info('THE DRAW IS DONE', ['Undo it in the staff panel (U) to run it again.']); return; }
    const go = await intro(ds, prizeName(ds.next, jackpotNow()));
    if (!go) return; // ESC: stop now, go on later
    const ev = await app.commit(name, R.drawBody(app.led(name), CONFIG));
    const r = await drawScreen(ev, ds.pool);
    if (r.action === 'nothere') await app.commit(name, R.notHereBody(ev, r.reason));
    if (r.action === 'stop') return;
  }
}

function intro(ds, prize) {
  return new Promise((resolve) => {
    open(`<div class="box gold wide"><h1>DRAW</h1>
      <p>${ds.pool.length} ${CONFIG.text.tickets} IN THE DRAW · ${ds.unitsLeft} ITEMS + THE ${CONFIG.text.jackpot} TO GO</p>
      <p class="nextprize">NEXT: ${esc(prize)}</p>
      <div class="hint"><kbd>ENTER</kbd> draws it. <kbd>ESC</kbd> stops (go on later with 8).</div></div>`, 'full clear');
    setKeys((e) => {
      if (e.key === 'Enter') { e.preventDefault(); close(); resolve(true); }
      if (e.key === 'Escape') { e.preventDefault(); close(); resolve(false); }
    });
  });
}

function info(title, lines) {
  return new Promise((resolve) => {
    open(`<div class="box gold wide"><h1>${esc(title)}</h1>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
      <div class="hint">Press <kbd>ENTER</kbd>.</div></div>`, 'full clear');
    setKeys((e) => { if (e.key === 'Enter') { e.preventDefault(); close(); resolve(); } });
  });
}

// S12: rolls numbers, then shows the winning ticket in big text. Resolves { action: 'next' | 'nothere' | 'stop', reason }.
export function drawScreen(ev, pool) {
  return new Promise((resolve) => {
    const el = open(`<div class="box gold wide"><h1>${esc(prizeName(ev))}</h1>
      <p>${ev.count} ${CONFIG.text.tickets} IN THE DRAW</p>
      <div class="drawnum">----</div><p class="who"></p><div class="msg"></div><div class="hint"></div></div>`, 'full clear');
    const num = el.querySelector('.drawnum');
    const hint = el.querySelector('.hint');
    const after = () => {
      hint.innerHTML = '<kbd>ENTER</kbd> the winner is here (next prize) · <kbd>N</kbd> NOT HERE · <kbd>ESC</kbd> stop';
      let typing = false;
      setKeys((e) => {
        if (typing) {
          if (e.key === 'Enter') {
            const reason = el.querySelector('input').value.trim();
            if (reason) { e.preventDefault(); close(); resolve({ action: 'nothere', reason }); }
          }
          if (e.key === 'Escape') { e.preventDefault(); typing = false; el.querySelector('.msg').innerHTML = ''; }
          return;
        }
        if (e.key === 'Enter') { e.preventDefault(); close(); resolve({ action: 'next' }); }
        if (e.key === 'Escape') { e.preventDefault(); close(); resolve({ action: 'stop' }); }
        if (e.key.toLowerCase() === 'n' && ev.ticket != null) {
          e.preventDefault();
          typing = true;
          el.querySelector('.msg').innerHTML = 'NOT HERE: type the reason, then ENTER: <input class="staff-in" maxlength="60" spellcheck="false">';
          setTimeout(() => el.querySelector('input').focus(), 20);
        }
      });
    };
    if (ev.ticket == null) {
      num.textContent = ev.prize === 'jackpot' ? 'NO TICKETS' : 'TO THE TEAM';
      num.style.fontSize = '80px';
      el.querySelector('.who').textContent = ev.prize === 'jackpot' ? 'THE JACKPOT STAYS WITH THE CHARITY.'
        : `NOT ENOUGH TICKETS: ${(ev.items || []).length} ITEMS STAY WITH THE TEAM (ONE TICKET IS KEPT FOR THE JACKPOT).`;
      after();
      return;
    }
    const secs = 4;
    sfx.drawRoll(secs);
    const t0 = performance.now();
    const timer = setInterval(() => {
      const k = (performance.now() - t0) / 1000;
      num.textContent = fmtTicket(pool[Math.floor(Math.random() * pool.length)]);
      if (k >= secs) {
        clearInterval(timer);
        num.textContent = fmtTicket(ev.ticket);
        el.querySelector('.who').textContent = `THE HOLDER OF ${CONFIG.text.ticket} ${fmtTicket(ev.ticket)} WINS ${prizeName(ev)}!`;
        sfx.reveal(4);
        fx.celebrate(ev.prize === 'jackpot' ? 4 : 3, 960, 560, '', '#ffd23f');
        after();
      }
    }, 70);
    setKeys(() => {});
  });
}
