// santa.js: the detailed pixel-art Santa, his sleigh and his TUS bag (tied on with ropes).
// The model is designed with shapes in a 260 x 216 unit box (Santa faces right), then turned into
// pixel art (see "pixel art" below). Each size and face is made ONCE and cached, so nothing flickers.
// scale 4 (in the game) = 1 screen pixel per art pixel; the title screen shows it 3x bigger.

import { pixelate, stampText, enlarge, texture } from './pixelart.js';
import { stampSideFace } from './santaface.js';
import { INK, PAD, lin, shape, maskCtx, canvasFor } from './drawkit.js';
import { head, drawHat } from './santahead.js';

const UNITS = { w: 260, h: 216 };
const TOP = 16; // extra room above, because Santa is drawn a bit bigger than the sleigh
const cache = new Map();

// ---------- the sleigh ----------
function sleigh(g) {
  // runners (brass) with curled fronts, and the struts
  g.lineWidth = 9;
  g.strokeStyle = INK;
  const runner = (gg) => { gg.moveTo(22, 184); gg.lineTo(222, 184); gg.bezierCurveTo(250, 184, 258, 166, 246, 152); gg.bezierCurveTo(238, 144, 228, 152, 234, 160); };
  g.beginPath(); runner(g); g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = lin(g, 0, 178, 0, 190, [[0, '#fff1a8'], [0.5, '#e0a82e'], [1, '#8a5a12']]);
  g.beginPath(); runner(g); g.stroke();
  for (const x of [62, 128, 194]) {
    shape(g, (gg) => gg.rect(x - 4, 164, 8, 20), lin(g, x - 4, 0, x + 4, 0, [[0, '#8a5a12'], [0.5, '#f2c75a'], [1, '#8a5a12']]), 2);
  }
  // body: deep red lacquer, high back on the left, curled nose on the right
  const body = (gg) => {
    gg.moveTo(16, 104);
    gg.bezierCurveTo(14, 92, 30, 88, 34, 100);
    gg.lineTo(38, 122);
    gg.lineTo(196, 122);
    gg.bezierCurveTo(214, 122, 222, 108, 226, 96);
    gg.bezierCurveTo(232, 80, 252, 84, 250, 100);
    gg.bezierCurveTo(248, 128, 236, 166, 206, 168);
    gg.lineTo(44, 168);
    gg.bezierCurveTo(26, 168, 18, 140, 16, 104);
    gg.closePath();
  };
  shape(g, body, lin(g, 0, 90, 0, 170, [[0, '#ff4a5e'], [0.45, '#c8182e'], [1, '#6e0816']]), 4);
  // lacquer shine
  g.save();
  g.beginPath(); body(g); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.ellipse(120, 132, 80, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 158, 260, 12);
  g.restore();
  // gold trim along the top and the bottom, and scroll work on the side
  g.lineWidth = 4;
  g.strokeStyle = '#f2c75a';
  g.beginPath(); g.moveTo(38, 124); g.lineTo(196, 124); g.stroke();
  g.beginPath(); g.moveTo(46, 162); g.lineTo(204, 162); g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = '#ffd86b';
  for (const cx of [80, 150]) {
    g.beginPath();
    g.moveTo(cx - 28, 144);
    g.bezierCurveTo(cx - 20, 130, cx - 4, 132, cx - 6, 142);
    g.bezierCurveTo(cx - 8, 150, cx - 18, 146, cx - 14, 140);
    g.moveTo(cx + 28, 144);
    g.bezierCurveTo(cx + 20, 130, cx + 4, 132, cx + 6, 142);
    g.bezierCurveTo(cx + 8, 150, cx + 18, 146, cx + 14, 140);
    g.moveTo(cx - 6, 152); g.lineTo(cx + 6, 152);
    g.stroke();
  }
  // nose curl detail
  g.beginPath(); g.arc(238, 98, 7, 0, Math.PI * 2);
  g.fillStyle = '#f2c75a'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  // brass cleats on the rim: the bag ropes are tied here
  for (const cx of [26, 92]) shape(g, (gg) => gg.rect(cx - 6, 116, 12, 8), lin(g, 0, 116, 0, 124, [[0, '#fff1a8'], [1, '#a8741a']]), 2);
  // green velvet seat edge peeking out
  shape(g, (gg) => gg.rect(36, 114, 120, 10), lin(g, 0, 114, 0, 124, [[0, '#3dcc72'], [1, '#126b34']]), 2);
}

