// screens.js: the screens drawn over the game (S2, S3, S8, S9, S10, S13 and messages).
// Each screen returns a Promise with what the person chose. Staff use the keyboard, players the mouse.

import { CONFIG } from './config.js';
import { iconCanvas } from './sprites.js';
import { fmtEuro, fmtTickets } from './ledger.js';
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

// S3: €2 or €5 (keys 1 and 2), or cancel.
export function payment({ testMode = false, drawDone = false } = {}) {
  return new Promise((resolve) => {
    const btns = CONFIG.prices.map((p) => `<button class="btn big ${p.amount > 2 ? 'gold' : 'green'}" data-id="${p.id}">
      <span class="key">${p.key}</span>${esc(p.label)}${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</button>`).join('');
    const el = open(`<div class="box"><h1>NEW PAYMENT</h1>
      ${testMode ? `<p style="color: var(--gold)">${esc(CONFIG.text.testMode)}</p>` : ''}
      ${drawDone ? '<p style="color: var(--red)">THE DRAW IS DONE: NEW ${CONFIG.text.tickets} ARE NOT IN THE DRAW.</p>' : ''}
      <div class="btns">${btns}</div>
      <div class="btns"><button class="btn ghost" data-id="">CANCEL</button></div>
      <div class="hint">Press <kbd>1</kbd> or <kbd>2</kbd> after you take the cash. <kbd>ESC</kbd> cancels.</div></div>`);
    const done = (id) => { close(); resolve(id || null); };
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(b.dataset.id)));
    setKeys((e) => {
      e.preventDefault();
      if (e.key === 'Escape') return done(null);
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
      b.appendChild(iconCanvas(t.icon, 10));
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
export function nickname({ pid, best, rank, legend }) {
  return new Promise((resolve) => {
    const el = open(`<div class="box gold"><h1>${legend ? 'NEW LEGEND!' : `RANK ${rank} TODAY!`}</h1>
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
    const li = items.map((it) => {
      if (it.kind === 'tickets') return `<li class="tickets">GIVE ${it.count} ${it.count > 1 ? CONFIG.text.tickets : CONFIG.text.ticket}<br><b>${fmtTickets(it.tickets)}</b></li>`;
      if (it.kind === 'cash') return `<li class="cash">PAY ${fmtEuro(it.amount)} CASH</li>`;
      if (it.kind === 'legend') return '<li class="legend">LEGEND TAG ON THE BEST PLAYERS LIST</li>';
      if (it.kind === 'master') return '<li class="legend">MASTER TAG ON THE BOARD</li>';
      return `<li>GIVE ${esc(it.text)}</li>`;
    }).join('');
    open(`<div class="box ${items.length ? 'gold' : ''}"><h1>HAND-OVER</h1>
      <p>${esc(name)} · BEST ${best} · PAYMENT #${pid}</p>
      ${items.length ? `<ul class="items">${li}</ul>` : `<p style="font-size:46px">${esc(CONFIG.text.noPrize)}</p>`}
      <div class="hint">Staff: hand everything over, then press <kbd>ENTER</kbd>.</div></div>`);
    setKeys((e) => {
      if (e.key === 'Enter') { e.preventDefault(); sfx.confirm(); close(); resolve(); }
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
