// screens.js: the screens drawn over the game (S2, S3, S8, S9, S10, S13 and messages).
// Each screen returns a Promise with what the person chose. Staff use the keyboard, players the mouse.

import { CONFIG } from './config.js';
import { iconCanvas } from './sprites.js';
import { wheelIcon, WHEEL_ICONS } from './wheelicons.js';
import { fmtEuro, fmtRange } from './ledger.js';
import { sfx } from './sound.js';

const ov = () => document.getElementById('overlay');
let keyHandler = null;
let gen = 0; // grows with each open(), so an old timer never closes a newer screen

// main.js sends every key here first. Returns true if a screen used it.
export function handleKey(e) {
  if (!keyHandler) return false;
  keyHandler(e);
  return true;
}
export function isOpen() { return !!keyHandler || ov().classList.contains('on'); }

export function open(html, cls = '') {
  gen += 1;
  const el = ov();
  el.className = `on ${cls}`;
  el.innerHTML = html;
  return el;
}
export function close() {
  const el = ov();
  el.className = '';
  el.innerHTML = '';
  keyHandler = null;
}
export function setKeys(fn) { keyHandler = fn; }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// S2 / K1: the staff code, shown as dots. A wrong code does nothing (it just clears).
export function staffCode(title = 'STAFF ONLY') {
  return new Promise((resolve) => {
    let typed = '';
    const el = open(`<div class="box"><h1>${esc(title)}</h1><div class="dots"></div>
      <div class="hint">Type the code, then <kbd>ENTER</kbd>. <kbd>ESC</kbd> cancels.</div></div>`);
    const dots = el.querySelector('.dots');
    setKeys((e) => {
      e.preventDefault();
      if (e.key === 'Escape') { close(); resolve(false); return; }
      if (e.key === 'Enter') {
        if (typed.toUpperCase() === CONFIG.staffCode.toUpperCase()) { sfx.confirm(); close(); resolve(true); return; }
        typed = '';
        dots.textContent = '';
        el.querySelector('.box').classList.remove('shake-x');
        void el.offsetWidth;
        el.querySelector('.box').classList.add('shake-x');
        return;
      }
      if (e.key === 'Backspace') typed = typed.slice(0, -1);
      else if (e.key.length === 1 && typed.length < 16) { typed += e.key; sfx.key(); }
      dots.textContent = '•'.repeat(typed.length);
    });
  });
}

// S3: the prices (keys 1-3), or cancel. R26: after the last payment time or after the draw, the price keys
// work only after O (the caller logs the override). Resolves { id, override } or null.
export function payment({ testMode = false, late = false, drawDone = false } = {}) {
  return new Promise((resolve) => {
    const T = CONFIG.text;
    let locked = !testMode && (late || drawDone);
    const btns = CONFIG.prices.map((p) => `<button class="btn big ${p.badge ? 'gold' : 'green'}" data-id="${p.id}">
      <span class="key">${p.key}</span>${esc(p.label)}${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</button>`).join('');
    const warn = [late ? T.late.replace('{time}', CONFIG.event.lastPayment) : '', drawDone ? T.lateDraw : ''].filter(Boolean);
    const el = open(`<div class="box"><h1>NEW PAYMENT</h1>
      ${testMode ? `<p style="color: var(--gold)">${esc(T.testMode)}</p>` : ''}
      ${warn.length ? `<p class="late" style="color: var(--red)">${warn.map(esc).join('<br>')}${locked ? '<br>PRESS <kbd>O</kbd> TO GO ON ANYWAY (SAVED IN THE LOG).' : ''}</p>` : ''}
      <div class="btns prices3">${btns}</div>
      <div class="btns"><button class="btn ghost" data-id="">CANCEL</button></div>
      <div class="hint">Press ${CONFIG.prices.map((p) => `<kbd>${p.key}</kbd>`).join(' ')} after the payment is received. <kbd>ESC</kbd> cancels.</div></div>`);
    const done = (id) => { if (id && locked) return; close(); resolve(id ? { id, override: !!warn.length && !testMode } : null); };
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(b.dataset.id)));
    setKeys((e) => {
      e.preventDefault();
      if (e.key === 'Escape') return done(null);
      if (locked && e.key.toLowerCase() === 'o') { locked = false; el.querySelector('.late').insertAdjacentHTML('beforeend', '<br><b>OK: PRESS THE PRICE KEY.</b>'); return; }
      const p = CONFIG.prices.find((x) => x.key === e.key);
      if (p) done(p.id);
    });
  });
}

