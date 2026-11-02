// limerick.js: the town far behind the game: Limerick City at night as a dark silhouette, in 16-bit HD
// pixel art (ART.md A11). Georgian terraces (sash windows, fanlights, chimney pots), King John's Castle
// (round drum towers, the Limerick flag), St Mary's Cathedral (square tower with pinnacles), the tall
// Clayton hotel tower, the TUS buildings with the glowing logo, and tall planted pine trees covered in
// twinkling Christmas lights. The strip is drawn once at half size (1 art pixel = 2 screen pixels),
// turned into a silhouette (only warm lights keep their colour) and scrolled slowly. Only the tree lights
// are drawn every frame.

import { enlarge } from './pixelart.js';
import { CONFIG } from './config.js';

const T = CONFIG.scenery.town;

const K = 2; // screen pixels per art pixel
const SH = 300; // strip height in art pixels
const LIGHT_COLORS = ['#fff3c0', '#ff5b6c', '#ffd23f', '#5ab8ff', '#7dffa8'];

let seed = 7;
let flags = []; // flagpole tops (art pixels), filled while the castle is drawn
const FLAG = ['GGGGWWWWW', 'GGGGWWWWW', 'GGGGWWWWW', 'GGGGWWWWW', 'GGGGWWWWW']; // the Limerick flag people fly: green and white
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function r(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
const lerp = (a, b, k) => { const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16); return `#${[16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k).toString(16).padStart(2, '0')).join('')}`; };

// Snow on a flat top.
function snowCap(g, x, y, w) {
  r(g, x - 1, y - 2, w + 2, 2, '#e8eeff');
  r(g, x, y - 3, w, 1, '#ffffff');
  for (let i = 3; i < w - 2; i += 7) r(g, x + i, y, 2, 1, '#c9d2f0'); // little drips
}

// A Georgian house: 4 floors of tall white-framed sash windows, a coloured door with a fanlight.
function georgian(g, x, w, h) {
  const y = SH - h;
  const brick = ['#5a2430', '#4a1c28', '#3a1420'];
  r(g, x, y, w, h, brick[1]);
  for (let yy = y + 2; yy < SH; yy += 3) { // brick courses
    for (let xx = x + ((yy / 3) % 2 ? 0 : 2); xx < x + w; xx += 5) r(g, xx, yy, 3, 1, rnd() < 0.5 ? brick[0] : brick[2]);
  }
  r(g, x, y, w, 3, '#6e3440'); // parapet
  r(g, x + 4, y - 9, 8, 9, brick[2]); r(g, x + 5, y - 11, 2, 2, '#8a4a3a'); r(g, x + 9, y - 11, 2, 2, '#8a4a3a'); // chimney pots
  snowCap(g, x + 4, y - 9, 8);
  snowCap(g, x, y, w);
  const floors = Math.floor((h - 26) / 22);
  const cols = Math.max(2, Math.floor((w - 6) / 13));
  const gap = (w - cols * 7) / (cols + 1);
  for (let f = 0; f < floors; f++) {
    const wy = y + 8 + f * 22;
    const wh = f === 1 ? 14 : 11; // the first floor (piano nobile) has the tallest windows
    for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (7 + gap);
      const lit = rnd() < 0.42;
      r(g, wx - 1, wy - 1, 9, wh + 2, '#e8e0d0'); // white frame
      r(g, wx, wy, 7, wh, lit ? '#ffcf6a' : '#1c2450');
      if (lit) r(g, wx, wy, 3, wh, '#ffe9a8');
      r(g, wx, wy + Math.floor(wh / 2), 7, 1, '#e8e0d0'); // sash bar
      r(g, wx + 3, wy, 1, wh, '#e8e0d0');
      r(g, wx - 2, wy + wh + 1, 11, 1, '#b8a890'); // sill
    }
  }
  // the door: a Georgian colour, white fanlight on top, two steps
  const door = ['#d61f35', '#1f9e55', '#2a6fdb', '#ffd23f', '#8e3bd6'][Math.floor(rnd() * 5)];
  const dx = x + Math.floor(w / 2) - 5;
  r(g, dx - 2, SH - 26, 14, 26, '#e8e0d0');
  r(g, dx, SH - 22, 10, 22, door);
  r(g, dx, SH - 22, 10, 1, '#ffffff');
  r(g, dx + 4, SH - 13, 2, 2, '#ffd23f');
  r(g, dx + 1, SH - 25, 8, 3, '#ffcf6a'); // fanlight (lit)
}

