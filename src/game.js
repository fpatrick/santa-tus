// game.js: one try of flying (R4): Santa, gravity, the 50 chimneys, moving gaps, crashes, the HUD.
// It knows nothing about prizes. It calls hooks: onStart, onFlap, onScore(n), onLevel(level), onCrash(n), onBeat().

import { CONFIG } from './config.js';
import { buildCourse, gapAt, levelFor } from './course.js';
import { drawSky, drawSnow, drawRoof, drawChimney, ROOF_Y } from './world.js';
import { drawSanta } from './sprites.js';

const cfg = CONFIG;
const ph = cfg.physics;
const CW = cfg.world.chimneyW;

export function createFlight(hooks = {}) {
  const f = {
    state: 'ready', // ready | flying | crashed | beat
    course: [], dist: 0, y: cfg.world.firstGap, vy: 0, t: 0, flyT: 0, score: 0, level: 1, angle: 0,
    autopilot: null, // { crashAfter } for the title screen demo
  };

  f.reset = () => {
    f.course = buildCourse(cfg);
    f.dist = 0;
    f.y = cfg.world.firstGap;
    f.vy = 0;
    f.flyT = 0;
    f.score = 0;
    f.level = 1;
    f.angle = 0;
    f.state = 'ready';
  };

  f.flap = () => {
    if (f.state === 'ready') { f.state = 'flying'; if (hooks.onStart) hooks.onStart(f.course); }
    if (f.state !== 'flying') return;
    f.vy = ph.flap;
    if (hooks.onFlap) hooks.onFlap(ph.santaX, f.y);
  };

  f.update = (dt) => {
    f.t += dt;
    if (f.state === 'ready') {
      f.y = cfg.world.firstGap + Math.sin(f.t * 3) * 14; // the course waits for the first click
      return;
    }
    if (f.state === 'beat') {
      f.dist += 500 * dt;
      f.y += (300 - f.y) * dt;
      f.angle = -0.15;
      return;
    }
    if (f.state === 'crashed') {
      if (f.y < ROOF_Y - 40) { f.vy = Math.min(f.vy + ph.gravity * dt, ph.maxFall); f.y += f.vy * dt; f.angle += 6 * dt; }
      return;
    }
    // flying
    f.flyT += dt;
    if (f.autopilot) autopilot(f);
    const lv = levelFor(f.score + 1, cfg);
    f.dist += lv.speed * dt;
    f.vy = Math.min(f.vy + ph.gravity * dt, ph.maxFall);
    f.y += f.vy * dt;
    if (f.y < 40) { f.y = 40; f.vy = 0; }
    f.angle = Math.max(-0.4, Math.min(0.7, (f.vy / ph.maxFall) * 0.7));
    const sx = ph.santaX + f.dist;
    while (f.score < f.course.length && sx > f.course[f.score].x + CW / 2) {
      f.score += 1;
      if (hooks.onScore) hooks.onScore(f.score);
      if (f.score >= cfg.thresholds.beat) {
        f.state = 'beat';
        if (hooks.onBeat) hooks.onBeat(f.score);
        return;
      }
      const nl = levelFor(f.score + 1, cfg).n;
      if (nl !== f.level) { f.level = nl; if (hooks.onLevel) hooks.onLevel(levelFor(f.score + 1, cfg)); }
    }
    if (hits(f)) crash(f);
  };

  function crash(fl) {
    fl.state = 'crashed';
    fl.vy = -200;
    if (hooks.onCrash) hooks.onCrash(fl.score, ph.santaX, fl.y);
  }

  f.render = (ctx, dt, hud) => {
    const lv = levelFor(Math.min(f.score + 1, cfg.thresholds.beat), cfg);
    drawSky(ctx, f.t, f.dist, lv.color);
    for (const ch of f.course) {
      const sx = ch.x - f.dist;
      if (sx < -CW - 40 || sx > cfg.world.width + CW + 40) continue;
      drawChimney(ctx, ch, sx, gapAt(ch, f.flyT), levelFor(ch.i, cfg).color, ch.i <= f.score);
    }
    drawRoof(ctx, f.dist);
    drawSanta(ctx, ph.santaX, f.y, f.angle, 4);
    drawSnow(ctx, dt);
    if (hud) drawHud(ctx, f, lv, hud);
  };

  return f;
}

function hits(f) {
  const sx = ph.santaX + f.dist;
  const top = f.y - ph.hitH / 2;
  const bot = f.y + ph.hitH / 2;
  if (bot >= ROOF_Y) return true;
  for (let k = Math.max(0, f.score - 1); k < Math.min(f.course.length, f.score + 2); k++) {
    const ch = f.course[k];
    if (Math.abs(ch.x - sx) > CW / 2 + 10 + ph.hitW / 2) continue;
    const gy = gapAt(ch, f.flyT);
    if (top < gy - ch.gap / 2 || bot > gy + ch.gap / 2) return true;
  }
  return false;
}

// Title screen demo: aims for the next gap, then lets go after `crashAfter` chimneys.
function autopilot(f) {
  if (f.score >= f.autopilot.crashAfter) return;
  const next = f.course[f.score];
  if (!next) return;
  const target = gapAt(next, f.flyT) + 30;
  if (f.y > target && f.vy > -120) f.flap();
}

// S4 + S5: score, level, tries left, best, next goal. hud = { triesLeft, best, test }
function drawHud(ctx, f, lv, hud) {
  const W = cfg.world.width;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  outlined(ctx, String(f.score), W / 2, 70, 120, '#f4f7ff', 'center');
  const goalAt = [10, 20, 30, 40, 50].find((g) => f.score < g);
  if (goalAt) outlined(ctx, `${cfg.text.goals[goalAt]} AT ${goalAt}`, W / 2, 210, 24, '#ffd23f', 'center');
  outlined(ctx, `LV${lv.n} ${lv.name}`, 30, 70, 30, lv.color, 'left');
  outlined(ctx, `TRIES ${Math.max(0, hud.triesLeft)}`, W - 30, 70, 30, '#3dff8b', 'right');
  outlined(ctx, `BEST ${hud.best}`, W - 30, 116, 30, '#ffd23f', 'right');
  if (f.state === 'ready') {
    const on = Math.floor(f.t * 2) % 2 === 0;
    outlined(ctx, cfg.text.clickToFly, W / 2, 640, 64, on ? '#ffd23f' : '#f4f7ff', 'center');
    if (hud.restarts) outlined(ctx, `${cfg.text.freeRestart} (${hud.restarts}/${cfg.freeRestart.max})`, W / 2, 740, 30, '#3dff8b', 'center');
  }
  ctx.textBaseline = 'alphabetic';
}

export function outlined(ctx, text, x, y, size, color, align = 'center') {
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.textAlign = align;
  ctx.lineWidth = Math.max(6, size / 5);
  ctx.strokeStyle = '#07051c';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
