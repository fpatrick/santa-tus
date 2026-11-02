// santa.js: the detailed pixel-art Santa, his sleigh and his TUS bag (tied on with ropes).
// The model is designed with shapes in a 260 x 216 unit box (Santa faces right), then turned into
// pixel art (see "pixel art" below). Each size and face is made ONCE and cached, so nothing flickers.
// scale 4 (in the game) = 1 screen pixel per art pixel; the title screen shows it 3x bigger.

import { pixelate, stampText, enlarge } from './pixelart.js';

const INK = '#1a0a14';
const UNITS = { w: 260, h: 216 };
const TOP = 16; // extra room above, because Santa is drawn a bit bigger than the sleigh
const PAD = 12; // room for the outline and the runner curls
const cache = new Map();

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

function shape(g, draw, fill, line = 3) {
  g.beginPath();
  draw(g);
  g.fillStyle = fill;
  g.fill();
  if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); }
}

function canvasFor(scale, wu, hu, paint) {
  const k = scale / 10;
  const c = document.createElement('canvas');
  c.width = Math.ceil((wu + PAD * 2) * k);
  c.height = Math.ceil((hu + PAD * 2) * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  g.translate(PAD, PAD);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  paint(g);
  return c;
}

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
function santa(g, mouth = 0) {
  // back arm (dark) holding the sleigh edge
  shape(g, (gg) => { gg.moveTo(112, 84); gg.bezierCurveTo(100, 100, 102, 112, 112, 118); gg.lineTo(124, 112); gg.closePath(); }, '#8e1224', 3);
  // coat body
  const coat = (gg) => {
    gg.moveTo(104, 120);
    gg.bezierCurveTo(98, 92, 110, 66, 140, 62);
    gg.bezierCurveTo(170, 60, 184, 84, 182, 120);
    gg.closePath();
  };
  shape(g, coat, lin(g, 100, 60, 186, 120, [[0, '#ff5b6c'], [0.5, '#d61f35'], [1, '#7a0a1a']]), 4);
  g.save(); g.beginPath(); coat(g); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.ellipse(176, 100, 16, 40, 0, 0, Math.PI * 2); g.fill(); // body shadow on the far side
  g.restore();
  // fur trim down the front + belt with gold buckle
  shape(g, (gg) => gg.rect(150, 70, 12, 50), lin(g, 150, 0, 162, 0, [[0, '#ffffff'], [1, '#e2d6c4']]), 2);
  shape(g, (gg) => gg.rect(104, 104, 78, 10), '#1c1018', 2);
  shape(g, (gg) => gg.rect(146, 101, 18, 16), lin(g, 0, 101, 0, 117, [[0, '#fff1a8'], [1, '#c98a14']]), 2);
  g.fillStyle = '#1c1018';
  g.fillRect(151, 106, 8, 6);
  g.fillStyle = '#e2d6c4';
  for (const by of [78, 90]) { g.beginPath(); g.arc(156, by, 2.2, 0, Math.PI * 2); g.fill(); }
  // front arm reaching to the reins, white cuff, black glove
  shape(g, (gg) => { gg.moveTo(160, 74); gg.bezierCurveTo(186, 70, 200, 80, 206, 92); gg.lineTo(196, 100); gg.bezierCurveTo(188, 90, 176, 88, 164, 92); gg.closePath(); },
    lin(g, 160, 70, 206, 100, [[0, '#ff5b6c'], [1, '#a5122a']]), 3);
  shape(g, (gg) => { gg.ellipse(202, 95, 7, 10, -0.6, 0, Math.PI * 2); }, '#ffffff', 2);
  shape(g, (gg) => { gg.ellipse(212, 99, 7, 6.5, 0, 0, Math.PI * 2); }, lin(g, 206, 92, 220, 106, [[0, '#8a5a3a'], [1, '#3a2014']]), 2);
  // reins to the front of the sleigh
  g.strokeStyle = '#6b3a14';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(220, 100); g.quadraticCurveTo(240, 104, 258, 90); g.stroke();
  head(g, mouth);
}

// Head, beard and hat. mouth: 0 = closed, 1 = laughing wide open, 2 = laughing half open.
// When he laughs his head tips back a little and his eyes close happily.
function head(g, mouth) {
  g.save();
  if (mouth) { g.translate(150, 70); g.rotate(mouth === 1 ? -0.14 : -0.07); g.translate(-150, -70); }
  // face
  shape(g, (gg) => gg.arc(150, 44, 20, 0, Math.PI * 2), lin(g, 132, 30, 170, 60, [[0, '#ffd9bd'], [1, '#e8a27c']]), 3);
  g.fillStyle = mouth ? 'rgba(255,70,90,0.8)' : 'rgba(255,90,110,0.55)';
  g.beginPath(); g.ellipse(160, 50, 7, 5, 0, 0, Math.PI * 2); g.fill();
  if (mouth) { // happy closed eye
    g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(155, 42); g.quadraticCurveTo(160, 35, 165, 42); g.stroke();
  } else {
    g.fillStyle = INK;
    g.beginPath(); g.ellipse(160, 40, 3, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(160, 38, 1.5, 1.5);
  }
  g.strokeStyle = '#f2ebe0'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(154, mouth ? 31 : 33); g.quadraticCurveTo(161, 28, 167, 33); g.stroke(); // eyebrow
  shape(g, (gg) => gg.arc(170, 46, 5.5, 0, Math.PI * 2), '#ff7f7f', 2); // nose
  // beard: big and curly, warm white with soft shading strands
  const beard = (gg) => {
    gg.moveTo(132, 48);
    gg.bezierCurveTo(128, 64, 132, 84, 146, 92);
    gg.bezierCurveTo(150, 98, 158, 98, 162, 92);
    gg.bezierCurveTo(176, 86, 180, 66, 174, 52);
    gg.bezierCurveTo(168, 58, 160, 58, 156, 54);
    gg.bezierCurveTo(150, 58, 140, 56, 132, 48);
  };
  shape(g, beard, lin(g, 0, 48, 0, 98, [[0, '#ffffff'], [1, '#e2d6c4']]), 3);
  g.strokeStyle = 'rgba(160,130,105,0.45)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(138 + i * 6, 62 + (i % 2) * 4);
    g.quadraticCurveTo(140 + i * 6, 76, 146 + i * 3, 88);
    g.stroke();
  }
  // open mouth (ho ho ho!): dark inside, red tongue, white teeth
  if (mouth) {
    const ry = mouth === 1 ? 9 : 5;
    shape(g, (gg) => gg.ellipse(162, 64, 9, ry, 0, 0, Math.PI * 2), '#3a0a14', 2.5);
    g.fillStyle = '#e8435a';
    g.beginPath(); g.ellipse(162, 64 + ry * 0.5, 6, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(155, 64 - ry + 1, 14, 2.5);
  }
  // moustache
  shape(g, (gg) => { gg.moveTo(146, 54); gg.bezierCurveTo(156, 47, 170, 49, 180, 58); gg.bezierCurveTo(170, 59, 162, 61, 158, 56); gg.bezierCurveTo(154, 61, 144, 61, 146, 54); }, '#ffffff', 2.5);
  // hat: all red, a tall cone flopping back over his head, warm white fur brim and pompom
  shape(g, (gg) => {
    gg.moveTo(128, 36);
    gg.bezierCurveTo(128, 8, 150, -2, 170, 12);
    gg.bezierCurveTo(178, 18, 178, 28, 176, 32);
    gg.lineTo(128, 36);
    gg.closePath();
  }, lin(g, 128, 0, 176, 36, [[0, '#a5122a'], [0.5, '#e8293f'], [1, '#c8182e']]), 3);
  shape(g, (gg) => {
    gg.moveTo(140, 12);
    gg.bezierCurveTo(124, 4, 104, 8, 96, 24);
    gg.bezierCurveTo(108, 18, 122, 20, 134, 28);
    gg.closePath();
  }, lin(g, 96, 4, 140, 28, [[0, '#8e0f22'], [1, '#d61f35']]), 3);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.ellipse(156, 14, 10, 4, -0.4, 0, Math.PI * 2); g.fill();
  shape(g, (gg) => { gg.moveTo(124, 34); gg.bezierCurveTo(140, 22, 166, 22, 180, 30); gg.lineTo(178, 40); gg.bezierCurveTo(162, 32, 142, 34, 128, 46); gg.closePath(); },
    lin(g, 0, 22, 0, 46, [[0, '#ffffff'], [1, '#e2d6c4']]), 3);
  shape(g, (gg) => gg.arc(94, 26, 9, 0, Math.PI * 2), lin(g, 86, 18, 102, 34, [[0, '#ffffff'], [1, '#e2d6c4']]), 3);
  g.restore();
}

// ---------- the TUS bag ----------
function bag(g) {
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
    g.beginPath(); g.moveTo(x0, 36); g.quadraticCurveTo((x0 + x1) / 2 + (x1 > x0 ? 14 : -14), 80, x1, 126); g.stroke();
    g.lineWidth = 3.5; g.strokeStyle = '#d9b26a';
    g.beginPath(); g.moveTo(x0, 36); g.quadraticCurveTo((x0 + x1) / 2 + (x1 > x0 ? 14 : -14), 80, x1, 126); g.stroke();
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
const ART_K = 0.4;
const factor = (scale) => Math.max(1, Math.round(scale / 4)); // game (4) = 1, title (12) = 3

function santaCanvas(scale, mouth) {
  const key = `santa|${scale}|${mouth}`;
  if (!cache.has(key)) {
    const art = canvasFor(ART_K * 10, UNITS.w, UNITS.h, (g) => {
      g.translate(0, TOP);
      g.save();
      g.translate(150, 122); // Santa is 20% bigger than the sleigh, so he reads well at game size
      g.scale(1.2, 1.2);
      g.translate(-150, -122);
      santa(g, mouth);
      g.restore();
      sleigh(g);
    });
    cache.set(key, enlarge(pixelate(art), factor(scale)));
  }
  return cache.get(key);
}

// The bag is drawn again for each size step, so its pixels stay the same size as Santa's.
function bagCanvas(scale, size) {
  const key = `bag|${scale}|${size}`;
  if (!cache.has(key)) {
    const k = ART_K * size;
    const art = pixelate(canvasFor(k * 10, BAG_UNITS.w, BAG_UNITS.h, bag));
    stampText(art, 'TUS', (PAD + 48) * k, (PAD + 75) * k, Math.max(1, Math.floor(size * 1.6)), '#c8182e', '#6e0816');
    cache.set(key, enlarge(art, factor(scale)));
  }
  return cache.get(key);
}

// Draws Santa centred on (x, y), turned by `angle`. scale 4 = game size. bagSize = bag size (1 = normal).
// mouth: 0 = closed, 1 = laughing wide open, 2 = laughing half open (flight hands this in).
export function drawSanta(ctx, x, y, angle = 0, scale = 4, bagSize = 1, mouth = 0) {
  const f = factor(scale);
  const px = ART_K * f; // screen pixels per model unit
  const size = Math.round(bagSize * 10) / 10;
  const body = santaCanvas(scale, mouth);
  const sack = bagCanvas(scale, size);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = angle !== 0; // square pixels when level, smooth only while turning
  const ox = -Math.round((UNITS.w / 2 + PAD) * px);
  const oy = -Math.round((UNITS.h / 2 + PAD) * px);
  const ax = ox + (PAD + BAG_ANCHOR.x) * px;
  const ay = oy + (PAD + BAG_ANCHOR.y) * px;
  ctx.drawImage(sack, Math.round(ax - (PAD + BAG_POINT.x) * px * size), Math.round(ay - (PAD + BAG_POINT.y) * px * size));
  ctx.drawImage(body, ox, oy);
  ctx.restore();
}