// King John's Castle: round drum towers with battlements, a curtain wall and the gate, floodlit from below.
const STONE = ['#545a8a', '#3e4474', '#2c3060', '#1e2248']; // light (left) to dark (right)
const WARM = ['#8a7a7a', '#6e6070', '#524a64', '#3a3456']; // the same stones in the warm floodlight
function stoneAt(xx, yy, shade) {
  const lit = yy > SH - 34 ? 1 : yy > SH - 60 && (xx + yy) % 2 ? 1 : 0; // the floodlight fades out going up (checker dither)
  return (lit ? WARM : STONE)[shade];
}
function wall(g, x, y, w, h, shadeOf) {
  for (let i = 0; i < w; i++) for (let yy = y; yy < y + h; yy++) r(g, x + i, yy, 1, 1, stoneAt(x + i, yy, shadeOf(i / w)));
  for (let yy = y + 4; yy < y + h; yy += 6) { // stone courses
    for (let i = (yy % 12 ? 0 : 5); i < w - 2; i += 10) r(g, x + i, yy, 7, 1, 'rgba(10,10,30,0.28)');
  }
}
function castle(g, x) {
  const flat = (k) => (k < 0.15 ? 1 : k > 0.85 ? 2 : 1);
  const round = (k) => (k < 0.25 ? 0 : k < 0.6 ? 1 : k < 0.85 ? 2 : 3); // a cylinder: light left, dark right
  const merlons = (mx, my, mw, sh) => { for (let i = 0; i < mw; i += 6) r(g, mx + i, my - 5, 4, 5, STONE[sh]); snowCap(g, mx, my - 5, mw); };
  wall(g, x + 30, SH - 110, 150, 110, flat); merlons(x + 30, SH - 110, 150, 1); // curtain wall
  wall(g, x + 82, SH - 150, 44, 150, flat); merlons(x + 82, SH - 150, 44, 1); // gate tower
  r(g, x + 94, SH - 40, 20, 40, '#0c0e24'); r(g, x + 96, SH - 44, 16, 4, '#0c0e24'); r(g, x + 99, SH - 46, 10, 2, '#0c0e24'); // arch
  r(g, x + 96, SH - 38, 16, 38, '#2a1608');
  for (let i = 0; i < 16; i += 4) r(g, x + 96 + i, SH - 38, 1, 38, '#4a2a12');
  r(g, x + 100, SH - 120, 3, 8, '#ffcf6a'); r(g, x + 106, SH - 120, 3, 8, '#ffcf6a'); // lit windows
  for (const [tx, tw, th] of [[x, 40, 160], [x + 168, 44, 145]]) { // the round drum towers
    wall(g, tx, SH - th, tw, th, round);
    merlons(tx, SH - th, tw, 1);
    for (let k2 = 0; k2 < 3; k2++) r(g, tx + tw / 2 - 1, SH - th + 22 + k2 * 32, 2, 7, '#0c0e24'); // arrow slits
  }
  r(g, x + 19, SH - 192, 2, 27, '#c9d2f0'); // the flagpole (the flag itself is added after the silhouette)
  flags.push([x + 21, SH - 192]);
}

