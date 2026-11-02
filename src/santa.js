// santa.js: the detailed Santa, his sleigh and his TUS bag, drawn with shapes and shading.
// The model is designed in a 260 x 200 unit box (Santa faces right). It is drawn ONCE per size
// into a canvas with its dark outline, then only moved and turned, so it never flickers.
// scale 4 (in the game) = 104 x 80 px, the same size as the old pixel Santa.

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
  // green velvet seat edge peeking out
  shape(g, (gg) => gg.rect(36, 114, 120, 10), lin(g, 0, 114, 0, 124, [[0, '#3dcc72'], [1, '#126b34']]), 2);
}

// ---------- Santa ----------
function santa(g) {
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
  shape(g, (gg) => gg.rect(150, 70, 12, 50), lin(g, 150, 0, 162, 0, [[0, '#ffffff'], [1, '#c9d2f0']]), 2);
  shape(g, (gg) => gg.rect(104, 104, 78, 10), '#1c1018', 2);
  shape(g, (gg) => gg.rect(146, 101, 18, 16), lin(g, 0, 101, 0, 117, [[0, '#fff1a8'], [1, '#c98a14']]), 2);
  g.fillStyle = '#1c1018';
  g.fillRect(151, 106, 8, 6);
  g.fillStyle = '#c9d2f0';
  for (const by of [78, 90]) { g.beginPath(); g.arc(156, by, 2.2, 0, Math.PI * 2); g.fill(); }
  // front arm reaching to the reins, white cuff, black glove
  shape(g, (gg) => { gg.moveTo(160, 74); gg.bezierCurveTo(186, 70, 200, 80, 206, 92); gg.lineTo(196, 100); gg.bezierCurveTo(188, 90, 176, 88, 164, 92); gg.closePath(); },
    lin(g, 160, 70, 206, 100, [[0, '#ff5b6c'], [1, '#a5122a']]), 3);
  shape(g, (gg) => { gg.ellipse(202, 95, 7, 10, -0.6, 0, Math.PI * 2); }, '#f4f7ff', 2);
  shape(g, (gg) => { gg.ellipse(212, 99, 7, 6.5, 0, 0, Math.PI * 2); }, lin(g, 206, 92, 220, 106, [[0, '#8a5a3a'], [1, '#3a2014']]), 2);
  // reins to the front of the sleigh
  g.strokeStyle = '#6b3a14';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(220, 100); g.quadraticCurveTo(240, 104, 258, 90); g.stroke();
  // head: face, cheek, eye, nose
  shape(g, (gg) => gg.arc(150, 44, 20, 0, Math.PI * 2), lin(g, 132, 30, 170, 60, [[0, '#ffd9bd'], [1, '#e8a27c']]), 3);
  g.fillStyle = 'rgba(255,90,110,0.55)';
  g.beginPath(); g.ellipse(160, 50, 6, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK;
  g.beginPath(); g.ellipse(160, 40, 2.6, 3.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.fillRect(160, 38.5, 1.2, 1.2);
  g.strokeStyle = '#d9d9e8'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(155, 33); g.quadraticCurveTo(161, 30, 166, 34); g.stroke(); // eyebrow
  shape(g, (gg) => gg.arc(170, 46, 5, 0, Math.PI * 2), '#ff8f8f', 2); // nose
  // beard: big and curly, with grey shading strands
  const beard = (gg) => {
    gg.moveTo(132, 48);
    gg.bezierCurveTo(128, 64, 132, 84, 146, 92);
    gg.bezierCurveTo(150, 98, 158, 98, 162, 92);
    gg.bezierCurveTo(176, 86, 180, 66, 174, 52);
    gg.bezierCurveTo(168, 58, 160, 58, 156, 54);
    gg.bezierCurveTo(150, 58, 140, 56, 132, 48);
  };
  shape(g, beard, lin(g, 0, 48, 0, 98, [[0, '#ffffff'], [1, '#c6cde6']]), 3);
  g.strokeStyle = 'rgba(120,130,170,0.5)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(138 + i * 5, 60 + (i % 2) * 4);
    g.quadraticCurveTo(140 + i * 5, 74, 146 + i * 3, 86);
    g.stroke();
  }
  // moustache
  shape(g, (gg) => { gg.moveTo(148, 54); gg.bezierCurveTo(156, 48, 170, 50, 178, 58); gg.bezierCurveTo(170, 58, 162, 60, 158, 56); gg.bezierCurveTo(154, 60, 146, 60, 148, 54); }, '#ffffff', 2);
  // hat: red, flopping back, fur brim, pompom
  shape(g, (gg) => {
    gg.moveTo(130, 34);
    gg.bezierCurveTo(132, 10, 160, 4, 172, 26);
    gg.bezierCurveTo(150, 16, 120, 14, 98, 30);
    gg.bezierCurveTo(108, 26, 120, 28, 130, 34);
  }, lin(g, 100, 10, 172, 34, [[0, '#a5122a'], [0.6, '#e8293f'], [1, '#ff5b6c']]), 3);
  shape(g, (gg) => { gg.moveTo(126, 36); gg.bezierCurveTo(140, 20, 166, 20, 176, 30); gg.lineTo(174, 38); gg.bezierCurveTo(160, 30, 142, 32, 130, 44); gg.closePath(); },
    lin(g, 0, 22, 0, 44, [[0, '#ffffff'], [1, '#c9d2f0']]), 3);
  shape(g, (gg) => gg.arc(96, 32, 9, 0, Math.PI * 2), lin(g, 88, 24, 104, 40, [[0, '#ffffff'], [1, '#bcc6e6']]), 3);
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
  // TUS patch, stitched on, in the same red and gold as the sleigh
  shape(g, (gg) => { gg.rect(16, 58, 64, 34); }, lin(g, 0, 58, 0, 92, [[0, '#fff3dc'], [1, '#e6cfa2']]), 3);
  g.setLineDash([3, 3]);
  g.strokeStyle = '#c8182e';
  g.lineWidth = 1.5;
  g.strokeRect(20, 62, 56, 26);
  g.setLineDash([]);
  g.font = '15px "Press Start 2P"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#6e0816';
  g.fillText('TUS', 49.5, 77.5);
  g.fillStyle = '#c8182e';
  g.fillText('TUS', 48, 76);
}

const BAG_UNITS = { w: 96, h: 120 };
const BAG_ANCHOR = { x: 92, y: 118 + TOP }; // bottom right of the bag sits here on the sleigh (model units)

function santaCanvas(scale) {
  const key = `santa|${scale}`;
  if (!cache.has(key)) {
    cache.set(key, canvasFor(scale, UNITS.w, UNITS.h, (g) => {
      g.translate(0, TOP);
      g.save();
      g.translate(150, 122); // Santa is 20% bigger, so he reads well at game size
      g.scale(1.2, 1.2);
      g.translate(-150, -122);
      santa(g);
      g.restore();
      sleigh(g);
    }));
  }
  return cache.get(key);
}

function bagCanvas(scale) {
  const key = `bag|${scale}`;
  if (!cache.has(key)) cache.set(key, canvasFor(scale, BAG_UNITS.w, BAG_UNITS.h, bag));
  return cache.get(key);
}

// Fonts load after the first frame: drop the cache once so "TUS" uses the pixel font.
if (globalThis.document && document.fonts) document.fonts.ready.then(() => cache.clear());

// Draws Santa centred on (x, y), turned by `angle`. scale 4 = game size. bag = bag size (1 = normal).
export function drawSanta(ctx, x, y, angle = 0, scale = 4, bagSize = 1) {
  const k = scale / 10;
  const body = santaCanvas(scale);
  const sack = bagCanvas(scale);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const ox = -(UNITS.w / 2 + PAD) * k;
  const oy = -(UNITS.h / 2 + PAD) * k;
  // the bag grows from its bottom-right corner, which stays on the sleigh
  const ax = ox + (PAD + BAG_ANCHOR.x) * k;
  const ay = oy + (PAD + BAG_ANCHOR.y) * k;
  const bw = sack.width * bagSize;
  const bh = sack.height * bagSize;
  ctx.drawImage(sack, ax - bw + PAD * k * bagSize, ay - bh + PAD * k * bagSize, bw, bh);
  ctx.drawImage(body, ox, oy);
  ctx.restore();
}