// ---------- Santa ----------
function santa(g, mouth = 0, hat = true, face = true) {
  // back arm (dark) holding the sleigh edge
  shape(g, (gg) => { gg.moveTo(112, 84); gg.bezierCurveTo(100, 100, 102, 112, 112, 118); gg.lineTo(124, 112); gg.closePath(); }, '#8e1224', 3, 'coat');
  // coat body
  const coat = (gg) => {
    gg.moveTo(104, 120);
    gg.bezierCurveTo(98, 92, 110, 66, 140, 62);
    gg.bezierCurveTo(170, 60, 184, 84, 182, 120);
    gg.closePath();
  };
  shape(g, coat, lin(g, 100, 60, 186, 120, [[0, '#ff5b6c'], [0.5, '#d61f35'], [1, '#7a0a1a']]), 4, 'coat');
  g.save(); g.beginPath(); coat(g); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.ellipse(176, 100, 16, 40, 0, 0, Math.PI * 2); g.fill(); // body shadow on the far side
  g.restore();
  // fur trim down the front + belt with gold buckle
  shape(g, (gg) => gg.rect(150, 70, 12, 50), lin(g, 150, 0, 162, 0, [[0, '#ffffff'], [1, '#e2d6c4']]), 2, 'fur');
  shape(g, (gg) => gg.rect(104, 104, 78, 10), '#1c1018', 2);
  shape(g, (gg) => gg.rect(146, 101, 18, 16), lin(g, 0, 101, 0, 117, [[0, '#fff1a8'], [1, '#c98a14']]), 2);
  g.fillStyle = '#1c1018';
  g.fillRect(151, 106, 8, 6);
  g.fillStyle = '#e2d6c4';
  for (const by of [78, 90]) { g.beginPath(); g.arc(156, by, 2.2, 0, Math.PI * 2); g.fill(); }
  // front arm reaching to the reins, white cuff, black glove
  shape(g, (gg) => { gg.moveTo(160, 74); gg.bezierCurveTo(186, 70, 200, 80, 206, 92); gg.lineTo(196, 100); gg.bezierCurveTo(188, 90, 176, 88, 164, 92); gg.closePath(); },
    lin(g, 160, 70, 206, 100, [[0, '#ff5b6c'], [1, '#a5122a']]), 3, 'coat');
  shape(g, (gg) => { gg.ellipse(202, 95, 7, 10, -0.6, 0, Math.PI * 2); }, '#ffffff', 2, 'fur');
  shape(g, (gg) => { gg.ellipse(212, 99, 7, 6.5, 0, 0, Math.PI * 2); }, lin(g, 206, 92, 220, 106, [[0, '#8a5a3a'], [1, '#3a2014']]), 2);
  // reins to the front of the sleigh
  g.strokeStyle = '#6b3a14';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(220, 100); g.quadraticCurveTo(240, 104, 258, 90); g.stroke();
  head(g, mouth, hat, face);
}

