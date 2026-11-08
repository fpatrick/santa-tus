// main.js: starts everything: screen scaling, saving, health check, the draw loop, keys and mouse.
// The payment path itself is in flow.js. The prize logic is in rules.js.

import { CONFIG } from './config.js';
import { versionLabel, DISCLAIMER, STAGE } from './version.js';
import { buildState, applyEvent, openPayment, leaderboard, totals, displayName, plainName, rankOf, lastActivePayment, fmtEuro } from './ledger.js';
import { timeState, itemById } from './prizes.js';
import * as R from './rules.js';
import { createStore } from './store.js';
import { createFlight } from './game.js';
import { createAttract } from './attract.js';
import { createWheel } from './wheel.js';
import { createBoard } from './board.js';
import { initWorld } from './world.js';
import * as fx from './fx.js';
import { initSound, unlockSound, sfx, isMuted, soundState } from './sound.js';
import * as screens from './screens.js';
import { staffPanel } from './staff.js';
import { staffApi } from './staffapi.js';
import { runPayment, flightHooks } from './flow.js';
import { music } from './music.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const app = { scene: 'blank', test: false, flowActive: false, ledgers: {}, hud: null, freshPid: null, endFlight: () => {} };
window.santa = app; // for the browser flow test (tests/flow_check.py)
app.music = music;

