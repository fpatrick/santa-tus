// crash.js: the crash scene (C1-C4). Santa tumbles onto the roof, his hat flies off, his bag rolls away
// and spills presents. After CONFIG.crash.fall seconds the camera zooms in, Santa climbs out of the
// sleigh and stands up, and a big speech box shows what he says (messages.js). Mood: 'ok', 'happy', 'sad'.
// The title-screen demo uses the same tumble, without zoom or speech (no message is ever set).

import { CONFIG } from './config.js';
import { drawSanta, drawSantaPart, partOffset } from './santa.js';
import { drawStandingSanta } from './santastand.js';
import { outlined } from './game.js';
import * as fx from './fx.js';
import { sfx } from './sound.js';

const C = CONFIG.crash;
const ROOF = CONFIG.world.height - CONFIG.world.roof;
const GRAV = CONFIG.physics.gravity;
const MOOD_COLOR = { ok: '#3dff8b', happy: '#ffd23f', sad: '#7fd4ff' };
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - (1 - k) ** 3);

export function createCrash(x, y, angle, bagSize) {
  const hatOff = partOffset('hat');
  const bagOff = partOffset('bag', 4, bagSize);
  const s = {
    t: 0, msg: null, msgAt: 0, standAt: 0, done: null, popped: false, clicked: false,
    body: { x, y, vx: 40, vy: -260, a: angle, va: 5, rest: false },
    hat: { x: x + hatOff.x, y: y + hatOff.y, vx: 120, vy: -640, a: 0, va: 9, rest: false, bounced: false },
    bag: { x: x + bagOff.x, y: y + bagOff.y, vx: 520, vy: -380, a: 0, rest: false, landed: false, size: bagSize },
  };

  // Called by flow.js once the try is saved. Resolves when the scene is over (or skipped by a click).
  s.play = (msg) => new Promise((resolve) => {
    s.msg = msg;
    s.msgAt = Math.max(s.t, C.fall);
    s.standAt = s.msgAt + C.zoom;
    s.done = resolve;
  });
  s.click = () => {
    if (!s.msg || s.t < s.standAt + C.stand + C.minRead) return;
    s.clicked = true;
  };
  s.zoom = () => (s.msg ? 1 + (C.zoomTo - 1) * ease((s.t - s.msgAt) / C.zoom) : 1);

  s.update = (dt) => {
    s.t += dt;
    fallBody(s.body, dt);
    fallHat(s.hat, dt);
    rollBag(s.bag, dt);
    if (!s.msg) return;
    const sinceStand = s.t - s.standAt;
    if (sinceStand >= 0 && !s.popped) {
      s.popped = true;
      sfx.pop();
      fx.burst(screen(s, standX(s), ROOF - 10).x, screen(s, standX(s), ROOF - 10).y, { count: 26, colors: ['#ffffff', '#dfe8ff'], speed: 380, size: 9, gravity: 600, life: 0.8 });
      if (s.msg.mood === 'sad') sfx.sad(); else if (s.msg.mood === 'happy') sfx.milestone(2); else sfx.cheer();
    }
    const end = s.standAt + C.stand + C.read[s.msg.state];
    if (s.done && (s.t >= end || s.clicked)) { const r = s.done; s.done = null; r(); }
  };

  // The world is already zoomed by game.js when this draws.
  s.drawActors = (ctx) => {
    const standing = s.msg && s.t >= s.standAt;
    drawSantaPart(ctx, 'bag', s.bag.x, s.bag.y, s.bag.a, 4, s.bag.size);
    drawSanta(ctx, s.body.x, s.body.y, s.body.a, 4, 1, standing ? 0 : 1, { hat: false, bag: false, empty: standing });
    drawSantaPart(ctx, 'hat', s.hat.x, s.hat.y, s.hat.a, 4);
    if (standing) {
      const k = Math.min(1, (s.t - s.standAt) / C.stand); // climbs out with a little hop
      const mood = s.msg.mood;
      const pose = mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : 'ok';
      const frame = Math.floor(s.t * (mood === 'sad' ? 1.5 : 3)) % 2;
      const hop = mood === 'happy' && k >= 1 ? Math.abs(Math.sin((s.t - s.standAt) * 6)) * 26 : 0;
      const climb = (1 - k) * 40 - Math.sin(k * Math.PI) * 30;
      drawStandingSanta(ctx, standX(s), ROOF + climb - hop, pose, frame, 4);
    }
  };

  // Screen space: a soft dark edge while zoomed, and the speech box.
  s.drawOverlay = (ctx) => {
    if (!s.msg) return;
    const z = (s.zoom() - 1) / (C.zoomTo - 1);
    if (z > 0) {
      const g = ctx.createRadialGradient(640, 600, 300, 640, 600, 900);
      g.addColorStop(0, 'rgba(7,5,28,0)');
      g.addColorStop(1, `rgba(7,5,28,${0.6 * z})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 1080);
    }
    const since = s.t - s.standAt - C.stand * 0.6;
    if (since > 0) speech(ctx, s, since);
  };

  return s;
}

// Santa stands just in front of his sleigh.
const standX = (s) => s.body.x + 95;

// Where a world point ends up on screen after the zoom (same maths as game.js).
export function focus(s) {
  return { x: s.body.x + 60, y: ROOF - 70 };
}
export function screen(s, x, y) {
  const z = s.zoom();
  const f = focus(s);
  const k = ease((s.t - s.msgAt) / C.zoom);
  const tx = f.x + (430 - f.x) * k;
  const ty = f.y + (720 - f.y) * k;
  return { x: (x - f.x) * z + tx, y: (y - f.y) * z + ty };
}

function fallBody(b, dt) {
  if (b.y >= ROOF - 30) { // on the roof: settle on its side, tilted a little
    b.a = Math.atan2(Math.sin(b.a), Math.cos(b.a));
    b.a += (0.4 - b.a) * Math.min(1, dt * 8);
  }
  if (b.rest) return;
  b.vy += GRAV * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.a += b.va * dt;
  if (b.y >= ROOF - 30) { // lands on its side, tilted
    b.y = ROOF - 30;
    b.vy = 0;
    b.vx *= 0.5;
    b.va = 0;
    if (Math.abs(b.vx) < 5) b.rest = true;
    b.vx *= 1 - dt * 6;
  }
}

function fallHat(h, dt) {
  if (h.rest) return;
  h.vy += GRAV * 0.7 * dt;
  h.x += h.vx * dt;
  h.y += h.vy * dt;
  h.a += h.va * dt;
  if (h.y >= ROOF - 14) {
    h.y = ROOF - 14;
    if (!h.bounced) { h.bounced = true; h.vy = -240; h.vx *= 0.5; h.va *= 0.4; } else { h.rest = true; h.a = 0.25; }
  }
}

function rollBag(b, dt) {
  if (b.rest) return;
  const r = 26 * b.size;
  b.vy += GRAV * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y >= ROOF - r) {
    b.y = ROOF - r;
    if (!b.landed) { // bump: presents spill out
      b.landed = true;
      fx.burst(b.x, b.y, { count: 14, colors: ['#d62839', '#1f9e55', '#ffd23f', '#2a6fdb', '#8e3bd6'], speed: 420, size: 12, gravity: 1300, life: 1.4, angle: -Math.PI / 2, spread: 2.2 });
    }
    b.vy = 0;
    b.vx *= 1 - dt * 1.6; // rolls and slows down
    if (Math.abs(b.vx) < 8) b.rest = true;
  }
  b.a += (b.vx / r) * dt;
}

// The big speech box (typewriter text), with a tail pointing at Santa's head.
function speech(ctx, s, since) {
  const msg = s.msg;
  const color = MOOD_COLOR[msg.mood];
  const head = screen(s, standX(s), ROOF - 90);
  const x = 560;
  const y = 250;
  const w = 680;
  ctx.save();
  ctx.font = '26px "Press Start 2P"';
  const body = wrap(ctx, msg.lines.join('\n'), w - 60);
  const h = 130 + body.length * 40 + 50;
  const pop = Math.min(1, since * 5);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  // tail
  ctx.fillStyle = '#07051c';
  ctx.beginPath(); ctx.moveTo(x + 40, y + h - 60); ctx.lineTo(head.x + 40, head.y); ctx.lineTo(x + 110, y + h - 6); ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath(); ctx.moveTo(x + 50, y + h - 66); ctx.lineTo(head.x + 48, head.y - 8); ctx.lineTo(x + 100, y + h - 12); ctx.fill();
  // box with a pixel border in the mood colour
  ctx.fillStyle = '#07051c';
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#fff6e0';
  ctx.fillRect(x, y, w, h);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  outlined(ctx, msg.title, x + 30, y + 30, msg.title.length > 16 ? 30 : 40, color, 'left');
  // typewriter
  let chars = Math.floor(Math.max(0, since - 0.25) * 45);
  ctx.font = '26px "Press Start 2P"';
  ctx.fillStyle = '#1a0a14';
  body.forEach((line, k) => {
    const show = line.slice(0, Math.max(0, chars));
    chars -= line.length;
    ctx.fillText(show, x + 30, y + 110 + k * 40);
  });
  if (s.t >= s.standAt + C.stand + C.minRead && Math.floor(s.t * 1.5) % 2 === 0) {
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = '#8a7a6a';
    ctx.textAlign = 'right';
    ctx.fillText(CONFIG.text.crash.skip, x + w - 24, y + h - 34);
  }
  ctx.restore();
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

// game.js calls this before drawing the world, so everything zooms in on the crash.
export function applyZoom(ctx, s) {
  if (!s.msg) return;
  const z = s.zoom();
  const f = focus(s);
  const k = ease((s.t - s.msgAt) / C.zoom);
  ctx.translate(f.x + (430 - f.x) * k, f.y + (720 - f.y) * k);
  ctx.scale(z, z);
  ctx.translate(-f.x, -f.y);
  ctx.imageSmoothingEnabled = false;
}