// St Mary's Cathedral: the nave with pointed windows and the square tower with four corner pinnacles.
function cathedral(g, x) {
  const st = ['#3c4070', '#2e3260', '#22264c'];
  r(g, x, SH - 90, 90, 90, st[1]);
  for (let i = 0; i < 90; i += 6) r(g, x + i, SH - 94, 3, 4, st[1]);
  snowCap(g, x, SH - 94, 90);
  for (let i = 0; i < 4; i++) { // pointed (gothic) windows, softly lit
    const wx = x + 10 + i * 20;
    r(g, wx, SH - 70, 8, 30, '#ffcf6a');
    r(g, wx + 1, SH - 73, 6, 3, '#ffcf6a'); r(g, wx + 3, SH - 75, 2, 2, '#ffcf6a');
    r(g, wx + 3, SH - 70, 2, 30, '#c98a2a');
    r(g, wx, SH - 56, 8, 1, '#c98a2a');
  }
  const tx = x + 90;
  r(g, tx, SH - 210, 52, 210, st[1]);
  r(g, tx, SH - 210, 10, 210, st[0]); // light side
  r(g, tx + 44, SH - 210, 8, 210, st[2]);
  for (const px of [tx - 2, tx + 46]) { // corner pinnacles
    r(g, px, SH - 232, 8, 22, st[0]);
    r(g, px + 2, SH - 238, 4, 6, st[0]);
    r(g, px + 3, SH - 242, 2, 4, st[0]);
  }
  for (let i = 8; i < 44; i += 7) r(g, tx + i, SH - 216, 4, 6, st[1]); // battlements
  snowCap(g, tx, SH - 216, 52);
  for (const by of [SH - 185, SH - 140]) { // belfry openings with louvres
    for (const bx of [tx + 12, tx + 30]) {
      r(g, bx, by, 9, 22, '#0c0e24');
      r(g, bx + 2, by - 2, 5, 2, '#0c0e24');
      for (let l = 3; l < 22; l += 4) r(g, bx + 1, by + l, 7, 1, '#3c4070');
    }
  }
  r(g, tx + 18, SH - 100, 16, 16, '#e8e0d0'); // the clock
  r(g, tx + 20, SH - 98, 12, 12, '#fff6e0');
  r(g, tx + 25, SH - 96, 2, 5, '#1a0a14'); r(g, tx + 26, SH - 92, 4, 1, '#1a0a14');
}

// The tall Clayton hotel tower on Steamboat Quay: glass floors, many lit, a red light on top.
function clayton(g, x) {
  const w = 54;
  const h = 270;
  r(g, x, SH - h, w, h, '#1a2a50');
  r(g, x, SH - h, 8, h, '#28407a');
  r(g, x + w - 6, SH - h, 6, h, '#101a38');
  for (let yy = SH - h + 12; yy < SH - 8; yy += 9) {
    r(g, x + 2, yy + 7, w - 4, 1, '#0c1430'); // floor lines
    for (let xx = x + 4; xx < x + w - 6; xx += 6) {
      const lit = rnd() < 0.38;
      r(g, xx, yy, 4, 6, lit ? (rnd() < 0.7 ? '#ffd88a' : '#bfe8ff') : '#22346a');
    }
  }
  r(g, x - 2, SH - h - 6, w + 4, 6, '#3a4a80'); // the crown on top
  snowCap(g, x - 2, SH - h - 6, w + 4);
  r(g, x + w / 2 - 1, SH - h - 18, 2, 12, '#c9d2f0');
  r(g, x + w / 2 - 2, SH - h - 20, 4, 3, '#ff3b4f');
}

// A TUS building: modern, dark, with the TUS logo glowing on the front.
function tus(g, x, w, h, logo) {
  r(g, x, SH - h, w, h, '#191146');
  r(g, x, SH - h, 6, h, '#241a5c');
  for (let yy = SH - h + 120; yy < SH - 10; yy += 17) { // window bands below the logo
    for (let xx = x + 8; xx < x + w - 10; xx += 12) r(g, xx, yy, 8, 9, rnd() < 0.45 ? '#ffcf6a' : '#20186a');
  }
  snowCap(g, x, SH - h, w);
  r(g, x + (w - 78) / 2, SH - h + 10, 78, 100, '#0c0830');
  r(g, x + (w - 78) / 2 + 2, SH - h + 12, 74, 96, '#120c40');
  g.imageSmoothingEnabled = true;
  g.drawImage(logo, Math.round(x + (w - logo.width) / 2), SH - h + 18);
}

