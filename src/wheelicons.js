// wheelicons.js: the wheel's prize icons in "16-bit HD" pixel art: drawn with shapes on a 36 x 36 pixel
// grid, then snapped to hard pixels with few colours and a dark outline (pixelart.js), then enlarged.
// Icons: 'coin' (the big € jackpot coin), 'gold' / 'silver' / 'bronze' (prize medals on a ribbon),
// 'ticket' (two red cloakroom draw tickets), 'note' (a €10 note with a coin), 'sweet' (a wrapped sweet),
// 'free' (a green replay arrow round Santa's hat). Older ones: 'jackpot', 'jackpotBig' (pots of gold), 'cash'.

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

// The jackpot: one big gold coin with a € on it.
function bigCoin(g) {
  g.fillStyle = '#7a4a00';
  g.beginPath(); g.arc(18, 18, 16.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = GOLD(g, 3, 3, 33, 33);
  g.beginPath(); g.arc(18, 17.5, 15, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c98a14'; g.lineWidth = 1.4;
  g.beginPath(); g.arc(18, 17.5, 11.5, 0, Math.PI * 2); g.stroke(); // the raised rim
  // the € sign: a "C" with two bars, darker gold so it looks stamped
  g.strokeStyle = '#9a6200'; g.lineWidth = 3;
  g.beginPath(); g.arc(19.5, 17.5, 6.5, Math.PI * 0.28, Math.PI * 1.72); g.stroke();
  g.fillStyle = '#9a6200';
  g.fillRect(10, 14, 9, 2); g.fillRect(10, 19, 9, 2);
  g.fillStyle = '#fff3a8'; // light top-left
  g.beginPath(); g.arc(11, 10, 2.2, 0, Math.PI * 2); g.fill();
}

const METAL = {
  gold: [['#fff6c8', '#ffd23f', '#b37c00'], '#7a4a00'],
  silver: [['#ffffff', '#c8d2e6', '#6a7690'], '#3a4258'],
  bronze: [['#ffd0a0', '#d9733a', '#7a3a10'], '#4a2008'],
};
// A prize medal: a red and green ribbon, a round medal in the tier's metal with a star.
function medal(g, metal) {
  const [stops, dark] = METAL[metal];
  g.fillStyle = '#d61f35'; // ribbon, two straps in a V
  g.beginPath(); g.moveTo(7, 0); g.lineTo(14, 0); g.lineTo(20, 14); g.lineTo(14, 16); g.closePath(); g.fill();
  g.fillStyle = '#1f9e55';
  g.beginPath(); g.moveTo(29, 0); g.lineTo(22, 0); g.lineTo(16, 14); g.lineTo(22, 16); g.closePath(); g.fill();
  g.fillStyle = '#ff6b7a'; g.fillRect(9, 0, 2, 3);
  g.fillStyle = '#5ad08a'; g.fillRect(25, 0, 2, 3);
  g.fillStyle = dark;
  g.beginPath(); g.arc(18, 23, 11.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = lin(g, 8, 13, 28, 33, stops.map((c, i) => [i / 2, c]));
  g.beginPath(); g.arc(18, 22.5, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = dark; // a five-point star stamped in the middle
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 2.6 : 6;
    g.lineTo(18 + Math.cos(a) * r, 23 + Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  g.fillStyle = stops[0];
  g.beginPath(); g.arc(13, 17, 1.8, 0, Math.PI * 2); g.fill();
}

// Two red cloakroom draw tickets, one on top of the other, with a torn edge of holes.
function ticket(g) {
  const one = (x, y, rot, front) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = front ? lin(g, -13, -8, 13, 8, [[0, '#ff8a96'], [0.5, '#e8434f'], [1, '#a8182e']]) : '#8a1424';
    g.fillRect(-14, -8, 28, 16);
    g.fillStyle = '#ffe9c8'; // the cream number panel
    g.fillRect(-9, -4, 14, 8);
    g.fillStyle = front ? '#a8182e' : '#5a0a14'; // notches on the short ends
    g.beginPath(); g.arc(-14, 0, 2.6, 0, Math.PI * 2); g.arc(14, 0, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,233,200,0.9)'; // the perforation
    for (let k = -6; k <= 6; k += 3) g.fillRect(8, k, 1, 1);
    g.restore();
  };
  one(17, 13, -0.28, false);
  one(19, 22, 0.12, true);
  // "No." in pixels on the front panel
  px(g, '#a8182e', [[12, 21], [12, 22], [12, 23], [13, 21], [14, 22], [15, 21], [15, 22], [15, 23], [17, 22], [18, 22], [17, 23], [18, 23]]);
}

// A €10 note (red, with the round window) and one gold coin.
function note(g) {
  g.save(); g.translate(17, 15); g.rotate(-0.18);
  g.fillStyle = lin(g, -15, -9, 15, 9, [[0, '#ff9a8a'], [0.5, '#e8434f'], [1, '#a8182e']]);
  g.fillRect(-15, -9, 30, 18);
  g.fillStyle = '#ffd0c0';
  g.fillRect(-13, -7, 26, 1); g.fillRect(-13, 6, 26, 1);
  g.fillStyle = 'rgba(255,240,220,0.85)';
  g.beginPath(); g.arc(-7, 0, 4, 0, Math.PI * 2); g.fill();
  g.restore();
  px(g, '#fff6e0', [[21, 9], [21, 10], [21, 11], [21, 12], [21, 13], [21, 14], [23, 9], [24, 9], [25, 9], [23, 10], [25, 10], [23, 11], [25, 11], [23, 12], [25, 12], [23, 13], [25, 13], [23, 14], [24, 14], [25, 14]]);
  coin(g, 27, 28, 6);
}

// A wrapped sweet: a round red and white striped sweet with twisted wrapper ends.
function sweet(g) {
  for (const dir of [-1, 1]) { // the twisted ends of the wrapper
    g.fillStyle = lin(g, 18 + dir * 8, 10, 18 + dir * 17, 26, [[0, '#fff3a8'], [1, '#e0a21c']]);
    g.beginPath(); g.moveTo(18 + dir * 8, 18); g.lineTo(18 + dir * 17, 9); g.lineTo(18 + dir * 15, 18); g.lineTo(18 + dir * 17, 27); g.closePath(); g.fill();
    g.fillStyle = '#b37c00';
    g.fillRect(18 + dir * 12 - (dir < 0 ? 1 : 0), 17, 1, 2);
  }
  g.save();
  g.beginPath(); g.arc(18, 18, 10, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#f4f7ff';
  g.fillRect(6, 6, 24, 24);
  g.fillStyle = '#d61f35'; // diagonal stripes
  for (let k = -24; k < 24; k += 7) {
    g.beginPath(); g.moveTo(6 + k, 30); g.lineTo(10 + k, 30); g.lineTo(34 + k, 6); g.lineTo(30 + k, 6); g.closePath(); g.fill();
  }
  g.fillStyle = 'rgba(40,0,10,0.28)'; // shade bottom-right
  g.beginPath(); g.arc(22, 22, 10, 0, Math.PI * 2); g.fill();
  g.restore();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(14, 13, 2, 0, Math.PI * 2); g.fill();
}

const DRAW = {
  coin: bigCoin,
  gold: (g) => medal(g, 'gold'),
  silver: (g) => medal(g, 'silver'),
  bronze: (g) => medal(g, 'bronze'),
  ticket,
  note,
  sweet,
  jackpot: (g) => { pot(g, false); },
  jackpotBig: (g) => { pot(g, true); },
  cash,
  free,
};
const SPARKS = { coin: [[31, 4, true], [4, 6], [33, 18]], gold: [[31, 18, true], [4, 22]], silver: [[31, 18]], bronze: [], ticket: [[32, 6]], note: [[33, 4, true]], sweet: [[30, 7]],
  jackpot: [[30, 6, true], [5, 10]], jackpotBig: [[31, 4, true], [4, 8, true], [33, 26]], cash: [[31, 4, true], [3, 18]], free: [] };

// Returns the icon as a canvas, `scale` screen pixels per art pixel.
export const WHEEL_ICONS = ['coin', 'gold', 'silver', 'bronze', 'ticket', 'note', 'sweet', 'free', 'jackpot', 'jackpotBig', 'cash'];
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
