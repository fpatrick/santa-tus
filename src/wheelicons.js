// wheelicons.js: the wheel's prize icons in "16-bit HD" pixel art: drawn with shapes on a 36 x 36 pixel
// grid, then snapped to hard pixels with few colours and a dark outline (pixelart.js), then enlarged.
// Icons: 'jackpot' (a pot of gold, for +2 jackpot tickets), 'jackpotBig' (an overflowing pot with holly,
// for +5), 'cash' (a fan of €10 notes and gold coins), 'free' (a green replay arrow round Santa's hat).

import { pixelate, enlarge } from './pixelart.js';

const N = 36; // art pixels per side
const cache = new Map();

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
const GOLD = (g, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, '#fff3a8'], [0.4, '#ffd23f'], [1, '#b37c00']]);
const px = (g, c, pts) => { g.fillStyle = c; for (const [x, y] of pts) g.fillRect(x, y, 1, 1); };

// One gold coin, seen a little from the side.
function coin(g, x, y, r = 3.4) {
  g.fillStyle = '#7a4a00'; // dark edge, so each coin stands out from the heap
  g.beginPath(); g.ellipse(x, y + 0.6, r + 0.6, r * 0.8 + 0.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = GOLD(g, x - r, y - r, x + r, y + r);
  g.beginPath(); g.ellipse(x, y, r - 0.4, r * 0.8 - 0.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d99a1a'; // the inner ring of the coin
  g.beginPath(); g.ellipse(x + 0.3, y + 0.2, r * 0.45, r * 0.35, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff6c8';
  g.fillRect(Math.round(x - r * 0.6), Math.round(y - r * 0.5), 1, 1);
}

// A sparkle (4-point star) made of single pixels.
function sparkle(g, x, y, big = false) {
  px(g, '#ffffff', [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]);
  if (big) px(g, '#fff6c8', [[x - 2, y], [x + 2, y], [x, y - 2], [x, y + 2]]);
}

function pot(g, big) {
  // heap of coins on top
  const heap = big
    ? [[9, 13], [13, 11], [17, 9], [21, 10], [25, 12], [27, 15], [11, 16], [15, 14], [19, 13], [23, 14], [8, 17], [18, 6], [14, 8], [22, 7]]
    : [[11, 15], [15, 13], [19, 12], [23, 14], [25, 16], [13, 17], [17, 15], [21, 16]];
  g.fillStyle = GOLD(g, 6, big ? 4 : 10, 30, 20);
  g.beginPath(); g.ellipse(18, 18, 12, big ? 9 : 6, 0, Math.PI, 0); g.fill();
  for (const [x, y] of heap) coin(g, x, y);
  // the pot: dark iron, round belly, with a gold rim
  g.fillStyle = lin(g, 4, 18, 32, 34, [[0, '#5a4a6e'], [0.45, '#2e2440'], [1, '#120c1c']]);
  g.beginPath();
  g.moveTo(6, 19); g.bezierCurveTo(3, 25, 6, 32, 12, 33); g.lineTo(24, 33); g.bezierCurveTo(30, 32, 33, 25, 30, 19); g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)'; // shine on the belly
  g.beginPath(); g.ellipse(11, 25, 2, 4, 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = GOLD(g, 4, 17, 32, 21);
  g.fillRect(4, 17, 28, 3); // rim
  g.fillStyle = '#fff3a8';
  g.fillRect(5, 17, 10, 1);
  // little feet
  g.fillStyle = '#120c1c';
  g.fillRect(9, 33, 3, 2); g.fillRect(24, 33, 3, 2);
  if (big) { // holly on the rim: two leaves and red berries
    g.fillStyle = '#1f9e55';
    g.beginPath(); g.ellipse(25, 17, 4, 2, -0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(31, 17, 4, 2, 0.5, 0, Math.PI * 2); g.fill();
    px(g, '#ff3b4f', [[27, 16], [28, 16], [28, 17], [29, 16], [27, 17]]);
    px(g, '#ffc0c8', [[27, 16]]);
  }
}

function cash(g) {
  // two €10 notes fanned out (the real note is red), then a stack of gold coins
  const note = (rot, dx, dy) => {
    g.save(); g.translate(16 + dx, 14 + dy); g.rotate(rot);
    g.fillStyle = lin(g, -12, -7, 12, 7, [[0, '#ff9a8a'], [0.5, '#e8434f'], [1, '#a8182e']]);
    g.fillRect(-12, -7, 24, 14);
    g.fillStyle = '#ffd0c0';
    g.fillRect(-10, -5, 20, 1); g.fillRect(-10, 4, 20, 1);
    g.fillStyle = 'rgba(255,240,220,0.8)';
    g.beginPath(); g.arc(-5, 0, 3, 0, Math.PI * 2); g.fill(); // the round window
    g.restore();
  };
  note(-0.35, -2, 2);
  note(0.1, 2, -1);
  // "10" on the front note, in pixels
  px(g, '#fff6e0', [[19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [21, 10], [22, 10], [23, 10], [21, 11], [23, 11], [21, 12], [23, 12], [21, 13], [23, 13], [21, 14], [22, 14], [23, 14]]);
  for (let i = 0; i < 4; i++) coin(g, 10, 30 - i * 2.4, 5); // coin stack
  coin(g, 22, 30, 5);
  coin(g, 27, 26, 4);
}

function free(g) {
  // a thick green circular arrow (fly again!) ...
  g.lineCap = 'butt';
  g.strokeStyle = '#0c4a24'; g.lineWidth = 7;
  g.beginPath(); g.arc(18, 19, 11, -0.6, Math.PI * 1.55); g.stroke();
  g.strokeStyle = lin(g, 6, 8, 30, 30, [[0, '#8dffb8'], [0.5, '#3dff8b'], [1, '#12924a']]); g.lineWidth = 5;
  g.beginPath(); g.arc(18, 19, 11, -0.6, Math.PI * 1.55); g.stroke();
  g.fillStyle = '#3dff8b'; // arrow head
  g.beginPath(); g.moveTo(22, 1); g.lineTo(33, 9); g.lineTo(22, 15); g.closePath(); g.fill();
  g.fillStyle = '#12924a';
  g.beginPath(); g.moveTo(22, 10); g.lineTo(33, 9); g.lineTo(22, 15); g.closePath(); g.fill();
  // ... round Santa's hat
  g.fillStyle = lin(g, 11, 12, 25, 24, [[0, '#ff6b7a'], [0.5, '#d61f35'], [1, '#7a0a1a']]);
  g.beginPath(); g.moveTo(11, 23); g.bezierCurveTo(12, 14, 18, 11, 23, 13); g.bezierCurveTo(25, 15, 25, 19, 25, 23); g.closePath(); g.fill();
  g.fillStyle = '#f4f7ff';
  g.fillRect(10, 22, 16, 4);
  g.fillStyle = '#c9d2f0';
  g.fillRect(10, 25, 16, 1);
  g.beginPath(); g.arc(24, 13, 2.4, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
}

const DRAW = {
  jackpot: (g) => { pot(g, false); },
  jackpotBig: (g) => { pot(g, true); },
  cash,
  free,
};
const SPARKS = { jackpot: [[30, 6, true], [5, 10]], jackpotBig: [[31, 4, true], [4, 8, true], [33, 26]], cash: [[31, 4, true], [3, 18]], free: [] };

// Returns the icon as a canvas, `scale` screen pixels per art pixel.
export function wheelIcon(name, scale = 3) {
  const key = `${name}|${scale}`;
  if (!cache.has(key)) {
    const c = document.createElement('canvas');
    c.width = N + 2;
    c.height = N + 2;
    const g = c.getContext('2d');
    g.translate(1, 1);
    (DRAW[name] || DRAW.jackpot)(g);
    pixelate(c);
    for (const [x, y, big] of SPARKS[name] || []) sparkle(g, x + 1, y + 1, big);
    cache.set(key, enlarge(c, scale));
  }
  return cache.get(key);
}
