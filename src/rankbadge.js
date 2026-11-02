// rankbadge.js: the rank badges in front of the names (R8, R20, R21), in 16-bit HD pixel art (ART.md).
// LEGEND (30): a gold plate with a jewelled crown.
// MYTHIC (40): a torn dark-purple plate with a wild beast head (glowing eyes, fangs) and claw slashes.
// GODLIKE (50): a divine plate, red fading into blue, with white angel wings, a gold halo and a shining star.
// Shapes are drawn small, snapped to pixels (pixelate) and enlarged; the word is pixel text on top.

import { CONFIG } from './config.js';
import { pixelate, enlarge } from './pixelart.js';

const cache = new Map();
const H = 22; // art pixels high (wings and halo stick out above the plate)

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
const px = (g, c, pts) => { g.fillStyle = c; for (const [x, y] of pts) g.fillRect(x, y, 1, 1); };

// Each style: where the plate is, how wide the emblem is, the text colours, and the drawing.
const STYLE = {
  legend: {
    left: 15, text: '#4a2400', shadow: '#fff3a8',
    plate(g, w) {
      g.fillStyle = lin(g, 0, 6, 0, 18, [[0, '#fff3a8'], [0.25, '#ffd23f'], [0.75, '#e0a21c'], [1, '#8a5a00']]);
      g.fillRect(8, 6, w - 9, 12);
      g.fillStyle = '#fff6c8'; g.fillRect(9, 7, w - 11, 1); // bevel light
      g.fillStyle = '#8a5a00'; g.fillRect(9, 16, w - 11, 1); // bevel dark
      for (let x = 12; x < w - 3; x += 6) px(g, '#c98a14', [[x, 9], [x + 2, 13]]); // brushed gold
    },
    emblem(g) { // a crown with red and blue jewels
      g.fillStyle = lin(g, 1, 3, 15, 19, [[0, '#fff3a8'], [0.5, '#ffd23f'], [1, '#a86e00']]);
      g.beginPath(); // three points
      g.moveTo(1, 18); g.lineTo(1, 4); g.lineTo(5, 10); g.lineTo(8, 3); g.lineTo(11, 10); g.lineTo(15, 4); g.lineTo(15, 18); g.closePath();
      g.fill();
      g.fillStyle = '#a86e00'; g.fillRect(1, 14, 15, 4); // crown band
      g.fillStyle = '#ffe680'; g.fillRect(2, 14, 13, 1);
    },
    details(g) {
      px(g, '#ff3b4f', [[8, 15], [9, 15], [8, 16], [9, 16]]); // jewels on the band
      px(g, '#ffb0b8', [[8, 15]]);
      px(g, '#27a8ff', [[4, 15], [4, 16], [13, 15], [13, 16]]);
      px(g, '#ffffff', [[2, 3], [9, 2], [16, 3]]); // gold balls on the tips
      px(g, '#ffd23f', [[2, 4], [9, 3], [16, 4]]);
    },
  },
  mythic: {
    left: 17, extra: 14, text: '#f0c8ff', shadow: '#2a0a40', // extra = room for the claw slashes
    plate(g, w) {
      g.fillStyle = lin(g, 0, 5, 0, 19, [[0, '#9a4ae0'], [0.4, '#5a1c94'], [1, '#22083c']]);
      g.beginPath(); // torn, furry edges: spikes on top, jagged bottom
      g.moveTo(10, 7);
      for (let x = 10; x < w - 2; x += 4) { g.lineTo(x + 2, 4 + ((x / 4) % 2)); g.lineTo(x + 4, 7); }
      g.lineTo(w - 1, 9); g.lineTo(w - 2, 17);
      for (let x = w - 2; x > 10; x -= 5) { g.lineTo(x - 2, 19 + ((x / 5) % 2)); g.lineTo(x - 5, 17); }
      g.closePath();
      g.fill();
    },
    emblem(g) { // a wild beast head: pointed ears, dark fur
      g.fillStyle = lin(g, 0, 0, 16, 20, [[0, '#7a34c0'], [1, '#1c0630']]);
      g.beginPath();
      g.moveTo(1, 1); g.lineTo(6, 6); g.lineTo(11, 6); g.lineTo(16, 1); g.lineTo(16, 12);
      g.lineTo(12, 18); g.lineTo(5, 18); g.lineTo(1, 12); g.closePath();
      g.fill();
    },
    details(g, w) {
      px(g, '#ffe14a', [[4, 9], [5, 10], [6, 10], [11, 10], [12, 10], [13, 9]]); // glowing slanted eyes
      px(g, '#fffbe0', [[5, 10], [12, 10]]);
      px(g, '#ffffff', [[6, 16], [6, 17], [11, 16], [11, 17]]); // fangs
      px(g, '#c88aff', [[3, 3], [14, 3]]); // inner ears
      for (let k = 0; k < 3; k++) { // three claw slashes, ripped into the end of the plate
        const x0 = w - 14 + k * 4;
        for (let j = 0; j < 11; j++) {
          const x = x0 + Math.floor(j / 2.5);
          px(g, j > 1 && j < 9 ? '#ffffff' : '#f0c8ff', [[x, 5 + j]]);
          px(g, '#12001f', [[x + 1, 5 + j]]);
        }
      }
    },
  },
  godlike: {
    left: 21, right: 10, text: '#ffffff', shadow: '#1a0a14',
    plate(g, w) {
      // angel wings at both ends (drawn first, behind the plate)
      g.fillStyle = lin(g, 0, 0, 0, 20, [[0, '#ffffff'], [1, '#b8c8ff']]);
      for (const [x, dir] of [[12, -1], [w, 1]]) {
        for (let k = 0; k < 3; k++) { // three rows of feathers
          g.beginPath();
          g.moveTo(x, 8 + k * 3); g.lineTo(x + dir * (9 - k * 2), 1 + k * 4); g.lineTo(x + dir * (7 - k * 2), 7 + k * 4); g.lineTo(x, 12 + k * 3);
          g.closePath(); g.fill();
        }
      }
      g.fillStyle = lin(g, 12, 0, w, 0, [[0, '#ff3b4f'], [0.45, '#b0206a'], [0.55, '#4a3ad0'], [1, '#27a8ff']]);
      g.fillRect(12, 7, w - 12, 11);
      g.fillStyle = '#ffe9a0'; // gold trim, top and bottom
      g.fillRect(12, 6, w - 12, 1); g.fillRect(12, 17, w - 12, 1);
    },
    emblem(g) { // a shining star under a gold halo
      g.strokeStyle = '#ffd23f'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(16, 3, 4.5, 1.6, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = lin(g, 10, 6, 22, 18, [[0, '#ffffff'], [0.5, '#fff3a8'], [1, '#ffd23f']]);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 2.4 : 6;
        g.lineTo(16 + Math.cos(a) * r, 12 + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    },
    details(g, w) {
      px(g, '#ffffff', [[16, 12], [15, 11]]);
      px(g, '#ff8fa0', [[14, 9]]);
      px(g, '#8fd8ff', [[w - 17, 9]]);
    },
  },
};

// Returns the badge canvas for 'legend', 'mythic' or 'godlike' (null for no rank). scale = screen px per art px.
export function rankBadge(rank, scale = 2) {
  const st = STYLE[rank];
  if (!st) return null;
  const word = CONFIG.board[`${rank}Tag`];
  const key = `${rank}|${word}|${scale}`;
  if (cache.has(key)) return cache.get(key);
  const fontOk = document.fonts ? document.fonts.check('8px "Press Start 2P"') : true;
  const w = st.left + word.length * 8 + 4 + (st.right || 0) + (st.extra || 0);
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = H;
  const g = c.getContext('2d');
  g.translate(1, 0);
  st.plate(g, w - (st.right || 0)); // the plate ends before the room on the right (godlike's wing)
  st.emblem(g);
  pixelate(c);
  g.setTransform(1, 0, 0, 1, 1, 0);
  st.details(g, w);
  // the word: 8 px pixel font, with a 1-pixel shadow, then snapped to hard pixels
  const t = document.createElement('canvas');
  t.width = c.width;
  t.height = H;
  const tg = t.getContext('2d');
  tg.font = '8px "Press Start 2P"';
  tg.textBaseline = 'top';
  tg.fillStyle = st.shadow;
  tg.fillText(word, st.left + 2, 9);
  tg.fillStyle = st.text;
  tg.fillText(word, st.left + 1, 8);
  const img = tg.getImageData(0, 0, t.width, H);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  tg.putImageData(img, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(t, 0, 0);
  const out = enlarge(c, scale);
  if (fontOk) cache.set(key, out);
  return out;
}

// The colour of a ranked name (the name text after the badge).
export const RANK_COLOR = { legend: '#ffd23f', mythic: '#c35cff', godlike: '#ff6b7a' };