// A tall planted pine tree, drawn branch by branch: many drooping branches out of the trunk, ragged
// needle clusters, short at the top and long at the bottom, a gold star on top. Returns where its lights
// hang (on the branches, art pixels); drawLimerick makes them twinkle.
function tree(g, x, h) {
  const w = Math.round(h * 0.5);
  const cx = Math.round(x + w / 2);
  const top = SH - h;
  const lights = [];
  r(g, cx - 2, top + 6, 3, h - 6, '#2a1a10'); // trunk
  const rows = [];
  for (let y = top + 5; y < SH - 16;) { // branches grow in whorls (groups), with small gaps between them
    const k = (y - top) / h;
    const n = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) rows.push(y + j * 2);
    y += n * 2 + 2 + Math.floor(k * 5 + rnd() * 3);
  }
  for (const y of rows) {
    const k = (y - top) / h; // 0 at the top, 1 at the bottom
    for (const dir of [-1, 1]) {
      const len = Math.max(2, (w / 2) * Math.pow(k, 0.85) * (0.55 + rnd() * 0.55));
      const droop = len * (0.18 + rnd() * 0.12);
      for (let i = 0; i <= len; i++) {
        const t = i / len;
        const bx = cx + dir * i;
        const by = y + droop * t * t - (t > 0.85 ? (t - 0.85) * 8 : 0); // out, down, a little up at the tip
        const up = 1 + Math.floor(rnd() * 2 + (1 - t) * 1.5);
        const down = 1 + Math.floor(rnd() * 2.5);
        for (let n = -up; n <= down; n++) r(g, bx, by + n, 1, 1, n < 0 && dir < 0 ? '#2e6a4a' : n < 0 ? '#22543c' : '#163c2c');
        if (rnd() < 0.18) r(g, bx + dir, by + down, 1, 1, '#163c2c'); // stray needles
        if (n0(t) && rnd() < 0.25) r(g, bx, by - up, 1, 1, '#9aa8d0'); // a little snow on top of the branch
        if (rnd() < T.lightChance) lights.push({ x: bx, y: by, c: LIGHT_COLORS[Math.floor(rnd() * LIGHT_COLORS.length)], p: rnd() * 6.28, f: 0.5 + rnd() * 1.5 });
      }
    }
  }
  // the gold star on top
  r(g, cx - 1, top - 4, 2, 10, '#ffd23f'); r(g, cx - 4, top, 8, 2, '#ffd23f');
  r(g, cx - 2, top - 2, 4, 6, '#ffd23f'); r(g, cx - 1, top - 1, 2, 2, '#fff6c8');
  return { w, lights };
}
const n0 = (t) => t > 0.3;

// Far away: every building and tree becomes a dark night shadow (a little detail stays), while the
// warm lights (windows, fanlights, the TUS logos, the star) keep glowing, a little dimmer.
function silhouette(c) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const [R, G, B] = [d[i], d[i + 1], d[i + 2]];
    const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
    let out;
    if (R > 150 && G > 100 && R > B + 50) out = [R * 0.62 + 30, G * 0.55 + 20, B * 0.4 + 20]; // a warm light
    else if (lum > 0.62) out = [44, 48, 96]; // snow, far away: only a faint line
    else out = [14 + lum * 22, 12 + lum * 20, 44 + lum * 34]; // everything else (stone, brick, trees): one night shadow
    const q = (v) => Math.min(255, Math.round(v / 6) * 6);
    d[i] = q(out[0]); d[i + 1] = q(out[1]); d[i + 2] = q(out[2]);
  }
  g.putImageData(img, 0, 0);
}

