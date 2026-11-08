// wheelart.js: how the R7 wheel looks, dressed as a Christmas slot machine: a lit marquee sign on top,
// a wooden wheel with HD pixel icons (wheelicons.js) and chasing rim bulbs, a brass pointer, and a big
// lever on the side that the player "pulls" with the click. wheel.js has the logic and calls these.

import { iconCanvas } from './sprites.js';
import { wheelIcon, WHEEL_ICONS } from './wheelicons.js';
import { outlined } from './game.js';

export const CX = 640;
export const CY = 575;
export const RAD = 360;
export const TAU = Math.PI * 2;
const LEVER = { x: 1112, y: CY + 40, len: 230 };

// A warm spotlight on the wheel; it gets brighter while the player can click.
export function spotlight(ctx, w, t) {
  const k = w.phase === 'ready' ? 0.35 + 0.1 * Math.sin(t * 3) : 0.25;
  const g = ctx.createRadialGradient(CX, CY, RAD * 0.6, CX, CY, RAD * 1.7);
  g.addColorStop(0, `rgba(255, 210, 120, ${k})`);
  g.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 1080);
}

// Light rays behind the wheel. They get stronger as it slows, coloured by the result tier (a hint).
export function drawBuildRays(ctx, w, t) {
  if (!w.result || w.phase === 'idle' || w.phase === 'ready') return;
  const k = w.phase === 'spin' ? Math.max(0, (w.t / w.dur - 0.4) / 0.6) : 1;
  const tier = w.result.tier;
  const colors = tier >= 4 ? ['#ff3b4f', '#ffd23f', '#3dff8b', '#27c8ff', '#c35cff'] : [tier >= 2 ? w.result.color : '#f4f7ff'];
  const count = 8 + tier * 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const a = t * (0.3 + tier * 0.15) + (i / count) * TAU;
    ctx.globalAlpha = k * (0.08 + tier * 0.05);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a - 0.1) * 1400, CY + Math.sin(a - 0.1) * 1400);
    ctx.lineTo(CX + Math.cos(a + 0.1) * 1400, CY + Math.sin(a + 0.1) * 1400);
    ctx.fill();
  }
  ctx.restore();
}

// The slot-machine sign on top: red and gold box, chasing bulbs round the edge, the title inside.
export function drawMarquee(ctx, w, text) {
  const x = 250;
  const y = 18;
  const bw = 780;
  const bh = 108;
  ctx.fillStyle = '#07051c';
  ctx.fillRect(x - 8, y - 8, bw + 16, bh + 16);
  const g = ctx.createLinearGradient(0, y, 0, y + bh);
  g.addColorStop(0, '#d61f35');
  g.addColorStop(1, '#6e0816');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x + 14, y + 14, bw - 28, 4);
  ctx.fillRect(x + 14, y + bh - 18, bw - 28, 4);
  // bulbs: every third one is on, and the pattern runs round (a chase, not a flash)
  const step = Math.floor(w.bulbs * (w.phase === 'spin' ? 12 : 4));
  const spots = [];
  for (let i = 0; i < 26; i++) spots.push([x + 8 + (i * (bw - 16)) / 25, y + 2]);
  for (let i = 1; i < 4; i++) spots.push([x + bw - 2, y + 2 + (i * (bh - 4)) / 4]);
  for (let i = 25; i >= 0; i--) spots.push([x + 8 + (i * (bw - 16)) / 25, y + bh - 2]);
  for (let i = 3; i > 0; i--) spots.push([x + 2, y + 2 + (i * (bh - 4)) / 4]);
  spots.forEach(([bx, by], i) => {
    const on = (i + step) % 3 === 0;
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(bx - 7, by - 7, 14, 14);
    ctx.fillStyle = on ? '#fff6c8' : '#b8862a';
    ctx.fillRect(bx - 5, by - 5, 10, 10);
  });
  outlined(ctx, text, CX, y + 80, 50, '#ffd23f', 'center');
}