// S8 / R5: four big tiles for the player. freeTile = false after beating the game (R21).
export function choice(freeTile) {
  return new Promise((resolve) => {
    const tiles = CONFIG.choice.filter((c) => c.enabled && (c.id !== 'free' || freeTile));
    const el = open(`<div class="box gold wide"><h1>YOU PASSED ${CONFIG.thresholds.choice}! PICK ONE</h1>
      <div class="tiles" style="grid-template-columns: repeat(${tiles.length}, 1fr)"></div>
      <div class="hint">Click a prize. ${freeTile ? 'A free try gives up the prize.' : ''}</div></div>`);
    const box = el.querySelector('.tiles');
    tiles.forEach((t, k) => {
      const b = document.createElement('button');
      b.className = `tile${t.id === 'free' ? ' free' : ''}`;
      b.appendChild(WHEEL_ICONS.includes(t.icon) ? wheelIcon(t.icon, 8) : iconCanvas(t.icon, 10));
      b.insertAdjacentHTML('beforeend', `<span>${esc(t.label)}</span>${t.id === 'free' ? '<small>FLY AGAIN</small>' : ''}`);
      b.addEventListener('click', () => { close(); resolve(t.id); });
      b.dataset.key = String(k + 1);
      box.appendChild(b);
    });
    setKeys((e) => {
      const b = box.querySelector(`[data-key="${e.key}"]`);
      if (b) { e.preventDefault(); b.click(); }
    });
  });
}

// S9: staff type a nickname (max 12) or press Esc to skip ("PLAYER 37").
export function nickname({ pid, best, rank, legend }) { // legend = the rank: 'legend', 'mythic', 'godlike' or ''
  return new Promise((resolve) => {
    const el = open(`<div class="box gold"><h1>${legend ? CONFIG.board.newRank[legend] : `RANK ${rank} TODAY!`}</h1>
      <p>BEST: ${best} CHIMNEYS</p>
      <p>Staff: type a nickname (max ${CONFIG.board.nickMax}).</p>
      <input class="nick" maxlength="${CONFIG.board.nickMax}" spellcheck="false" autocomplete="off">
      <div class="hint"><kbd>ENTER</kbd> saves. <kbd>ESC</kbd> skips (shows "${CONFIG.board.defaultNick} ${pid}").</div></div>`);
    const input = el.querySelector('input');
    setTimeout(() => input.focus(), 30);
    setKeys((e) => {
      if (e.key === 'Enter') { e.preventDefault(); const v = input.value; close(); resolve(v || null); }
      if (e.key === 'Escape') { e.preventDefault(); close(); resolve(null); }
    });
  });
}

// S10 / R16: everything to hand over. Staff confirm with Enter.
export function handover({ items, pid, best, name }) {
  return new Promise((resolve) => {
    const T = CONFIG.text;
    const li = items.map((it) => {
      if (it.kind === 'tickets') {
        const text = T.giveTickets.replace('{n}', it.count).replace('{TICKETS}', it.count > 1 ? 'TICKETS' : 'TICKET').replace('{range}', fmtRange(it.tickets));
        return `<li class="tickets">${esc(text)}</li>`;
      }
      if (it.kind === 'sponsor') {
        const tier = CONFIG.sponsors[it.tier];
        return `<li class="sponsor tier-${it.tier}">${esc(`${tier.name}: GIVE ${it.label}`)}<br><small>${esc(T.sponsorBy.replace('{name}', it.sponsorName))}</small></li>`;
      }
      if (it.kind === 'jackpot') return `<li class="cash">${esc(T.payJackpot.replace('{amount}', fmtEuro(it.amount)))}</li>`;
      if (it.kind === 'cash') return `<li class="cash">${esc(T.payCash.replace('{amount}', fmtEuro(it.amount)))}</li>`;
      if (it.kind === 'legend') return `<li class="legend">${CONFIG.board.legendTag} TAG ON THE BEST PLAYERS LIST</li>`;
      if (it.kind === 'mythic') return `<li class="legend">${CONFIG.board.mythicTag} TAG ON THE BOARD</li>`;
      if (it.kind === 'godlike') return `<li class="legend">${CONFIG.board.godlikeTag} TAG ON THE BOARD</li>`;
      return `<li>GIVE ${esc(it.text)}</li>`;
    }).join('');
    open(`<div class="box ${items.length ? 'gold' : ''}"><h1>HAND-OVER</h1>
      <p>${esc(name)} · BEST ${best} · PAYMENT #${pid}</p>
      ${items.length ? `<ul class="items">${li}</ul>` : `<p style="font-size:46px">${esc(T.noPrize)}</p>`}
      <div class="hint">Staff: hand everything over, then press <kbd>ENTER</kbd>.</div></div>`);
    setKeys((e) => {
      if (e.key === 'Enter') { e.preventDefault(); sfx.confirm(); close(); resolve(); }
    });
  });
}