// Builds the whole strip once. Returns { img, width (screen px), lights (screen px) }.
export function buildLimerick(logoFn) {
  seed = 7;
  flags = [];
  // a little gap between buildings; a few trees stand in the gaps and overlap their neighbours a little
  const plan = [['geo', 3], ['tree', 150], ['castle'], ['tus', 98, 220], ['geo', 4], ['tree', 165],
    ['cathedral'], ['clayton'], ['geo', 3], ['tree', 155], ['tus', 80, 170]];
  const GAP = 5; // a little space between buildings (art pixels)
  const widths = { castle: 214, cathedral: 144, clayton: 58 };
  const treeStep = (h) => Math.round(h * 0.5 * 0.42); // how much room a tree takes in the row
  let SW = 2;
  for (const p of plan) SW += (p[0] === 'geo' ? p[1] * 46 : p[0] === 'tree' ? treeStep(p[1]) : p[0] === 'tus' ? p[1] : widths[p[0]]) + GAP;
  const c = document.createElement('canvas');
  c.width = SW;
  c.height = SH + 2;
  const g = c.getContext('2d');
  g.translate(0, 2);
  let x = 2;
  const lights = [];
  const trees = [];
  for (const p of plan) {
    if (p[0] === 'geo') { for (let i = 0; i < p[1]; i++) georgian(g, x + i * 46, 46, 120 + Math.floor(rnd() * 3) * 10); x += p[1] * 46; }
    else if (p[0] === 'tree') { trees.push([x + treeStep(p[1]) / 2, p[1]]); x += treeStep(p[1]); }
    else if (p[0] === 'castle') { castle(g, x); x += widths.castle; }
    else if (p[0] === 'cathedral') { cathedral(g, x); x += widths.cathedral; }
    else if (p[0] === 'clayton') { clayton(g, x); x += widths.clayton; }
    else if (p[0] === 'tus') { tus(g, x, p[1], p[2], logoFn(Math.round(p[1] * 0.62))); x += p[1]; }
    x += GAP;
  }
  for (const [mid, h] of trees) { // trees last: in front of the buildings next to them
    const t = tree(g, Math.round(mid - h * 0.25), h);
    for (const l of t.lights) lights.push({ ...l, y: l.y + 2 });
  }
  // far away: shrink it (soft, so small detail melts away), then make it a night shadow
  const S = T.size;
  const far = document.createElement('canvas');
  far.width = Math.round(c.width * S);
  far.height = Math.round(c.height * S);
  const fg = far.getContext('2d');
  fg.imageSmoothingEnabled = true;
  fg.imageSmoothingQuality = 'high';
  fg.drawImage(c, 0, 0, far.width, far.height);
  silhouette(far);
  for (const [fx, fy] of flags) { // the flag keeps its green and white, so it can be seen
    FLAG.forEach((row, yy) => [...row].forEach((ch, xx) => { fg.fillStyle = ch === 'G' ? '#2a8a4a' : '#d8d4e0'; fg.fillRect(Math.round(fx * S) + xx, Math.round((fy + 2) * S) + yy, 1, 1); }));
  }
  return { img: enlarge(far, K), width: far.width * K, height: far.height * K, lights: lights.map((l) => ({ ...l, x: l.x * S * K, y: l.y * S * K })) };
}

// Draws the strip with its bottom on `baseY`, scrolled by `off` screen pixels, and the twinkling lights.
export function drawLimerick(ctx, town, off, baseY, t, screenW) {
  const shift = ((off % town.width) + town.width) % town.width;
  const y0 = baseY - town.height;
  ctx.imageSmoothingEnabled = false;
  for (const rep of [0, town.width]) {
    const x = Math.round(rep - shift);
    if (x > screenW || x + town.width < 0) continue;
    ctx.globalAlpha = T.fade; // the sky shows through: far away
    ctx.drawImage(town.img, x, y0);
    ctx.globalAlpha = 1;
    for (const l of town.lights) {
      const lx = Math.round(x + l.x);
      if (lx < -8 || lx > screenW + 8) continue;
      const k = Math.max(0, Math.sin(t * l.f + l.p)); // each light slowly fades in and out at its own pace
      ctx.globalAlpha = 0.12 * k * T.lightAlpha;
      ctx.fillStyle = l.c;
      ctx.fillRect(lx - 2, y0 + l.y - 2, 6, 6); // soft glow
      ctx.globalAlpha = (0.15 + 0.85 * k) * T.lightAlpha;
      ctx.fillRect(lx, y0 + l.y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}