// ---------- stage scaling ----------
function fit() {
  const w = document.body.classList.contains('board-only') ? 640 : 1920;
  const k = Math.min(innerWidth / w, innerHeight / 1080);
  $('stage').style.transform = `translate(${(innerWidth - w * k) / 2}px, ${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
}

// ---------- ledgers and saving ----------
app.ledgerName = () => (app.test ? 'test' : 'live');
app.led = (name = app.ledgerName()) => app.ledgers[name];
app.commit = async (name, body) => {
  const s = app.ledgers[name];
  const ev = R.stamp(s, body);
  applyEvent(s, ev);
  await app.store.append(name, ev); // D1: saved before the next screen
  app.refresh();
  return ev;
};

app.refresh = () => {
  const s = app.ledgers.live;
  const t = totals(s, CONFIG);
  app.board.update({
    top: leaderboard(s, CONFIG).map((p) => ({ pid: p.pid, name: plainName(p, CONFIG), rank: rankOf(p, CONFIG), best: p.best })),
    jackpot: t.jackpotInfo.closed ? (t.lastDraw.amount || 0) : t.jackpot, jp: t.jackpotInfo, lastDraw: t.lastDraw, freshPid: app.freshPid,
    player: playerInfo(lastActivePayment(app.led ? app.led() : s)),
  });
  banners();
};

// The player box on the panel: what this payment already got (shown until the next game starts).
function playerInfo(p) {
  if (!p) return null;
  const tile = p.p10 && CONFIG.choice.find((c) => c.id === p.p10);
  const spin = p.wheel && CONFIG.wheel.outcomes.find((o) => o.id === p.wheel);
  const item = p.item && itemById(CONFIG, p.item);
  let spinText = spin ? spin.label : null;
  if (p.jackpotWon) spinText = `${CONFIG.text.jackpot} ${fmtEuro(p.jackpotWon)}`;
  if (item) spinText = `${spinText}: ${item.label}`;
  if (p.swapped) spinText = `${spinText} (+${CONFIG.tickets.swap} TICKETS)`;
  return {
    name: displayName(p, CONFIG), best: p.best, open: p.status === 'open', triesLeft: Math.max(0, R.triesLeft(p)),
    p10: tile ? (tile.id === 'free' ? 'FREE TRY (INSTEAD OF SWEET)' : tile.label) : null,
    spinEarned: p.best >= CONFIG.thresholds.ticket, spin: spinText, tickets: p.tickets,
  };
}

function attractInfo() {
  const s = app.ledgers.live;
  return {
    top: leaderboard(s, CONFIG).map((p) => ({ name: plainName(p, CONFIG), rank: rankOf(p, CONFIG), best: p.best })),
    jackpot: totals(s, CONFIG).jackpot, jp: totals(s, CONFIG).jackpotInfo, drawTime: CONFIG.event.drawTime,
  };
}

function banners() {
  const out = [];
  if (app.store.mode === 'browser') out.push(['test', CONFIG.text.testVersion]);
  if (app.test) out.push(['test', CONFIG.text.testMode]);
  if (app.store.mode === 'server' && !app.store.online) out.push(['down', `${CONFIG.text.serverDown} (${app.store.pendingCount()})`]);
  if (timeState(CONFIG) && !app.test) out.push(['late', CONFIG.text.lastGames.replace('{draw}', CONFIG.event.drawTime)]); // R26
  $('banners').innerHTML = out.map(([c, t]) => `<div class="banner ${c}">${t}</div>`).join('');
}

// ---------- scenes and the loop ----------
app.setScene = (name) => { app.scene = name; if (name === 'attract') { app.attract.reset(); music.menu(); } };
app.waitFlight = () => new Promise((resolve) => {
  app.flightWaiting = true;
  app.endFlight = (r) => { app.endFlight = () => {}; app.flightWaiting = false; resolve(r); };
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const ctx = app.ctx;
  if (app.scene === 'attract') {
    app.attract.update(dt);
    app.attract.render(ctx, dt);
  } else if (app.scene === 'flight') {
    app.flight.update(dt);
    app.flight.render(ctx, dt, app.hud);
  } else if (app.scene === 'wheel') {
    app.wheel.update(dt);
    app.wheel.render(ctx, dt, now / 1000);
  }
  if (app.flight) music.update(app.flight.dist);
  fx.updateFx(dt);
  fx.renderFx();
  app.board.tick(dt);
  app.secs = (app.secs || 0) + dt;
  if (app.secs >= 1) { app.secs = 0; app.refresh(); } // the jackpot grows with time (R13), the 12:30 banner (R26)
  requestAnimationFrame(loop);
}

// ---------- staff actions ----------
async function startPaid() {
  if (app.flowActive || screens.isOpen()) return;
  if (!(await screens.staffCode())) return;
  const s = app.led();
  const pick = await screens.payment({ testMode: app.test, late: timeState(CONFIG) === 'late', drawDone: totals(s, CONFIG).jackpotInfo.closed });
  if (!pick) return;
  const name = app.ledgerName();
  if (pick.override) await app.commit(name, R.staffBody('late-payment', 'staff pressed O (R26)'));
  const ev = await app.commit(name, R.payBody(s, pick.id, CONFIG));
  sfx.confirm();
  runPayment(app, name, s.byPid.get(ev.pid));
}

async function openStaff() {
  if (screens.isOpen()) return;
  if (app.flowActive && !(app.scene === 'flight' && app.flight.state === 'ready')) return;
  if (!(await screens.staffCode('STAFF PANEL'))) return;
  const r = await staffPanel(staffApi(app));
  if (r === 'free') {
    const name = app.ledgerName();
    runPayment(app, name, openPayment(app.led(name)));
  }
}

// ---------- input ----------
// Is the hold key (F) down right now? For "F + 2" and "F + 9" on keyboards without F keys.
let holdDown = false;
const K = CONFIG.keys;
addEventListener('keyup', (e) => { if (e.key.toLowerCase() === K.holdKey) holdDown = false; });
addEventListener('blur', () => { holdDown = false; });

function onKey(e) {
  unlockSound();
  if (screens.handleKey(e)) return;
  if (e.key.toLowerCase() === K.holdKey) { holdDown = true; return; }
  const code = e.key === K.staffCode || (holdDown && e.key === K.staffCodeAlt);
  const panel = e.key === K.staffPanel || (holdDown && e.key === K.staffPanelAlt);
  if (code) { e.preventDefault(); holdDown = false; if (app.scene === 'attract') startPaid(); return; }
  if (panel) { e.preventDefault(); holdDown = false; openStaff(); return; }
  if ((e.key === ' ' || e.key === 'ArrowUp') && app.scene === 'flight') { e.preventDefault(); app.flight.flap(); }
  if ((e.key === ' ' || e.key === 'Enter') && app.scene === 'flight' && app.flight.state === 'crashed') { e.preventDefault(); app.flight.click(); }
  if ((e.key === ' ' || e.key === 'Enter') && app.scene === 'wheel') { e.preventDefault(); app.wheel.click(); }
}

function onPointer(e) {
  unlockSound();
  if (e.target.id === 'hotspot' && app.scene === 'attract') { startPaid(); return; }
  if (screens.isOpen()) return;
  if (app.scene === 'flight' && e.button === 0) { e.preventDefault(); if (app.flight.state === 'crashed') app.flight.click(); else app.flight.flap(); }
  if (app.scene === 'wheel' && e.button === 0) app.wheel.click();
}

// ---------- S13 health check ----------
async function healthCheck() {
  const checks = [];
  const h = app.store.mode === 'server' ? await app.store.check() : null;
  if (app.store.mode === 'server') {
    checks.push({ name: 'Server', level: h && h.ok ? 'ok' : 'bad', text: h && h.ok ? 'running, saving to the laptop' : 'not answering: restart "Start Santa TUS"' });
    checks.push({ name: 'Database', level: h && h.db === 'ok' ? 'ok' : 'bad', text: h ? `${h.db} · ${h.dataDir || ''}` : 'unknown' });
    checks.push({ name: 'USB backup', level: h && h.usb ? 'ok' : 'warn', text: h && h.usb ? h.usb : 'no USB stick found: insert one' });
  } else {
    checks.push({ name: 'Server', level: 'warn', text: 'test link: scores stay in this browser' });
  }
  const now = new Date();
  checks.push({ name: 'Clock', level: now.getFullYear() >= 2026 ? 'ok' : 'warn', text: now.toLocaleString('en-IE') });
  const ratio = innerWidth / innerHeight;
  checks.push({ name: 'Screen', level: Math.abs(ratio - 16 / 9) < 0.08 ? 'ok' : 'warn', text: `${innerWidth} x ${innerHeight}${Math.abs(ratio - 16 / 9) < 0.08 ? '' : ' (not 16:9)'}` });
  const fonts = document.fonts.check('32px "Press Start 2P"') && document.fonts.check('32px VT323');
  checks.push({ name: 'Fonts', level: fonts ? 'ok' : 'bad', text: fonts ? 'loaded' : 'missing: re-copy the game folder' });
  const snd = soundState();
  checks.push({ name: 'Sound', level: snd === 'running' ? 'ok' : snd === 'none' ? 'bad' : 'warn', text: snd === 'running' ? (isMuted() ? 'muted' : 'on') : 'click or press a key once to turn it on' });
  const errs = R.checkConfig(CONFIG);
  checks.push({ name: 'Settings', level: errs.length ? 'bad' : 'ok', text: errs.length ? errs[0] : 'config.js is fine' });
  const p = app.store.pendingCount();
  if (p) checks.push({ name: 'Waiting', level: 'warn', text: `${p} results waiting to be saved` });
  await screens.health(checks, `SANTA TUS ${versionLabel()}`);
}

// ---------- start ----------
async function boot() {
  if (params.get('view') === 'board') document.body.classList.add('board-only');
  fit();
  addEventListener('resize', fit);
  $('beta').textContent = `${versionLabel()} · ${DISCLAIMER}`;
  if (STAGE === 'FINAL') $('beta').classList.add('final');
  app.ctx = $('game').getContext('2d');
  app.ctx.imageSmoothingEnabled = false;
  fx.initFx($('fx'), $('shake'));
  initWorld();
  initSound();
  try { await document.fonts.load('32px "Press Start 2P"'); await document.fonts.load('32px VT323'); } catch { /* checked in S13 */ }
  app.store = await createStore({ forceBrowser: params.get('mode') === 'browser' });
  for (const n of ['live', 'test']) app.ledgers[n] = buildState(app.store.events[n]);
  app.board = createBoard($('panel'));
  app.store.onStatus(() => banners());
  app.refresh();
  if (document.body.classList.contains('board-only')) {
    app.store.watch('live', (evs) => { app.ledgers.live = buildState(evs); app.refresh(); });
    requestAnimationFrame(loop);
    return;
  }
  app.flight = createFlight(flightHooks(app));
  app.attract = createAttract(attractInfo);
  app.wheel = createWheel();
  addEventListener('keydown', onKey);
  $('stage').addEventListener('pointerdown', onPointer);
  addEventListener('contextmenu', (e) => e.preventDefault());
  app.setScene('attract');
  requestAnimationFrame(loop);
  await healthCheck();
  // D3: reopen an unfinished payment (test ledger first, then live)
  for (const n of ['test', 'live']) {
    const p = openPayment(app.ledgers[n]);
    if (p) {
      app.test = n === 'test';
      banners();
      await screens.message('WELCOME BACK', [`PAYMENT #${p.pid} WAS NOT FINISHED.`, `TRIES LEFT: ${R.triesLeft(p)} · BEST: ${p.best}`], { secs: 3, cls: 'gold' });
      runPayment(app, n, p, { resumed: true });
      break;
    }
  }
}

boot();
