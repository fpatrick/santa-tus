// staff.js: the staff panel (S11, K2) and the draw screen (S12, K3).
// The panel only calls functions that main.js gives it (api), so all saving stays in main.js.

import { CONFIG } from './config.js';
import { open, close, setKeys } from './screens.js';
import { fmtEuro, fmtTicket } from './ledger.js';
import { versionLabel } from './version.js';
import * as fx from './fx.js';
import { sfx } from './sound.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ACTIONS = [
  ['1', 'undo', 'UNDO LAST PAYMENT'],
  ['2', 'free', 'FREE PLAY'],
  ['3', 'test', 'TEST MODE'],
  ['4', 'backup', 'BACKUP NOW'],
  ['5', 'export', 'EXPORT CSV'],
  ['6', 'hide', 'HIDE A NICKNAME'],
  ['7', 'sound', 'SOUND ON/OFF'],
  ['8', 'draw', 'START THE DRAW'],
  ['9', 'newday', 'NEW DAY'],
];

// api: { info(), undoInfo(), undo(), freePlay(reason), setTest(on), backup(), exportCsv(), hide(pid), toggleSound(), draw(reason), newDay(), askCode() }
// Resolves with 'free' when a free play was started (main.js runs it), otherwise null.
export function staffPanel(api) {
  return new Promise((resolve) => {
    let msg = '';
    let mode = null; // waiting for: 'undo-confirm' | 'free-reason' | 'hide-pid' | 'draw-confirm' | 'draw-reason'
    const render = () => {
      const i = api.info();
      const t = i.totals;
      const prices = CONFIG.prices.map((p) => `<div><span>${esc(p.label)}:</span> ${t.count[p.id] || 0}</div>`).join('');
      const el = open(`<div class="box wide staff"><h1>STAFF PANEL</h1>
        <div class="grid">
          ${prices}
          <div><span>Free plays:</span> ${t.count.free || 0}</div>
          <div><span>Undone:</span> ${t.undone}</div>
          <div><span>Money in:</span> ${fmtEuro(t.moneyIn)}</div>
          <div><span>Cash prizes paid:</span> ${fmtEuro(t.cashOut)}</div>
          <div><span>Tickets issued:</span> ${t.tickets} (next ${fmtTicket(i.nextTicket)})</div>
          <div><span>Jackpot now:</span> ${fmtEuro(t.jackpot)}</div>
          <div><span>Draw:</span> ${t.lastDraw ? (t.lastDraw.ticket ? fmtTicket(t.lastDraw.ticket) : 'no tickets') : 'not yet'}</div>
          <div><span>Laptop clock:</span> ${new Date().toLocaleString('en-IE')}</div>
          <div><span>Mode:</span> ${i.mode === 'server' ? 'LAPTOP (saved to disk)' : 'TEST LINK (this browser only)'}</div>
          <div><span>Test mode:</span> ${i.test ? 'ON' : 'off'} · <span>Sound:</span> ${i.muted ? 'muted' : 'on'}</div>
          <div><span>Waiting to save:</span> ${i.pending}</div>
          <div><span>Version:</span> ${esc(versionLabel())}</div>
        </div>
        <div class="acts">${ACTIONS.map(([k, id, label]) => `<button class="btn ${id === 'newday' || id === 'undo' ? 'red' : id === 'draw' ? 'gold' : ''}" data-id="${id}"><span class="key">${k}</span>${label}</button>`).join('')}</div>
        <div class="msg">${msg}</div>
        <div class="hint">Press a number. <kbd>ESC</kbd> closes the panel.</div></div>`, 'full');
      el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => act(b.dataset.id)));
      if (mode && mode.endsWith('reason') || mode === 'hide-pid') {
        const box = el.querySelector('.msg');
        box.insertAdjacentHTML('beforeend', '<input class="staff-in" maxlength="60" spellcheck="false">');
        setTimeout(() => box.querySelector('input').focus(), 20);
      }
    };
    const say = (m) => { msg = esc(m); render(); };
    const finish = (r = null) => { close(); resolve(r); };

    async function act(id) {
      mode = null;
      if (id === 'undo') {
        const u = api.undoInfo();
        if (!u) return say('No payment to undo.');
        mode = 'undo-confirm';
        return say(`Undo payment #${u.pid} (${u.kind}, ${fmtEuro(u.amount)})? Press ENTER again to confirm, ESC to stop.`);
      }
      if (id === 'free') { mode = 'free-reason'; return say('Type the reason for the free play, then ENTER:'); }
      if (id === 'test') { const ok = await api.setTest(!api.info().test); return say(ok ? `Test mode is now ${api.info().test ? 'ON' : 'off'}.` : 'Finish the open payment first.'); }
      if (id === 'backup') { say('Backing up...'); const r = await api.backup(); return say(r && r.ok ? `Backup done: ${r.usb || r.local || 'ok'}${r.ok && !r.usb && api.info().mode === 'server' ? ' (no USB stick found!)' : ''}` : 'Backup FAILED. Check the server window.'); }
      if (id === 'export') { const r = await api.exportCsv(); return say(r && r.ok ? `Exported: ${r.path || 'ok'}` : 'Export FAILED.'); }
      if (id === 'hide') { mode = 'hide-pid'; return say('Type the payment number of the nickname to hide, then ENTER:'); }
      if (id === 'sound') { api.toggleSound(); return say(`Sound is now ${api.info().muted ? 'muted' : 'on'}.`); }
      if (id === 'draw') {
        const i = api.info();
        const [h, m] = CONFIG.event.drawTime.split(':').map(Number);
        const early = new Date().getHours() * 60 + new Date().getMinutes() < h * 60 + m;
        if (i.totals.lastDraw) { mode = 'draw-reason'; return say('A draw is already done. Type the reason for a new draw, then ENTER:'); }
        mode = 'draw-confirm';
        return say(`${early ? `WARNING: it is not ${CONFIG.event.drawTime} yet. ` : ''}Start the draw? Press ENTER to confirm, ESC to stop.`);
      }
      if (id === 'newday') {
        const ok = await api.askCode();
        if (!ok) return staffPanelAgain();
        const r = await api.newDay();
        msg = r && r.ok ? 'New day started. The old day is archived.' : 'New day FAILED.';
        return staffPanelAgain();
      }
      return null;
    }
    // askCode() replaced the panel with the code screen, so draw the panel again.
    function staffPanelAgain() { render(); setKeys(onKey); }

    async function onKey(e) {
      const input = document.querySelector('.staff-in');
      if (e.key === 'Escape') { e.preventDefault(); if (mode) { mode = null; return say('Stopped.'); } return finish(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input ? input.value.trim() : '';
        const m = mode;
        mode = null;
        if (m === 'undo-confirm') { const r = await api.undo(); return say(r ? `Payment #${r.pid} is now marked UNDONE.` : 'Nothing to undo.'); }
        if (m === 'free-reason') { if (!val) { mode = m; return say('A reason is needed. Type it, then ENTER:'); } if (!(await api.freePlay(val))) return say('Finish the open payment first.'); return finish('free'); }
        if (m === 'hide-pid') { const ok = await api.hide(Number(val)); return say(ok ? `Nickname of payment #${val} is hidden.` : `No payment #${val}.`); }
        if (m === 'draw-confirm') { close(); await api.draw(''); return resolve(null); }
        if (m === 'draw-reason') { if (!val) { mode = m; return say('A reason is needed for a new draw:'); } close(); await api.draw(val); return resolve(null); }
        return null;
      }
      if (input) return null;
      const a = ACTIONS.find(([k]) => k === e.key);
      if (a) { e.preventDefault(); act(a[1]); }
      return null;
    }
    render();
    setKeys(onKey);
  });
}

