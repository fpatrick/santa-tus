// main.js: starts everything: screen scaling, saving, health check, the draw loop, keys and mouse.
// The payment path itself is in flow.js. The prize logic is in rules.js.

import { CONFIG } from './config.js';
import { versionLabel, DISCLAIMER, STAGE } from './version.js';
import { buildState, applyEvent, openPayment, leaderboard, legends, totals, displayName, drawPool, lastActivePayment } from './ledger.js';
import * as R from './rules.js';
import { createStore } from './store.js';
import { createFlight } from './game.js';
import { createAttract } from './attract.js';
import { createWheel } from './wheel.js';
import { createBoard } from './board.js';
import { initWorld } from './world.js';
import { buildCsv } from './report.js';
import * as fx from './fx.js';
import { initSound, unlockSound, sfx, setMuted, isMuted, soundState } from './sound.js';
import * as screens from './screens.js';
import { staffPanel, drawScreen } from './staff.js';
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
    top: leaderboard(s, CONFIG).map((p) => ({ pid: p.pid, name: displayName(p, CONFIG), best: p.best, master: p.best >= CONFIG.thresholds.master })),
    legends: legends(s, CONFIG).map((p) => ({ name: displayName(p, CONFIG), master: p.best >= CONFIG.thresholds.master })),
    jackpot: t.jackpot, lastDraw: t.lastDraw, freshPid: app.freshPid,
  });
  banners();
};

function attractInfo() {
  const s = app.ledgers.live;
  return {
    top: leaderboard(s, CONFIG).map((p) => ({ name: displayName(p, CONFIG), best: p.best, master: p.best >= CONFIG.thresholds.master })),
    legends: legends(s, CONFIG).map((p) => displayName(p, CONFIG)),
    jackpot: totals(s, CONFIG).jackpot, drawTime: CONFIG.event.drawTime,
  };
}

function banners() {
  const out = [];
  if (app.store.mode === 'browser') out.push(['test', CONFIG.text.testVersion]);
  if (app.test) out.push(['test', CONFIG.text.testMode]);
  if (app.store.mode === 'server' && !app.store.online) out.push(['down', `${CONFIG.text.serverDown} (${app.store.pendingCount()})`]);
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
  requestAnimationFrame(loop);
}

// ---------- staff actions ----------
async function startPaid() {
  if (app.flowActive || screens.isOpen()) return;
  if (!(await screens.staffCode())) return;
  const s = app.led();
  const id = await screens.payment({ testMode: app.test, drawDone: s.draws.length > 0 });
  if (!id) return;
  const name = app.ledgerName();
  const ev = await app.commit(name, R.payBody(s, id, CONFIG));
  sfx.confirm();
  runPayment(app, name, s.byPid.get(ev.pid));
}

async function openStaff() {
  if (screens.isOpen()) return;
  if (app.flowActive && !(app.scene === 'flight' && app.flight.state === 'ready')) return;
  if (!(await screens.staffCode('STAFF PANEL'))) return;
  const r = await staffPanel(staffApi());
  if (r === 'free') {
    const name = app.ledgerName();
    runPayment(app, name, openPayment(app.led(name)));
  }
}

function staffApi() {
  const name = () => app.ledgerName();
  return {
    info: () => ({ totals: totals(app.led(), CONFIG), nextTicket: app.led().nextTicket, mode: app.store.mode, test: app.test, muted: isMuted(), pending: app.store.pendingCount() }),
    undoInfo: () => lastActivePayment(app.led()),
    undo: async () => {
      const body = R.undoBody(app.led());
      if (!body) return null;
      await app.commit(name(), body);
      if (app.flowActive) app.endFlight({ aborted: true });
      return body;
    },
    freePlay: async (reason) => {
      if (app.flowActive || openPayment(app.led())) return false;
      await app.commit(name(), R.payBody(app.led(), 'free', CONFIG, reason));
      return true;
    },
    setTest: async (on) => {
      if (app.flowActive) return false;
      app.test = on;
      await app.commit(name(), R.staffBody('test-mode', on ? 'on' : 'off'));
      banners();
      return true;
    },
    backup: async () => { await app.commit(name(), R.staffBody('backup')); return app.store.backup(); },
    exportCsv: async () => { await app.commit(name(), R.staffBody('export')); return app.store.exportCsv(name(), buildCsv(app.led(), CONFIG, name())); },
    hide: async (pid) => { if (!app.led().byPid.get(pid)) return false; await app.commit(name(), { t: 'hide', pid }); return true; },
    toggleSound: () => setMuted(!isMuted()),
    askCode: () => screens.staffCode('CODE AGAIN FOR NEW DAY'),
    newDay: async () => {
      if (app.flowActive) return { ok: false };
      await app.commit(name(), R.staffBody('new-day'));
      const r = await app.store.newDay(name());
      if (r && r.ok) app.ledgers[name()] = buildState([]);
      app.refresh();
      return r;
    },
    draw: async (reason) => {
      const s = app.led();
      const ev = await app.commit(name(), R.drawBody(s, CONFIG, R.secureRandom, reason));
      await drawScreen(ev, drawPool(s));
    },
  };
}

// ---------- input ----------
function onKey(e) {
  unlockSound();
  if (screens.handleKey(e)) return;
  if (e.key === CONFIG.keys.staffCode) { e.preventDefault(); if (app.scene === 'attract') startPaid(); return; }
  if (e.key === CONFIG.keys.staffPanel) { e.preventDefault(); openStaff(); return; }
  if ((e.key === ' ' || e.key === 'ArrowUp') && app.scene === 'flight') { e.preventDefault(); app.flight.flap(); }
}

function onPointer(e) {
  unlockSound();
  if (e.target.id === 'hotspot' && app.scene === 'attract') { startPaid(); return; }
  if (screens.isOpen()) return;
  if (app.scene === 'flight' && e.button === 0) { e.preventDefault(); app.flight.flap(); }
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
      runPayment(app, n, p);
      break;
    }
  }
}

boot();