// ---------- the TUS bag ----------
// loose = true: off the sleigh (crash), so the rope ends are short.
function bag(g, loose = false) {
  // presents peeking out of the top
  shape(g, (gg) => gg.rect(22, 6, 26, 24), lin(g, 22, 0, 48, 0, [[0, '#3dcc72'], [1, '#126b34']]), 2);
  g.fillStyle = '#ffd23f'; g.fillRect(32, 6, 6, 24);
  shape(g, (gg) => gg.rect(46, 0, 22, 28), lin(g, 46, 0, 68, 0, [[0, '#4f8cff'], [1, '#1f4fb0']]), 2);
  g.fillStyle = '#f4f7ff'; g.fillRect(46, 12, 22, 5);
  // the sack
  const sack = (gg) => {
    gg.moveTo(30, 30);
    gg.bezierCurveTo(4, 44, 0, 84, 12, 100);
    gg.bezierCurveTo(26, 118, 72, 118, 86, 100);
    gg.bezierCurveTo(98, 84, 92, 44, 66, 30);
    gg.closePath();
  };
  shape(g, sack, lin(g, 0, 30, 96, 110, [[0, '#c48a4e'], [0.5, '#9a6232'], [1, '#5c3416']]), 4);
  // burlap weave
  g.save(); g.beginPath(); sack(g); g.clip();
  g.strokeStyle = 'rgba(60,30,10,0.28)';
  g.lineWidth = 1;
  for (let y = 30; y < 120; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(100, y + 2); g.stroke(); }
  for (let x = 0; x < 100; x += 5) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x - 2, 120); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(78, 80, 16, 34, 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,230,190,0.18)';
  g.beginPath(); g.ellipse(26, 66, 10, 22, -0.2, 0, Math.PI * 2); g.fill();
  g.restore();
  // gold rope tie
  g.lineWidth = 6; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(26, 34); g.quadraticCurveTo(48, 42, 70, 34); g.stroke();
  g.lineWidth = 4; g.strokeStyle = '#f2c75a';
  g.beginPath(); g.moveTo(26, 34); g.quadraticCurveTo(48, 42, 70, 34); g.stroke();
  g.beginPath(); g.moveTo(66, 36); g.quadraticCurveTo(74, 46, 70, 54); g.stroke();
  // two ropes over the bag, tied down inside the sleigh (their ends go behind the sleigh side)
  for (const [x0, x1] of [[28, 84], [68, 58]]) {
    g.lineWidth = 6; g.strokeStyle = INK;
    const y1 = loose ? 104 : 126;
    g.beginPath(); g.moveTo(x0, 36); g.quadraticCurveTo((x0 + x1) / 2 + (x1 > x0 ? 14 : -14), 80, x1, y1); g.stroke();
    g.lineWidth = 3.5; g.strokeStyle = '#d9b26a';
    g.beginPath(); g.moveTo(x0, 36); g.quadraticCurveTo((x0 + x1) / 2 + (x1 > x0 ? 14 : -14), 80, x1, y1); g.stroke();
  }
  // TUS patch, stitched on, in the same red and gold as the sleigh
  shape(g, (gg) => { gg.rect(16, 58, 64, 34); }, lin(g, 0, 58, 0, 92, [[0, '#fff3dc'], [1, '#e6cfa2']]), 3);
  g.setLineDash([3, 3]);
  g.strokeStyle = '#c8182e';
  g.lineWidth = 1.5;
  g.strokeRect(20, 62, 56, 26);
  g.setLineDash([]);
}

const BAG_UNITS = { w: 96, h: 130 };
const BAG_POINT = { x: 88, y: 112 }; // this point of the bag (bottom right of the sack) ...
const BAG_ANCHOR = { x: 98, y: 132 + TOP }; // ... sits here, just behind the sleigh side

// ---------- pixel art ----------
// The model is drawn small (1 art pixel = 2.5 model units), then snapped to hard pixels with a
// limited set of colours and a 1-pixel dark outline, then enlarged with square pixels.
const ART_K = 0.24; // art pixels per model unit (chunky arcade pixels)
const factor = (scale) => Math.max(1, Math.round(scale / 2)); // game (4) = 2x2 screen pixels, title (10) = 5

// Where the side face sprite goes, in art pixels (top-left, just under the hat).
const FACE_AT = { x: 28, y: 9 };

// empty = the sleigh without Santa (he got out after a crash).
function santaCanvas(scale, mouth, hat = true, empty = false) {
  const key = `santa|${scale}|${mouth}|${hat}|${empty}`;
  if (!cache.has(key)) {
    const paint = (g) => {
      g.translate(0, TOP);
      g.save();
      g.translate(150, 122); // Santa is 20% bigger than the sleigh, so he reads well at game size
      g.scale(1.2, 1.2);
      g.translate(-150, -122);
      if (!empty) santa(g, mouth, hat, false); // the face always comes from the pixel sprite
      g.restore();
      sleigh(g);
    };
    const art = pixelate(canvasFor(ART_K * 10, UNITS.w, UNITS.h, paint));
    const mask = canvasFor(ART_K * 10, UNITS.w, UNITS.h, (g) => paint(maskCtx(g)));
    texture(art, mask); // knitted hat, velvet coat, fluffy fur, hair strands
    // the face: a clean hand-made pixel sprite (santaface.js); the model face is too small to convert well
    if (!empty) stampSideFace(art, FACE_AT.x, FACE_AT.y, mouth, !hat);
    cache.set(key, enlarge(art, factor(scale)));
  }
  return cache.get(key);
}

