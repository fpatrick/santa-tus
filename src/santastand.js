// santastand.js: Santa standing up after a crash (C1-C4), seen from the front, without his hat.
// Poses: 'ok' (smiles, waves), 'happy' (laughs, both arms up, he jumps), 'sad' (arms down, frown, a tear).
// frame 0/1 = two steps of the waving / cheering animation. Same pixel-art pipeline as santa.js.

import { INK, PAD, lin, shape, maskCtx, canvasFor } from './drawkit.js';
import { pixelate, texture, enlarge } from './pixelart.js';
import { stampFace } from './santaface.js';

const W = 150;
const H = 230;
const FEET = { x: 75, y: 222 };
const ART_K = 0.24; // art pixels per model unit (chunky arcade pixels)
const cache = new Map();
const factor = (scale) => Math.max(1, Math.round(scale / 2));
const RED = (g, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, '#ff5b6c'], [0.5, '#d61f35'], [1, '#7a0a1a']]);
const FUR = (g, y0, y1) => lin(g, 0, y0, 0, y1, [[0, '#ffffff'], [1, '#e2d6c4']]);

// A thick arm from the shoulder (x1, y1) to the hand (x2, y2).
function arm(g, x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const w = 11;
  const dx = Math.cos(a) * w;
  const dy = Math.sin(a) * w;
  shape(g, (gg) => { gg.moveTo(x1 + dx, y1 + dy); gg.lineTo(x2 + dx * 0.8, y2 + dy * 0.8); gg.lineTo(x2 - dx * 0.8, y2 - dy * 0.8); gg.lineTo(x1 - dx, y1 - dy); gg.closePath(); },
    RED(g, x1, y1, x2, y2), 3, 'coat');
  shape(g, (gg) => gg.arc(x2 - (x2 - x1) * 0.08, y2 - (y2 - y1) * 0.08, 9, 0, Math.PI * 2), FUR(g, y2 - 9, y2 + 9), 2.5, 'fur'); // cuff
  shape(g, (gg) => gg.arc(x2 + (x2 - x1) * 0.12, y2 + (y2 - y1) * 0.12, 9, 0, Math.PI * 2), lin(g, x2 - 9, y2 - 9, x2 + 9, y2 + 9, [[0, '#8a5a3a'], [1, '#3a2014']]), 2.5); // glove
}

const ARMS = {
  ok: [[[36, 112], [40, 146]], [[114, 112], [138, 72]]],
  ok1: [[[36, 112], [40, 146]], [[114, 112], [128, 64]]],
  happy: [[[36, 112], [10, 66]], [[114, 112], [140, 66]]],
  happy1: [[[36, 112], [16, 58]], [[114, 112], [134, 58]]],
  sad: [[[36, 112], [26, 172]], [[114, 112], [124, 172]]],
  sad1: [[[36, 112], [26, 174]], [[114, 112], [124, 174]]],
};

function body(g, pose, frame) {
  // legs and boots
  for (const x of [46, 80]) {
    shape(g, (gg) => gg.rect(x, 168, 26, 36), RED(g, x, 168, x + 26, 204), 3, 'coat');
    shape(g, (gg) => gg.rect(x - 3, 194, 32, 10), FUR(g, 194, 204), 2.5, 'fur');
    shape(g, (gg) => { gg.moveTo(x - 4, 204); gg.lineTo(x + 28, 204); gg.bezierCurveTo(x + 34, 210, x + 36, 222, x + 26, 222); gg.lineTo(x - 4, 222); gg.closePath(); },
      lin(g, 0, 204, 0, 222, [[0, '#4a3a44'], [1, '#0e070c']]), 3);
  }
  // the sad pose slumps a little
  const slump = pose === 'sad' ? 6 : 0;
  g.save();
  g.translate(0, slump);
  // coat: a round belly
  shape(g, (gg) => gg.ellipse(75, 138, 52, 46, 0, 0, Math.PI * 2), RED(g, 30, 96, 126, 182), 4, 'coat');
  shape(g, (gg) => { gg.moveTo(26, 166); gg.bezierCurveTo(50, 182, 100, 182, 124, 166); gg.lineTo(122, 180); gg.bezierCurveTo(100, 194, 50, 194, 28, 180); gg.closePath(); },
    FUR(g, 166, 194), 3, 'fur'); // hem
  shape(g, (gg) => gg.rect(69, 100, 12, 74), FUR(g, 100, 174), 2, 'fur'); // front trim
  shape(g, (gg) => gg.rect(25, 140, 100, 13), '#1c1018', 2); // belt
  shape(g, (gg) => gg.rect(63, 136, 24, 21), lin(g, 0, 136, 0, 157, [[0, '#fff1a8'], [1, '#c98a14']]), 2);
  g.fillStyle = '#1c1018';
  g.fillRect(70, 142, 10, 9);
  for (const [[x1, y1], [x2, y2]] of ARMS[pose + (frame ? '1' : '')] || ARMS[pose]) arm(g, x1, y1, x2, y2);
  face(g, pose, frame);
  g.restore();
}