// R22: the player picks a sponsor item that is left; staff press its number. Resolves the item id.
export function pickItem(tierId, items) {
  return new Promise((resolve) => {
    const tier = CONFIG.sponsors[tierId];
    const el = open(`<div class="box gold wide"><h1 class="tier-${tierId}">${esc(tier.give.replace('{item}', ''))}</h1>
      <ul class="picks">${items.map((it, k) => `<li><button class="btn" data-id="${it.id}"><span class="key">${k + 1}</span>${esc(it.label)}
        <small>${esc(CONFIG.text.sponsorBy.replace('{name}', it.sponsor))} · ${it.left} LEFT</small></button></li>`).join('')}</ul>
      <div class="hint">Staff: press the number of the item the player picks.</div></div>`);
    const done = (id) => { close(); sfx.confirm(); resolve(id); };
    el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => done(b.dataset.id)));
    setKeys((e) => {
      const it = items[Number(e.key) - 1];
      if (it) { e.preventDefault(); done(it.id); }
    });
  });
}

// R23: the nickname already won a sponsor prize today. Resolves true (Y: give tickets instead) or false (N).
export function alreadyWon(nick, n) {
  return new Promise((resolve) => {
    open(`<div class="box red"><h1>${esc(CONFIG.text.alreadyWon)}</h1>
      <p>${esc(nick || '')}</p><p>${esc(CONFIG.text.alreadyWonHint.replace('{n}', n))}</p>
      <div class="hint">Staff decide: press <kbd>Y</kbd> or <kbd>N</kbd>.</div></div>`);
    setKeys((e) => {
      const k = e.key.toLowerCase();
      if (k === 'y' || k === 'n') { e.preventDefault(); close(); resolve(k === 'y'); }
    });
  });
}

// R16: a money prize ("PAY JACKPOT €30", "PAY €10"), confirmed twice with Enter.
export function payMoney(text) {
  return new Promise((resolve) => {
    let step = 0;
    const el = open(`<div class="box gold"><h1>${esc(text)}</h1><p class="again"></p>
      <div class="hint">Staff: pay it, then press <kbd>ENTER</kbd>.</div></div>`);
    setKeys((e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      sfx.confirm();
      step += 1;
      if (step === 1) { el.querySelector('.again').textContent = CONFIG.text.payAgain.replace('{what}', text); el.querySelector('.hint').innerHTML = 'Press <kbd>ENTER</kbd> again to confirm.'; return; }
      close();
      resolve();
    });
  });
}

// A simple message. Closes after `secs` or with Enter.
export function message(title, lines = [], { secs = 0, cls = '' } = {}) {
  return new Promise((resolve) => {
    open(`<div class="box ${cls}"><h1>${esc(title)}</h1>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
      ${secs ? '' : '<div class="hint">Press <kbd>ENTER</kbd>.</div>'}</div>`, cls.includes('gold') ? 'clear' : '');
    const mine = gen;
    const done = () => { if (mine === gen && keyHandler) { close(); resolve(); } };
    setKeys((e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); done(); } });
    if (secs) setTimeout(done, secs * 1000);
  });
}

// S13: the health check. checks = [{ name, level: 'ok'|'warn'|'bad', text }]
export function health(checks, title) {
  return new Promise((resolve) => {
    const bad = checks.some((c) => c.level === 'bad');
    const mark = { ok: 'OK', warn: '!', bad: 'X' };
    open(`<div class="box ${bad ? 'red' : ''}"><h1>${esc(title)}</h1><ul class="checks">
      ${checks.map((c) => `<li class="${c.level}"><span>${mark[c.level]}</span><span>${esc(c.name)}</span><span>${esc(c.text)}</span></li>`).join('')}
      </ul><div class="hint">${bad ? 'Fix the red line, or press <kbd>ENTER</kbd> to go on anyway.' : 'Starting... <kbd>ENTER</kbd> to skip.'}</div></div>`, 'full');
    const mine = gen;
    const done = () => { if (mine === gen && keyHandler) { close(); resolve(); } };
    setKeys((e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
    if (!bad && !checks.some((c) => c.level === 'warn')) setTimeout(done, CONFIG.timing.healthOk * 1000);
    else if (!bad) setTimeout(done, CONFIG.timing.healthOk * 2400);
  });
}
