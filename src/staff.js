// staff.js: the staff panel (S11, K2): totals and the end-of-day summary, the jackpot, cap counters, live odds,
// stock (view and edit), and the actions. The draw itself is in draw.js (S12, K3).
// The panel only calls functions that staffapi.js gives it (api), so all saving stays there. Every change is logged (D14).

import { CONFIG } from './config.js';
import { open, close, setKeys } from './screens.js';
import { fmtEuro, fmtTicket } from './ledger.js';
import { versionLabel } from './version.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ACTIONS = [
  ['1', 'undo', 'UNDO LAST PAYMENT'],
  ['2', 'free', 'FREE PLAY'],
  ['3', 'test', 'TEST MODE'],
  ['4', 'backup', 'BACKUP NOW'],
  ['5', 'export', 'EXPORT CSV'],
  ['6', 'hide', 'HIDE A NICKNAME'],
  ['7', 'sound', 'SOUND ON/OFF'],
  ['8', 'draw', 'DRAW'],
  ['9', 'newday', 'NEW DAY'],
  ['S', 'stock', 'STOCK: SET ITEMS LEFT'],
  ['J', 'jackpot', 'JACKPOT: FIX VALUE'],
  ['U', 'undodraw', 'UNDO THE DRAW'],
];

// The summary, prizes and odds part of the panel.
function infoHtml(i) {
  const t = i.totals;
  const sm = i.summary;
  const jp = i.live.jackpot;
  const prices = CONFIG.prices.map((p) => `${esc(p.label)}: <b>${t.count[p.id] || 0}</b>`).join(' · ');
  const tiers = Object.entries(CONFIG.sponsors).map(([k, T]) => {
    const x = sm.tiers[k];
    return `<div><span>${T.name}:</span> given ${x.given} · left ${x.left}${x.reserved ? ` (${x.reserved} won, not given yet)` : ''}</div>`;
  }).join('');
  const odds = i.live.list.map((x) => `${CONFIG.wheel.outcomes.find((o) => o.id === x.id).label} ${x.odds}%`).join(' · ');
  const ds = i.draw;
  const drawText = ds.done ? `done · jackpot ticket ${ds.jackpotDraw.ticket ? fmtTicket(ds.jackpotDraw.ticket) : 'none (charity)'}`
    : ds.started ? `started · ${ds.unitsLeft} items + jackpot to go` : 'not started';
  return `<div class="grid">
    <div class="span2">${prices} · free plays <b>${t.count.free || 0}</b> · undone <b>${t.undone}</b></div>
    <div><span>Total taken:</span> <b>${fmtEuro(sm.taken)}</b></div>
    <div><span>Jackpot paid:</span> ${fmtEuro(sm.jackpotPaid)} · <span>€10 cash paid:</span> ${fmtEuro(sm.cashPaid)}</div>
    <div><span>Jackpot now:</span> <b>${jp.closed ? 'drawn' : fmtEuro(jp.value)}</b>${jp.nextMins ? ` (+${fmtEuro(CONFIG.jackpot.step)} in ${jp.nextMins} min)` : ''}</div>
    <div><span>Caps:</span> wheel jackpot ${i.live.caps.jackpotWins}/${CONFIG.jackpot.wheelMaxWins} · €10 cash ${i.live.caps.cashWins}/${CONFIG.wheel.outcomes.find((o) => o.cash).maxWins}</div>
    <div><span>Sweets given:</span> ${sm.sweets} · <span>Tickets:</span> ${sm.tickets} (next ${fmtTicket(i.nextTicket)})</div>
    <div><span>Draw:</span> ${drawText}</div>
    ${tiers}
    <div class="span2"><span>Live odds:</span> ${esc(odds)}</div>
    <div><span>Clock:</span> ${new Date().toLocaleString('en-IE')} · ${i.mode === 'server' ? 'LAPTOP' : 'TEST LINK'}</div>
    <div><span>Test mode:</span> ${i.test ? 'ON' : 'off'} · <span>Sound:</span> ${i.muted ? 'muted' : 'on'} · <span>Waiting:</span> ${i.pending}</div>
    <div class="span2"><span>Version:</span> ${esc(versionLabel())}</div>
  </div>`;
}

// The stock list for "S": numbered items with what is left.
function stockList(i) {
  return i.items.map((it, k) => `${k + 1}. ${esc(it.label)}: <b>${it.left}</b>`).join(' · ');
}

// api: see staffapi.js. Resolves with 'free' when a free play was started (main.js runs it), otherwise null.
export function staffPanel(api) {
  return new Promise((resolve) => {
    let msg = '';
    let mode = null; // waiting for: 'undo-confirm' | 'free-reason' | 'hide-pid' | 'stock-in' | 'jackpot-in' | 'undodraw-reason'
    const render = () => {
      const i = api.info();
      const el = open(`<div class="box wide staff"><h1>STAFF PANEL</h1>
        ${infoHtml(i)}
        <div class="acts">${ACTIONS.map(([k, id, label]) => `<button class="btn ${id === 'newday' || id === 'undo' || id === 'undodraw' ? 'red' : id === 'draw' ? 'gold' : ''}" data-id="${id}"><span class="key">${k}</span>${label}</button>`).join('')}</div>
        <div class="msg">${msg}</div>
        <div class="hint">Press a number or letter. <kbd>ESC</kbd> closes the panel.</div></div>`, 'full');
      el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => act(b.dataset.id)));
      if ((mode && mode.endsWith('reason')) || (mode && mode.endsWith('-in')) || mode === 'hide-pid') {
        const box = el.querySelector('.msg');
        box.insertAdjacentHTML('beforeend', '<input class="staff-in" maxlength="60" spellcheck="false">');
        setTimeout(() => box.querySelector('input').focus(), 20);
      }
    };
    const say = (m, html = false) => { msg = html ? m : esc(m); render(); };
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
      if (id === 'stock') { mode = 'stock-in'; return say(`${stockList(api.info())}<br>Type the item number and the new count (for example "4 2"), then ENTER:`, true); }
      if (id === 'jackpot') { mode = 'jackpot-in'; return say(`Jackpot now ${fmtEuro(api.info().live.jackpot.value)}. Type the new value (0-${CONFIG.jackpot.max}), then ENTER:`); }
      if (id === 'undodraw') {
        if (!api.info().draw.started) return say('The draw has not started.');
        mode = 'undodraw-reason';
        return say('Type the reason to undo the WHOLE draw, then ENTER:');
      }
      if (id === 'draw') {
        const r = api.drawCheck();
        if (r) return say(r);
        close();
        await api.draw();
        return resolve(null);
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
        if (m === 'stock-in') { const [n, c] = val.split(/\s+/).map(Number); return say(await api.setStock(n, c)); }
        if (m === 'jackpot-in') return say(await api.fixJackpot(Number(val)));
        if (m === 'undodraw-reason') { if (!val) { mode = m; return say('A reason is needed:'); } return say(await api.undoDraw(val)); }
        return null;
      }
      if (input) return null;
      const a = ACTIONS.find(([k]) => k.toLowerCase() === e.key.toLowerCase());
      if (a) { e.preventDefault(); act(a[1]); }
      return null;
    }
    render();
    setKeys(onKey);
  });
}
