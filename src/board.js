// board.js: the right-hand panel (L2, L3): jackpot until now (rolls up when it grows), "draw at 12:45"
// with a countdown, this player's prizes (shown until the next game starts), and the best players
// with LEGEND / MASTER tags on the names.

import { CONFIG } from './config.js';
import { fmtEuro, fmtTicket, fmtTickets } from './ledger.js';
import { sfx } from './sound.js';

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createBoard(el) {
  el.innerHTML = `
    <div class="jp">
      <div class="jp-label">${CONFIG.text.jackpot}</div>
      <div class="jp-value">€0</div>
      <div class="jp-draw"></div>
    </div>
    <div class="me"></div>
    <div class="board-title">${CONFIG.board.title}</div>
    <ol class="board"></ol>
    <div class="panel-foot">${CONFIG.text.charity}</div>`;
  const $ = (s) => el.querySelector(s);
  const b = { shown: null, target: 0, lastDraw: null, freshPid: null, key: '' };

  // data = { top: [{pid, name, best, master, legend}], jackpot, lastDraw, freshPid, player }
  b.update = (data) => {
    b.target = data.jackpot;
    if (b.shown === null) b.shown = data.jackpot;
    b.lastDraw = data.lastDraw;
    $('.me').innerHTML = playerBox(data.player);
    const key = JSON.stringify([data.top, data.freshPid]);
    if (key === b.key) return;
    b.key = key;
    const ol = $('.board');
    ol.innerHTML = data.top.length ? '' : '<li class="empty">BE THE FIRST ON THE BOARD!</li>';
    data.top.forEach((r, k) => {
      const li = document.createElement('li');
      if (k === 0) li.classList.add('top1');
      if (r.pid === data.freshPid) li.classList.add('fresh');
      li.innerHTML = `<span class="rk">${k + 1}</span><span class="nm${r.master ? ' master' : r.legend ? ' legend' : ''}"></span><span class="sc">${r.best}</span>`;
      li.querySelector('.nm').textContent = r.name;
      ol.appendChild(li);
    });
  };

  // Called every frame: rolls the jackpot up, updates the countdown once a second.
  let acc = 1;
  b.tick = (dt, now = new Date()) => {
    if (b.shown === null) return;
    if (b.shown < b.target) {
      const before = Math.floor(b.shown);
      b.shown = Math.min(b.target, b.shown + Math.max(0.5, (b.target - b.shown) * 2) * dt);
      if (Math.floor(b.shown) !== before) sfx.coin(0);
    } else b.shown = b.target;
    const text = fmtEuro(b.shown >= b.target ? b.target : Math.floor(b.shown));
    const el2 = $('.jp-value');
    if (el2.textContent !== text) {
      el2.textContent = text;
      el2.style.fontSize = `${text.length <= 4 ? 92 : text.length <= 6 ? 76 : 60}px`;
    }
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    $('.jp-draw').innerHTML = drawLine(now, b.lastDraw);
  };

  return b;
}

function drawLine(now, lastDraw) {
  const at = CONFIG.event.drawTime;
  if (lastDraw) {
    return lastDraw.ticket ? `WINNING ${CONFIG.text.ticket} <b>${fmtTicket(lastDraw.ticket)}</b>` : `NO ${CONFIG.text.tickets}: JACKPOT TO CHARITY`;
  }
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (today !== CONFIG.event.date) return `${CONFIG.text.drawAt} <b>${at}</b> ON ${CONFIG.event.date.slice(8)}/${CONFIG.event.date.slice(5, 7)}`;
  const [h, m] = at.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const left = Math.floor((target - now) / 1000);
  if (left <= 0) return `<b>DRAW TIME!</b>`;
  if (left > 6 * 3600) return `${CONFIG.text.drawAt} <b>${at}</b>`;
  const hh = Math.floor(left / 3600);
  const mm = Math.floor((left % 3600) / 60);
  const ss = left % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return `${CONFIG.text.drawAt} <b>${at}</b> · IN ${hh ? `${hh}:` : ''}${pad(mm)}:${pad(ss)}`;
}

// This player's prizes, so nobody can say they did not get one. Stays until the next game starts.
// p = { name, best, open, triesLeft, p10, spinEarned, spin, tickets: [numbers] } or null
function playerBox(p) {
  if (!p) return '';
  const yes = (t) => `<b class="yes">✓ ${esc(t)}</b>`;
  const no = '<span class="no">NOT YET</span>';
  const th = CONFIG.thresholds;
  return `<div class="me-head">${p.open ? 'NOW PLAYING' : 'LAST PLAYER'}: ${esc(p.name)} · BEST ${p.best}${p.open ? ` · TRIES ${p.triesLeft}` : ''}</div>
    <div>CHIMNEY ${th.choice} PRIZE: ${p.p10 ? yes(p.p10) : no}</div>
    <div>WHEEL SPIN: ${p.spin ? yes(p.spin) : p.spinEarned ? '<b class="yes">WON, NOT SPUN YET</b>' : no}</div>
    <div>${CONFIG.text.tickets}: ${p.tickets.length ? `<b class="yes">${fmtTickets(p.tickets)}</b>` : '<span class="no">NONE</span>'}</div>`;
}