// The lever on the right side. pull 0 = up, 1 = pulled all the way down.
export function drawLever(ctx, pull) {
  const { x, y, len } = LEVER;
  const kx = x; // it swings towards the player and down, so the ball only moves down (and looks closer)
  const ky = y - Math.cos(pull * 2.2) * len;
  const r = 32 * (1 + pull * 0.25);
  // the box it is fixed to
  ctx.fillStyle = '#07051c';
  ctx.fillRect(x - 40, y - 46, 80, 132);
  const box = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
  box.addColorStop(0, '#ffe08a');
  box.addColorStop(0.5, '#c9962e');
  box.addColorStop(1, '#6b4612');
  ctx.fillStyle = box;
  ctx.fillRect(x - 34, y - 40, 68, 120);
  ctx.fillStyle = '#6e0816';
  ctx.fillRect(x - 22, y - 26, 44, 92);
  // the chrome rod
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#07051c';
  ctx.lineWidth = 22;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = '#c9d2f0';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(kx - 3, ky); ctx.stroke();
  // pivot and the red ball on top
  ctx.fillStyle = '#07051c';
  ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9962e';
  ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#07051c';
  ctx.beginPath(); ctx.arc(kx, ky, r + 6, 0, TAU); ctx.fill();
  const ball = ctx.createRadialGradient(kx - r * 0.38, ky - r * 0.38, 4, kx, ky, r + 2);
  ball.addColorStop(0, '#ffb0b8');
  ball.addColorStop(0.35, '#ff3b4f');
  ball.addColorStop(1, '#7a0a1a');
  ctx.fillStyle = ball;
  ctx.beginPath(); ctx.arc(kx, ky, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(kx - r / 2), Math.round(ky - r / 2), 8, 8);
}

// Text that fits: shrinks the font until `text` is narrower than `maxW`.
function fit(g, text, size, maxW) {
  let s = size;
  do { g.font = `${s}px "Press Start 2P"`; s -= 2; } while (g.measureText(text).width > maxW && s > 12);
  return s + 2;
}

// The wheel face is drawn once (wood, paint, icons, labels) and then only rotated.
function face(w) {
  if (w.face) return w.face;
  const size = RAD * 2 + 20;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const m = size / 2;
  g.translate(m, m);
  // wood: planks with grain
  g.save();
  g.beginPath();
  g.arc(0, 0, RAD, 0, TAU);
  g.clip();
  g.fillStyle = '#8a5a2b';
  g.fillRect(-m, -m, size, size);
  for (let y = -m; y < m; y += 46) {
    g.fillStyle = (y / 46) % 2 ? '#94622f' : '#7f5126';
    g.fillRect(-m, y, size, 44);
    g.fillStyle = 'rgba(40,20,5,0.55)';
    g.fillRect(-m, y + 44, size, 2);
    for (let k = 0; k < 6; k++) {
      g.strokeStyle = 'rgba(60,30,10,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      const yy = y + 6 + k * 6;
      g.moveTo(-m, yy);
      for (let x = -m; x < m; x += 40) g.quadraticCurveTo(x + 20, yy + Math.sin(x * 0.03 + k + y) * 4, x + 40, yy);
      g.stroke();
    }
  }
  // painted slices (wood shows through)
  for (const p of w.pieces) {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, RAD, p.start, p.start + p.size);
    g.closePath();
    g.globalAlpha = 0.72;
    g.fillStyle = p.k % 2 ? shade(p.o.color) : p.o.color;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#3b2210';
    g.lineWidth = 8;
    g.stroke();
    g.strokeStyle = '#d9a35a';
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
  // labels (one or two lines across the slice) and icons
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const p of w.pieces) {
    const mid = p.start + p.size / 2;
    const lines = p.o.short.split('\n');
    const thin = p.size < 0.3;
    g.save();
    g.rotate(mid);
    if (thin) { // a narrow slice: the text runs along the slice, from the middle out
      g.translate(RAD * 0.68, 0);
      const s = fit(g, lines.join(' '), 30, RAD * 0.5);
      label(g, lines.join(' '), 0, 0, s);
    } else {
      lines.forEach((line, i) => {
        const r = RAD * (lines.length > 1 ? 0.87 - i * 0.11 : 0.82);
        const room = 2 * r * Math.sin(p.size / 2) * 0.86;
        g.save();
        g.translate(r, 0);
        g.rotate(Math.PI / 2);
        const s = fit(g, line, lines.length > 1 ? 30 : 40, room);
        label(g, line, 0, 0, s);
        g.restore();
      });
      g.translate(RAD * 0.47, 0);
      g.rotate(Math.PI / 2);
      const ic = WHEEL_ICONS.includes(p.o.icon) ? wheelIcon(p.o.icon, 3) : iconCanvas(p.o.icon, 6);
      g.drawImage(ic, -ic.width / 2, -ic.height / 2);
    }
    g.restore();
  }
  w.face = c;
  return c;
}

