// board.js: the leaderboard panel on the right (L2, L3): jackpot (rolls up when it grows),
// "draw at 12:45" with a countdown, the top 10 of the day and the Legends list.

import { CONFIG } from './config.js';
import { fmtEuro, fmtTicket } from './ledger.js';
import { sfx } from './sound.js';

export function createBoard(el) {
  el.innerHTML = `
    <div class="jp">
      <div class="jp-label">JACKPOT</div>
      <div class="jp-value">€0</div>
      <div class="jp-draw"></div>
    </div>
    <div class="board-title">TOP ${CONFIG.board.size} TODAY</div>
    <ol class="board"></ol>
    <div class="board-title" style="color: var(--gold)">LEGENDS</div>
    <div class="legends"></div>
    <div class="panel-foot">${CONFIG.text.charity}</div>`;
  const $ = (s) => el.querySelector(s);
  const b = { shown: null, target: 0, lastDraw: null, freshPid: null, key: '' };

  // data = { top: [{pid, name, best, master}], legends: [{name, master}], jackpot, lastDraw, freshPid }
  b.update = (data) => {
    b.target = data.jackpot;
    if (b.shown === null) b.shown = data.jackpot;
    b.lastDraw = data.lastDraw;
    const key = JSON.stringify([data.top, data.legends, data.freshPid]);
    if (key === b.key) return;
    b.key = key;
    const ol = $('.board');
    ol.innerHTML = data.top.length ? '' : '<li class="empty">BE THE FIRST ON THE BOARD!</li>';
    data.top.forEach((r, k) => {
      const li = document.createElement('li');
      if (k === 0) li.classList.add('top1');
      if (r.pid === data.freshPid) li.classList.add('fresh');
      li.innerHTML = `<span class="rk">${k + 1}</span><span class="nm${r.master ? ' master' : ''}"></span><span class="sc">${r.best}</span>`;
      li.querySelector('.nm').textContent = r.name;
      ol.appendChild(li);
    });
    const lg = $('.legends');
    lg.innerHTML = '';
    if (!data.legends.length) lg.innerHTML = '<span>PASS CHIMNEY 30 TO BE A LEGEND</span>';
    data.legends.forEach((r, k) => {
      const d = document.createElement('div');
      if (r.master) d.className = 'master';
      d.textContent = `★ ${r.name}`;
      lg.appendChild(d);
      if (k > 6) d.style.display = 'none';
    });
    if (data.legends.length > 8) {
      const more = document.createElement('div');
      more.textContent = `+ ${data.legends.length - 8} MORE`;
      lg.appendChild(more);
    }
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
    return lastDraw.ticket ? `WINNING TICKET <b>${fmtTicket(lastDraw.ticket)}</b>` : 'NO TICKETS: JACKPOT TO CHARITY';
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