// S12: rolls numbers, then shows the winning ticket and the jackpot.
export function drawScreen(ev, pool) {
  return new Promise((resolve) => {
    const el = open(`<div class="box gold wide"><h1>JACKPOT DRAW</h1>
      <p>${ev.count} TICKETS IN THE DRAW · JACKPOT ${fmtEuro(ev.jackpot)}</p>
      <div class="drawnum">----</div><p class="who"></p><div class="hint"></div></div>`, 'full clear');
    const num = el.querySelector('.drawnum');
    if (!ev.ticket) {
      num.textContent = 'NO TICKETS';
      num.style.fontSize = '90px';
      el.querySelector('.who').textContent = 'THE JACKPOT GOES TO CHARITY.';
      el.querySelector('.hint').innerHTML = 'Press <kbd>ENTER</kbd>.';
      setKeys((e) => { if (e.key === 'Enter') { close(); resolve(); } });
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
        el.querySelector('.who').textContent = `THE HOLDER OF TICKET ${fmtTicket(ev.ticket)} WINS ${fmtEuro(ev.jackpot)}!`;
        el.querySelector('.hint').innerHTML = 'Press <kbd>ENTER</kbd> to close.';
        sfx.reveal(4);
        fx.celebrate(4, 960, 560, '', '#ffd23f');
        setKeys((e) => { if (e.key === 'Enter') { close(); resolve(); } });
      }
    }, 70);
    setKeys(() => {});
  });
}