function label(g, text, x, y, size) {
  g.font = `${size}px "Press Start 2P"`;
  g.lineWidth = Math.max(6, size / 4);
  g.strokeStyle = '#2a1608';
  g.strokeText(text, x, y);
  g.fillStyle = '#fff6e0';
  g.fillText(text, x, y);
}

export function drawWheel(ctx, w, pegs) {
  const win = w.phase === 'reveal' && w.result ? w.piece : null;
  // wooden rim with brass studs and light bulbs
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.arc(CX, CY, RAD + 48, 0, TAU);
  ctx.fill();
  const rim = ctx.createRadialGradient(CX, CY, RAD, CX, CY, RAD + 44);
  rim.addColorStop(0, '#5a3418');
  rim.addColorStop(0.5, '#a8743c');
  rim.addColorStop(1, '#4a2a12');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(CX, CY, RAD + 42, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(w.angle);
  const img = face(w);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  // brass pegs on the edge of the face: the pointer clicks over these
  for (let i = 0; i < pegs; i++) {
    const a = (i / pegs) * TAU;
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(Math.cos(a) * (RAD - 8) - 6, Math.sin(a) * (RAD - 8) - 6, 12, 12);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(Math.cos(a) * (RAD - 8) - 4, Math.sin(a) * (RAD - 8) - 4, 8, 8);
  }
  ctx.restore();
  if (win && Math.floor(w.revealT * 4) % 2 === 0) {
    ctx.save();
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 12;
    ctx.shadowColor = win.o.color;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RAD, win.start + w.angle, win.start + w.angle + win.size);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const on = (i + Math.floor(w.bulbs * (w.phase === 'spin' ? 5 : 2))) % 2 === 0; // A4: under 3 flashes a second
    const bx = CX + Math.cos(a) * (RAD + 22);
    const by = CY + Math.sin(a) * (RAD + 22);
    ctx.fillStyle = '#3b2210';
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = on ? '#fff6c8' : '#c08a2a';
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, TAU);
    ctx.fill();
  }
  // hub: wood and brass
  const hub = ctx.createRadialGradient(CX - 20, CY - 20, 10, CX, CY, 74);
  hub.addColorStop(0, '#ffe08a');
  hub.addColorStop(0.5, '#c9962e');
  hub.addColorStop(1, '#6b4612');
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.arc(CX, CY, 80, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(CX, CY, 72, 0, TAU);
  ctx.fill();
  outlined(ctx, 'SPIN', CX, CY - 2, 26, '#fff6e0', 'center');
  // pointer: a brass arrow with a red jewel
  ctx.save();
  ctx.translate(CX, CY - RAD - 36);
  ctx.rotate(-w.flap * 0.35);
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.moveTo(-38, -44); ctx.lineTo(38, -44); ctx.lineTo(0, 54); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9a83a';
  ctx.beginPath();
  ctx.moveTo(-28, -36); ctx.lineTo(28, -36); ctx.lineTo(0, 40); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff3b4f';
  ctx.beginPath();
  ctx.arc(0, -16, 10, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.78);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
