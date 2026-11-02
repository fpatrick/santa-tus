// gifts.js: the Christmas presents stacked above each chimney: big and small boxes, wrapping paper
// patterns, ribbons, bows and gift tags. chimney.js stacks them and flies them into Santa's bag.

import { CONFIG } from './config.js';

const CW = CONFIG.world.chimneyW;
const GIFT_COLORS = [
  ['#d62839', '#ffd23f'], ['#1f9e55', '#d62839'], ['#ffd23f', '#d62839'], ['#2a6fdb', '#f4f7ff'],
  ['#8e3bd6', '#ffd23f'], ['#f4f7ff', '#d62839'], ['#e86a1a', '#1f9e55'],
];

export function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The presents of one chimney, from the gap upwards. Each layer is one big present, two small
// presents side by side, or (not at the bottom) one small present. y = distance from the gap.
const PATTERNS = ['plain', 'dots', 'stripes', 'stars', 'checks', 'snow'];
export function gifts(ch) {
  if (ch._gifts) return ch._gifts;
  const r = rand(ch.i * 131 + 7);
  const pick = () => ({ col: GIFT_COLORS[Math.floor(r() * GIFT_COLORS.length)], pat: PATTERNS[Math.floor(r() * PATTERNS.length)], tag: r() < 0.3 });
  const list = [];
  let h = 0;
  let layer = 0;
  while (h < 1000) {
    const kind = r();
    if (kind < 0.45) { // one big present
      const gh = 54 + Math.floor(r() * 4) * 8;
      list.push({ w: CW - 6 + Math.floor(r() * 4) * 6, h: gh, dx: Math.round((r() - 0.5) * 10), y: h, big: true, ...pick() });
      h += gh;
    } else if (kind < 0.85 || layer === 0) { // two small presents
      const w1 = Math.round(CW * (0.42 + r() * 0.14));
      const w2 = CW + 4 - w1;
      const h1 = 30 + Math.floor(r() * 4) * 6;
      const h2 = 30 + Math.floor(r() * 4) * 6;
      list.push({ w: w1, h: h1, dx: Math.round(-CW / 2 + w1 / 2 - 2), y: h, ...pick() });
      list.push({ w: w2, h: h2, dx: Math.round(CW / 2 - w2 / 2 + 2), y: h, ...pick() });
      h += Math.max(h1, h2);
    } else { // one small present in the middle
      const gh = 32 + Math.floor(r() * 3) * 6;
      list.push({ w: Math.round(CW * (0.5 + r() * 0.2)), h: gh, dx: Math.round((r() - 0.5) * 30), y: h, ...pick() });
      h += gh;
    }
    layer += 1;
  }
  ch._gifts = list;
  return list;
}

function pattern(g, p, x, y, w, h) {
  const [box, rib] = p.col;
  g.fillStyle = 'rgba(255,255,255,0.28)';
  if (p.pat === 'dots') {
    for (let yy = y + 8; yy < y + h; yy += 12) for (let xx = x + 6 + ((yy / 12) % 2) * 6; xx < x + w; xx += 12) { g.beginPath(); g.arc(xx, yy, 2.5, 0, Math.PI * 2); g.fill(); }
  } else if (p.pat === 'stripes') {
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 5;
    for (let k = -h; k < w; k += 16) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); }
  } else if (p.pat === 'stars') {
    g.fillStyle = box === '#ffd23f' ? 'rgba(200,24,46,0.5)' : 'rgba(255,230,120,0.65)';
    for (let yy = y + 10; yy < y + h; yy += 18) for (let xx = x + 8 + ((yy / 18) % 2) * 9; xx < x + w; xx += 18) star(g, xx, yy, 4);
  } else if (p.pat === 'checks') {
    g.fillStyle = 'rgba(0,0,0,0.14)';
    for (let yy = y; yy < y + h; yy += 10) for (let xx = x + ((yy / 10) % 2) * 10; xx < x + w; xx += 20) g.fillRect(xx, yy, 10, 10);
  } else if (p.pat === 'snow') {
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.5;
    for (let yy = y + 12; yy < y + h; yy += 22) for (let xx = x + 12 + ((yy / 22) % 2) * 11; xx < x + w; xx += 22) flake(g, xx, yy, 5);
  }
  return rib;
}

function star(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

function flake(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.stroke();
}

// One present centred on (0, 0): wrapping paper with a pattern, shading, ribbon with a shine,
// a bow with loops and tails, and sometimes a gift tag.
export function drawGift(g, p) {
  const { w, h } = p;
  const x = -w / 2;
  const y = -h / 2;
  const [box] = p.col;
  g.fillStyle = '#1a0a14';
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle = box;
  g.fillRect(x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const rib = pattern(g, p, x, y, w, h);
  const light = g.createLinearGradient(x, y, x + w, y + h);
  light.addColorStop(0, 'rgba(255,255,255,0.22)');
  light.addColorStop(0.5, 'rgba(255,255,255,0)');
  light.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = light;
  g.fillRect(x, y, w, h);
  g.restore();
  // lid
  const lid = Math.max(6, Math.round(h * 0.16));
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(x, y, w, lid);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(x, y + lid, w, 2);
  // ribbon: down and across, with a darker edge and a shine
  const rw = Math.max(8, Math.round(w * 0.12));
  g.fillStyle = rib;
  g.fillRect(-rw / 2, y, rw, h);
  g.fillRect(x, -rw / 2, w, rw);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(rw / 2 - 2, y, 2, h);
  g.fillRect(x, rw / 2 - 2, w, 2);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillRect(-rw / 2 + 1, y, 2, h);
  g.fillRect(x, -rw / 2 + 1, w, 2);
  // bow on top: two loops, two tails, a knot
  const s = Math.min(1, w / 120) * (p.big ? 1 : 0.8);
  g.save();
  g.translate(0, y + 2);
  g.scale(s, s);
  g.fillStyle = rib;
  g.strokeStyle = '#1a0a14';
  g.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(side * 10, -22, side * 30, -16, side * 24, 0);
    g.bezierCurveTo(side * 20, 6, side * 8, 4, 0, 0);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(side * 14, -6, 5, 3, side * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = rib;
    g.beginPath();
    g.moveTo(side * 3, 2); g.lineTo(side * 16, 16); g.lineTo(side * 10, 18); g.lineTo(side * 1, 4);
    g.fill();
    g.stroke();
  }
  g.beginPath(); g.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
  // gift tag on big presents
  if (p.tag && p.big && w > 80) {
    g.save();
    g.translate(x + w * 0.74, y + h * 0.62);
    g.rotate(-0.25);
    g.fillStyle = '#fff3dc';
    g.strokeStyle = '#1a0a14';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-10, -6); g.lineTo(8, -6); g.lineTo(13, 0); g.lineTo(8, 6); g.lineTo(-10, 6); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#c8182e';
    g.fillRect(-7, -1, 11, 2);
    g.restore();
  }
}

