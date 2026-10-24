// attract.js: the arcade title screen (S1, A1-A6). Four scenes of about 8 seconds, then a demo
// where Santa flies by himself and crashes. Every word comes from CONFIG.text (A6).

import { CONFIG } from './config.js';
import { drawSky, drawSnow, drawRoof } from './world.js';
import { drawSanta } from './sprites.js';
import { createFlight, outlined } from './game.js';
import { fmtEuro } from './ledger.js';

const T = CONFIG.text;
const W = 1280;
const SCENES = ['logo', 'prices', 'prizes', 'board', 'demo'];

// getInfo() returns { top: [{name, best, master}], legends: [name], jackpot, drawTime }
export function createAttract(getInfo) {
  const a = { t: 0, i: 0, sceneT: 0, demo: createFlight({}) };

  a.reset = () => { a.i = 0; a.sceneT = 0; };

  a.update = (dt) => {
    a.t += dt;
    a.sceneT += dt;
    const name = SCENES[a.i];
    const len = name === 'demo' ? CONFIG.attract.demoSeconds : CONFIG.attract.sceneSeconds;
    if (name === 'demo') {
      a.demo.update(dt);
      if (a.demo.state === 'crashed' && a.sceneT > len) next(a);
    } else if (a.sceneT > len) next(a);
  };

  a.render = (ctx, dt) => {
    const name = SCENES[a.i];
    if (name === 'demo') {
      a.demo.render(ctx, dt, null);
      outlined(ctx, 'DEMO', W / 2, 90, 48, '#c35cff', 'center');
    } else {
      drawSky(ctx, a.t, a.t * 60, '#3dff8b');
      drawRoof(ctx, a.t * 60);
      ctx.fillStyle = 'rgba(7, 5, 28, 0.45)'; // dims the town so the text stands out
      ctx.fillRect(0, 0, W, 1080);
      if (name === 'logo') logo(ctx, a);
      if (name === 'prices') prices(ctx, a);
      if (name === 'prizes') prizes(ctx);
      if (name === 'board') board(ctx, getInfo());
      drawSnow(ctx, dt);
    }
    const on = Math.floor(a.t * 1.5) % 2 === 0; // A4: slow blink
    if (on) outlined(ctx, T.pay, W / 2, 900, 40, '#ffd23f', 'center');
    if (T.ageNote) outlined(ctx, T.ageNote, W / 2, 960, 32, '#f4f7ff', 'center');
    const k = Math.min(1, a.sceneT * 4);
    if (k < 1) { ctx.fillStyle = `rgba(7,5,28,${1 - k})`; ctx.fillRect(0, 0, W, 1080); }
  };

  return a;
}

function next(a) {
  a.i = (a.i + 1) % SCENES.length;
  a.sceneT = 0;
  if (SCENES[a.i] === 'demo') {
    a.demo.reset();
    a.demo.autopilot = { crashAfter: 3 + Math.floor(Math.random() * 6) };
    a.demo.flap();
  }
}

function logo(ctx, a) {
  const bob = Math.sin(a.t * 2.5) * 16;
  drawSanta(ctx, W / 2, 330 + bob, Math.sin(a.t * 2) * 0.08, 14);
  ctx.font = '130px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7d1b30';
  ctx.fillText(T.title, W / 2 + 10, 650 + 10);
  outlined(ctx, T.title, W / 2, 650, 130, '#ff3b4f', 'center');
  outlined(ctx, T.tagline, W / 2, 740, 34, '#f4f7ff', 'center');
  ctx.font = '34px VT323';
  ctx.fillStyle = '#c9d2f0';
  ctx.fillText(T.charity, W / 2, 810);
}

function prices(ctx, a) {
  outlined(ctx, 'PRICES', W / 2, 150, 48, '#27c8ff', 'center');
  const [p1, p2] = CONFIG.prices;
  priceBox(ctx, 160, 230, 960, 170, p1.label, '#3dff8b');
  priceBox(ctx, 160, 450, 960, 170, p2.label, '#ffd23f');
  if (p2.badge) {
    ctx.save();
    ctx.translate(1080, 455);
    ctx.rotate(0.12 + Math.sin(a.t * 3) * 0.04);
    ctx.fillStyle = '#ff3b4f';
    ctx.fillRect(-150, -40, 300, 80);
    outlined(ctx, p2.badge, 0, 12, 30, '#f4f7ff', 'center');
    ctx.restore();
  }
  outlined(ctx, T.bestTry, W / 2, 740, 44, '#f4f7ff', 'center');
}

function priceBox(ctx, x, y, w, h, text, color) {
  ctx.fillStyle = '#07051c';
  ctx.fillRect(x + 10, y + 10, w, h);
  ctx.fillStyle = '#1d1260';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(x, y, w, h);
  outlined(ctx, text, x + w / 2, y + h / 2 + 32, 72, color, 'center');
}

function prizes(ctx) {
  outlined(ctx, T.winTitle, W / 2, 130, 44, '#27c8ff', 'center');
  const rows = [[10, T.win10, '#3dff8b'], [20, T.win20, '#27c8ff'], [30, T.win30, '#ffd23f'], [40, T.win40, '#c35cff']];
  rows.forEach(([n, text, color], k) => {
    const y = 230 + k * 105;
    outlined(ctx, String(n), 150, y + 40, 64, color, 'center');
    outlined(ctx, text, 250, y + 30, 32, '#f4f7ff', 'left');
  });
  outlined(ctx, T.oddsTitle, W / 2, 690, 32, '#ffd23f', 'center');
  ctx.font = '40px VT323';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f7ff';
  ctx.fillText(CONFIG.wheel.outcomes.map((o) => `${o.label} ${o.odds}%`).join('   '), W / 2, 760);
}

function board(ctx, info) {
  outlined(ctx, 'JACKPOT', W / 2, 120, 40, '#ffd23f', 'center');
  outlined(ctx, fmtEuro(info.jackpot), W / 2, 230, 96, '#fff6c8', 'center');
  outlined(ctx, `${T.drawAt} ${info.drawTime}`, W / 2, 290, 32, '#f4f7ff', 'center');
  outlined(ctx, 'TOP 10 TODAY', 330, 380, 32, '#3dff8b', 'center');
  ctx.font = '42px VT323';
  ctx.textAlign = 'left';
  if (!info.top.length) {
    ctx.fillStyle = '#c9d2f0';
    ctx.fillText('BE THE FIRST!', 120, 450);
  }
  info.top.slice(0, 10).forEach((r, k) => {
    ctx.fillStyle = r.master ? '#c35cff' : k === 0 ? '#ffd23f' : '#f4f7ff';
    ctx.fillText(`${String(k + 1).padStart(2, ' ')}. ${r.name}`, 80, 450 + k * 42);
    ctx.textAlign = 'right';
    ctx.fillText(String(r.best), 600, 450 + k * 42);
    ctx.textAlign = 'left';
  });
  outlined(ctx, 'LEGENDS', 960, 380, 32, '#ffd23f', 'center');
  ctx.font = '42px VT323';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f7ff';
  if (!info.legends.length) {
    ctx.fillStyle = '#c9d2f0';
    ctx.fillText('PASS CHIMNEY 30', 740, 450);
  }
  info.legends.slice(0, 10).forEach((n, k) => ctx.fillText(n, 740, 450 + k * 42));
}
