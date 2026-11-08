// wheelart.js: how the R7 wheel looks, in 16-bit HD pixel art (ART.md): a lit marquee sign on top, then the wheel.
// The face is painted in art pixels (1 art pixel = P screen pixels, the same size as the prize icons, A2): colour
// bands per slice, brass dividers and pegs, a gold ring and the ink outline. It turns like a SNES "Mode 7" picture
// (square pixels, no blur). The words and icons are pixel art too, drawn on top each frame so they stay sharp.
// The wooden rim with chasing bulbs, the brass hub and the pointer do not turn. wheel.js has the logic.

import { iconCanvas } from './sprites.js';
import { wheelIcon, WHEEL_ICONS } from './wheelicons.js';
import { outlined } from './game.js';
import { enlarge } from './pixelart.js';

export const P = 3; // screen pixels per art pixel
export const CX = 640;
export const CY = 565;
export const RAD = 378; // face radius in screen pixels (126 art pixels)
export const TAU = Math.PI * 2;
const RA = RAD / P;
const RIM = 9; // the wooden rim, in art pixels
const HUB = 22;
const INK = '#1a0a14';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (a) => `#${a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const tint = (hex, k) => toHex(rgb(hex).map((v) => (k > 0 ? v + (255 - v) * k : v * (1 + k)))); // k > 0 lighter, k < 0 darker

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

// ---------- the face: painted once per layout (art pixels), then enlarged ----------
function face(w) {
  if (w.face) return w.face;
  const D = RA * 2 + 2;
  const c = canvas(D, D);
  const g = c.getContext('2d');
  const img = g.createImageData(D, D);
  const d = img.data;
  const m = D / 2;
  const pieces = w.pieces;
  const shades = pieces.map((p) => {
    const base = p.k % 2 ? tint(p.o.color, -0.16) : p.o.color;
    return [tint(base, 0.35), tint(base, 0.15), base, tint(base, -0.22), tint(base, -0.42)].map(rgb); // light centre -> dark edge
  });
  const put = (i, col) => { [d[i], d[i + 1], d[i + 2]] = col; d[i + 3] = 255; };
  const C = { ink: rgb(INK), wood: rgb('#2a1608'), gold: rgb('#ffd23f'), goldL: rgb('#fff3a8'), goldD: rgb('#b37c00') };
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - m, dy = y + 0.5 - m, r = Math.hypot(dx, dy);
    if (r >= RA) continue;
    const i = (y * D + x) * 4;
    if (r > RA - 1) { put(i, C.ink); continue; }
    if (r > RA - 4) { put(i, r > RA - 2 ? C.goldD : r > RA - 3 ? C.gold : C.goldL); continue; } // the gold ring
    if (r > RA - 5) { put(i, C.ink); continue; }
    let a = Math.atan2(dy, dx);
    if (a < 0) a += TAU;
    let k = pieces.findIndex((p) => a >= p.start && a < p.start + p.size);
    if (k < 0) k = pieces.length - 1;
    const p = pieces[k];
    const e = Math.min(a - p.start, p.start + p.size - a) * r; // art pixels to the nearest divider
    if (e < 0.9) { put(i, C.wood); continue; }
    if (e < 1.8) { put(i, C.goldD); continue; } // brass divider strips
    const t = r / (RA - 5);
    const band = [0.28, 0.5, 0.78, 0.92];
    let b = band.findIndex((v) => t < v);
    if (b < 0) b = 4;
    const lo = b > 0 ? band[b - 1] : -1; // 1-pixel checker dither where two bands meet (A5)
    if (b > 0 && t - lo < 1.6 / RA && (x + y) % 2) b -= 1;
    put(i, shades[k][b]);
  }
  g.putImageData(img, 0, 0);
  // brass pegs near the edge: the pointer clicks over them (they turn with the face)
  for (let n = 0; n < w.pegCount; n++) {
    const a = (n / w.pegCount) * TAU;
    const px = Math.round(m + Math.cos(a) * (RA - 8)), py = Math.round(m + Math.sin(a) * (RA - 8));
    g.fillStyle = INK; g.fillRect(px - 2, py - 2, 5, 5);
    g.fillStyle = '#ffd23f'; g.fillRect(px - 1, py - 1, 3, 3);
    g.fillStyle = '#fff3a8'; g.fillRect(px - 1, py - 1, 1, 1);
    g.fillStyle = '#b37c00'; g.fillRect(px + 1, py + 1, 1, 1);
  }
  w.face = enlarge(c, P);
  w.labels = pieceLabels(w);
  w.winMask = null;
  return w.face;
}

// Pixel text: the pixel font at 8 or 16 art pixels, cream with a darker bottom, a drop shadow and the ink outline.
function pixelText(text, size, color = '#fff6e0') {
  const c = canvas(text.length * size + 6, size + 6);
  const g = c.getContext('2d');
  g.font = `${size}px "Press Start 2P"`;
  g.textBaseline = 'top';
  g.fillStyle = '#fff';
  g.fillText(text, 2, 2);
  const src = g.getImageData(0, 0, c.width, c.height).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < c.width && y < c.height && src[(y * c.width + x) * 4 + 3] > 110;
  const out = canvas(c.width, c.height);
  const o = out.getContext('2d');
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (on(x, y)) { o.fillStyle = y - 2 < size * 0.55 ? color : tint(color, -0.18); o.fillRect(x, y, 1, 1); }
    else if (on(x - 1, y - 1)) { o.fillStyle = INK; o.fillRect(x, y, 1, 1); } // shadow down-right
    else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { o.fillStyle = INK; o.fillRect(x, y, 1, 1); }
  }
  return enlarge(out, P);
}

// Where each slice's words and icon go: across the slice near the rim when they fit (a long single line is split
// in two), else along the slice. The icon sits in the middle of the slice when there is room for it.
function pieceLabels(w) {
  return w.pieces.map((p) => {
    let lines = p.o.short.split('\n');
    const mid = p.start + p.size / 2;
    const across = (rArt) => 2 * rArt * Math.sin(Math.min(p.size, 3) / 2) * 0.98; // room across the slice
    const rows = (n) => (n > 1 ? [0.9, 0.79] : [0.86]);
    const fitsAt = (ls, size) => ls.every((l, k) => l.length * size <= across(RA * rows(ls.length)[k]));
    const out = { mid, items: [], icon: null };
    let size = lines.length === 1 && fitsAt(lines, 16) ? 16 : 8;
    if (!fitsAt(lines, size) && lines.length === 1 && lines[0].includes(' ')) lines = lines[0].split(' ');
    if (fitsAt(lines, size)) {
      lines.forEach((l, k) => out.items.push({ img: pixelText(l, size), r: RAD * rows(lines.length)[k], along: false }));
    } else { // a narrow slice: the words run along the slice, from the middle out
      let text = lines.join(' ');
      if (text.length * 8 > RA * 0.55) text = lines[0];
      out.items.push({ img: pixelText(text, 8), r: RAD * 0.66, along: true });
    }
    if (2 * RA * 0.56 * Math.sin(p.size / 2) >= 36) out.icon = WHEEL_ICONS.includes(p.o.icon) ? wheelIcon(p.o.icon, P) : iconCanvas(p.o.icon, 6);
    return out;
  });
}

// The winning slice's light-up outline (art pixels, made once at the reveal).
function winMask(w, piece) {
  if (w.winMask && w.winMask.piece === piece) return w.winMask.img;
  const D = RA * 2 + 2;
  const c = canvas(D, D);
  const g = c.getContext('2d');
  const m = D / 2;
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - m, dy = y + 0.5 - m, r = Math.hypot(dx, dy);
    if (r >= RA - 5 || r < HUB) continue;
    let a = Math.atan2(dy, dx);
    if (a < 0) a += TAU;
    if (a < piece.start || a >= piece.start + piece.size) continue;
    const e = Math.min(a - piece.start, piece.start + piece.size - a) * r;
    if (e < 4 || r > RA - 9 || r < HUB + 3) { g.fillStyle = e < 2.5 || r > RA - 7 || r < HUB + 2 ? '#fff6c8' : '#ffd23f'; g.fillRect(x, y, 1, 1); }
  }
  w.winMask = { piece, img: enlarge(c, P) };
  return w.winMask.img;
}

// ---------- the parts that do not turn: rim, bulbs, hub, pointer (art pixels, lit from the top-left) ----------
const cache = {};
function rimArt() {
  if (cache.rim) return cache.rim;
  const R2 = RA + RIM;
  const D = R2 * 2 + 2;
  const c = canvas(D, D);
  const g = c.getContext('2d');
  const m = D / 2;
  const WOOD = ['#e8b46a', '#c48a48', '#9a6430', '#74461e', '#4e2c12'];
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - m, dy = y + 0.5 - m, r = Math.hypot(dx, dy);
    if (r < RA - 1 || r >= R2) continue;
    let col;
    if (r > R2 - 1) col = INK;
    else if (r < RA + 0.5) col = '#2a1608';
    else {
      const lit = -(dx + dy) / (r * Math.SQRT2); // 1 = top-left, -1 = bottom-right
      const ridge = 1 - Math.abs((r - RA) / RIM - 0.45) * 2; // a rounded ring: lighter on its top
      let k = Math.round(2 - lit * 1.4 - ridge * 0.9);
      if ((x + y) % 2 && Math.abs(lit * 1.4 + ridge * 0.9 - Math.round(lit * 1.4 + ridge * 0.9)) > 0.42) k += 1; // dither between bands
      col = WOOD[Math.max(0, Math.min(4, k))];
      if ((Math.floor(Math.atan2(dy, dx) * 40) + Math.floor(r)) % 9 === 0 && k > 0) col = WOOD[Math.min(4, k + 1)]; // wood grain
    }
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  cache.rim = { img: enlarge(c, P), half: m * P };
  return cache.rim;
}

function bulbArt(on) {
  const key = on ? 'bulbOn' : 'bulbOff';
  if (cache[key]) return cache[key];
  const c = canvas(7, 7);
  const g = c.getContext('2d');
  g.fillStyle = INK; g.fillRect(1, 0, 5, 7); g.fillRect(0, 1, 7, 5);
  g.fillStyle = on ? '#ffd23f' : '#8a5a20'; g.fillRect(1, 1, 5, 5);
  g.fillStyle = on ? '#fff6c8' : '#c08a2a'; g.fillRect(1, 1, 4, 4);
  g.fillStyle = on ? '#ffffff' : '#e0b060'; g.fillRect(2, 2, 1, 1);
  cache[key] = enlarge(c, P);
  return cache[key];
}

function hubArt() {
  if (cache.hub) return cache.hub;
  const D = HUB * 2 + 2;
  const c = canvas(D, D);
  const g = c.getContext('2d');
  const m = D / 2;
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - m, dy = y + 0.5 - m, r = Math.hypot(dx, dy);
    if (r >= HUB) continue;
    const lit = -(dx + dy) / (HUB * 1.4);
    let col = r > HUB - 1 ? INK : r > HUB - 3 ? (lit > 0 ? '#ffd23f' : '#8a5a00') : lit > 0.45 ? '#fff3a8' : lit > 0 ? '#ffd23f' : lit > -0.45 ? '#e0a21c' : '#b37c00';
    if (r > HUB - 4 && r <= HUB - 3) col = '#6a4000';
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#ffffff'; g.fillRect(m - 12, m - 13, 2, 2);
  const out = enlarge(c, P);
  const t = pixelText('SPIN', 8);
  out.getContext('2d').drawImage(t, Math.round((out.width - t.width) / 2), Math.round((out.height - t.height) / 2) + P);
  cache.hub = out;
  return out;
}

function pointerArt() {
  if (cache.pointer) return cache.pointer;
  const PW = 19, PH = 24;
  const c = canvas(PW + 2, PH + 2);
  const g = c.getContext('2d');
  const inside = (x, y) => { // a brass shield shape pointing down
    if (y < 1 || y > PH) return false;
    if (y < 9) return x >= 1 && x <= PW;
    const half = (PW / 2) * (1 - (y - 9) / (PH - 8));
    return Math.abs(x - (PW + 1) / 2) <= half;
  };
  for (let y = 0; y < PH + 2; y++) for (let x = 0; x < PW + 2; x++) {
    if (inside(x, y)) {
      const lit = (PW / 2 - x) / PW + (9 - y) / PH;
      g.fillStyle = !inside(x - 1, y) || !inside(x, y - 1) ? '#fff3a8' : !inside(x + 1, y) || !inside(x, y + 1) ? '#8a5a00' : lit > 0.3 ? '#ffd23f' : lit > -0.15 ? '#e0a21c' : '#b37c00';
      g.fillRect(x, y, 1, 1);
    } else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) { g.fillStyle = INK; g.fillRect(x, y, 1, 1); }
  }
  const jx = Math.round((PW + 1) / 2) - 2; // the red jewel
  g.fillStyle = INK; g.fillRect(jx - 1, 3, 6, 6);
  g.fillStyle = '#d61f35'; g.fillRect(jx, 4, 4, 4);
  g.fillStyle = '#ff6b7a'; g.fillRect(jx, 4, 2, 2);
  g.fillStyle = '#ffffff'; g.fillRect(jx, 4, 1, 1);
  cache.pointer = enlarge(c, P);
  return cache.pointer;
}

export function drawWheel(ctx, w, pegs) {
  w.pegCount = pegs;
  const win = w.phase === 'reveal' && w.result ? w.piece : null;
  ctx.save();
  ctx.imageSmoothingEnabled = false; // square pixels, also while it turns (A1)
  const rim = rimArt();
  ctx.drawImage(rim.img, CX - rim.half, CY - rim.half);
  // the face, its words and icons, all turning together
  ctx.translate(CX, CY);
  ctx.rotate(w.angle);
  const img = face(w);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  if (win && Math.floor(w.revealT * 4) % 2 === 0) { const wm = winMask(w, win); ctx.drawImage(wm, -wm.width / 2, -wm.height / 2); } // A4: 2 flashes a second
  w.labels.forEach((L) => {
    for (const it of L.items) {
      ctx.save();
      ctx.rotate(L.mid);
      ctx.translate(it.r, 0);
      if (!it.along) ctx.rotate(Math.PI / 2);
      ctx.drawImage(it.img, -it.img.width / 2, -it.img.height / 2);
      ctx.restore();
    }
    if (L.icon) {
      ctx.save();
      ctx.rotate(L.mid);
      ctx.translate(RAD * 0.56, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(L.icon, -L.icon.width / 2, -L.icon.height / 2);
      ctx.restore();
    }
  });
  ctx.restore();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // chasing bulbs set in the rim (A4: under 3 flashes a second)
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const on = (i + Math.floor(w.bulbs * (w.phase === 'spin' ? 5 : 2))) % 2 === 0;
    const b = bulbArt(on);
    const bx = Math.round((CX + Math.cos(a) * (RAD + (RIM * P) / 2)) / P) * P;
    const by = Math.round((CY + Math.sin(a) * (RAD + (RIM * P) / 2)) / P) * P;
    ctx.drawImage(b, bx - Math.floor(b.width / 2 / P) * P, by - Math.floor(b.height / 2 / P) * P);
  }
  const hub = hubArt();
  ctx.drawImage(hub, CX - hub.width / 2, CY - hub.height / 2);
  // the pointer at the top: it ticks back as each peg passes
  const pt = pointerArt();
  ctx.translate(CX, CY - RAD - RIM * P + 6);
  ctx.rotate(-w.flap * 0.3);
  ctx.drawImage(pt, -pt.width / 2, -18);
  ctx.restore();
}