// The bag is drawn again for each size step, so its pixels stay the same size as Santa's.
function bagCanvas(scale, size, loose = false) {
  const key = `bag|${scale}|${size}|${loose}`;
  if (!cache.has(key)) {
    const k = ART_K * size;
    const art = pixelate(canvasFor(k * 10, BAG_UNITS.w, BAG_UNITS.h, (g) => bag(g, loose)));
    stampText(art, 'TUS', (PAD + 48) * k, (PAD + 75) * k, Math.max(1, Math.floor(size * 1.6)), '#c8182e', '#6e0816');
    cache.set(key, enlarge(art, factor(scale)));
  }
  return cache.get(key);
}

// Draws Santa centred on (x, y), turned by `angle`. scale 4 = game size. bagSize = bag size (1 = normal).
// mouth: 0 = closed, 1 = laughing wide open, 2 = laughing half open (flight hands this in).
// opts.hat / opts.bag = false leave them out (in a crash they fly off on their own). opts.empty = sleigh only.
export function drawSanta(ctx, x, y, angle = 0, scale = 4, bagSize = 1, mouth = 0, opts = {}) {
  const f = factor(scale);
  const px = ART_K * f; // screen pixels per model unit
  const size = Math.round(bagSize * 10) / 10;
  const body = santaCanvas(scale, mouth, opts.hat !== false, !!opts.empty);
  const sack = bagCanvas(scale, size);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = angle !== 0 && scale < 8; // big (title): always sharp pixels; small: smooth only while turning
  const ox = -Math.round((UNITS.w / 2 + PAD) * px);
  const oy = -Math.round((UNITS.h / 2 + PAD) * px);
  const ax = ox + (PAD + BAG_ANCHOR.x) * px;
  const ay = oy + (PAD + BAG_ANCHOR.y) * px;
  if (opts.bag !== false) ctx.drawImage(sack, Math.round(ax - (PAD + BAG_POINT.x) * px * size), Math.round(ay - (PAD + BAG_POINT.y) * px * size));
  ctx.drawImage(body, ox, oy);
  ctx.restore();
}

// The hat on its own, same size and pixels as on Santa (1.2x the head model).
function hatCanvas(scale) {
  const key = `hat|${scale}`;
  if (!cache.has(key)) {
    const paint = (g) => { g.scale(1.2, 1.2); g.translate(-84, 2); drawHat(g); };
    const art = pixelate(canvasFor(ART_K * 10, 120, 62, paint));
    texture(art, canvasFor(ART_K * 10, 120, 62, (g) => paint(maskCtx(g))));
    cache.set(key, enlarge(art, factor(scale)));
  }
  return cache.get(key);
}

// Where the hat and the bag sit on Santa, in screen pixels from his centre (for the crash).
export function partOffset(which, scale = 4, bagSize = 1) {
  const px = ART_K * factor(scale);
  if (which === 'hat') return { x: (138 - UNITS.w / 2) * px, y: (TOP + 1 - UNITS.h / 2) * px };
  return { x: (BAG_ANCHOR.x - 44 * bagSize - UNITS.w / 2) * px, y: (BAG_ANCHOR.y - 60 * bagSize - UNITS.h / 2) * px };
}

// Draws the hat or the bag alone, centred on (x, y), turned by `angle` (crash scene).
export function drawSantaPart(ctx, which, x, y, angle = 0, scale = 4, bagSize = 1) {
  const img = which === 'hat' ? hatCanvas(scale) : bagCanvas(scale, Math.round(bagSize * 10) / 10, true);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = angle !== 0;
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
  ctx.restore();
}