function face(g, pose, frame) {
  const sad = pose === 'sad';
  const happy = pose === 'happy';
  shape(g, (gg) => gg.arc(75, 70, 22, 0, Math.PI * 2), lin(g, 50, 44, 100, 94, [[0, '#ffd9bd'], [1, '#e8a27c']]), 3);
  g.fillStyle = 'rgba(255,255,255,0.5)'; // shiny bald top: he lost his hat!
  g.beginPath(); g.ellipse(66, 50, 9, 4, -0.3, 0, Math.PI * 2); g.fill();
  // (hair, eyes, nose and beard come from the hand-made pixel face in santaface.js)
  // cheeks
  g.fillStyle = happy ? 'rgba(255,70,90,0.85)' : 'rgba(255,105,130,0.75)'; // round pink blush, under the eyes
  for (const x of [55, 95]) { g.beginPath(); g.ellipse(x, 77, 7, 5, 0, 0, Math.PI * 2); g.fill(); }
  // beard
  shape(g, (gg) => {
    gg.moveTo(50, 74); gg.bezierCurveTo(46, 100, 58, 124, 75, 128); gg.bezierCurveTo(92, 124, 104, 100, 100, 74);
    gg.bezierCurveTo(92, 84, 82, 82, 75, 80); gg.bezierCurveTo(68, 82, 58, 84, 50, 74);
  }, FUR(g, 74, 128), 3, 'hair');
  // mouth
  if (happy) {
    shape(g, (gg) => gg.ellipse(75, 98, 11, 10 - frame * 3, 0, 0, Math.PI * 2), '#3a0a14', 2.5);
    g.fillStyle = '#e8435a'; g.beginPath(); g.ellipse(75, 103 - frame, 7, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(67, 89 + frame * 2, 16, 3);
  } else if (sad) {
    g.strokeStyle = '#3a0a14'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(66, 100); g.quadraticCurveTo(75, 91, 84, 100); g.stroke();
  } else {
    shape(g, (gg) => { gg.moveTo(66, 91); gg.quadraticCurveTo(75, 104, 84, 91); gg.closePath(); }, '#3a0a14', 2.5); // open happy smile
    g.fillStyle = '#e8435a'; g.beginPath(); g.ellipse(75, 97, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
  }
  // moustache and nose
  shape(g, (gg) => { gg.moveTo(75, 83); gg.bezierCurveTo(68, 79, 57, 80, 53, 87); gg.bezierCurveTo(61, 87, 69, 89, 75, 87); gg.bezierCurveTo(81, 89, 89, 87, 97, 87); gg.bezierCurveTo(93, 80, 82, 79, 75, 83); },
    '#ffffff', 2.5, 'hair');
  shape(g, (gg) => gg.ellipse(75, 77, 5, 4.5, 0, 0, Math.PI * 2), '#ff8f8f', 2);
  // eyes and eyebrows
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 3.5;
  for (const x of [64, 86]) {
    if (happy) { g.beginPath(); g.moveTo(x - 5, 66); g.quadraticCurveTo(x, 59, x + 5, 66); g.stroke(); } // ^ ^
    // open eyes: the hand-made pixel face (santaface.js) is drawn over this
  }
  g.strokeStyle = '#f2ebe0'; g.lineWidth = 4;
  if (sad) { // brows up in the middle
    g.beginPath(); g.moveTo(56, 58); g.lineTo(67, 55); g.moveTo(94, 58); g.lineTo(83, 55); g.stroke();
    g.fillStyle = '#7fd4ff'; // a tear
    g.beginPath(); g.ellipse(89, 76 + frame * 4, 3, 4.5, 0, 0, Math.PI * 2); g.fill();
  }
}

function standCanvas(pose, frame, scale) {
  const key = `${pose}|${frame}|${scale}`;
  if (!cache.has(key)) {
    const paint = (g) => body(g, pose, frame);
    const art = pixelate(canvasFor(ART_K * 10, W, H, paint));
    texture(art, canvasFor(ART_K * 10, W, H, (g) => paint(maskCtx(g))));
    // the hand-made pixel face over the head (head centre x 75, top y 42 in the model)
    stampFace(art, (PAD + 75) * ART_K - 8, (PAD + 42 + (pose === 'sad' ? 6 : 0)) * ART_K, pose);
    cache.set(key, enlarge(art, factor(scale)));
  }
  return cache.get(key);
}

// Draws standing Santa with his feet at (x, feetY).
export function drawStandingSanta(ctx, x, feetY, pose = 'ok', frame = 0, scale = 4) {
  const img = standCanvas(pose, frame, scale);
  const px = ART_K * factor(scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x - (PAD + FEET.x) * px), Math.round(feetY - (PAD + FEET.y) * px));
  ctx.restore();
}
