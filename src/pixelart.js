// pixelart.js: turns a smooth drawing into pixel art: hard edges, fewer colours, a 1-pixel dark outline,
// a tiny 3x5 pixel font, and enlarging with square pixels. Used by santa.js.

const INK_RGB = [26, 10, 20];
const FONT = { // 3 x 5 pixel letters for the bag patch
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  S: ['###', '#..', '###', '..#', '###'],
};

export function pixelate(c) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const q = (v) => Math.min(255, Math.round(v / 48) * 48); // few shades = arcade colour bands
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
    const a = d[i + 3] / 255; // undo the soft edge, then snap the colour
    d[i] = q(d[i] / a); d[i + 1] = q(d[i + 1] / a); d[i + 2] = q(d[i + 2] / a); d[i + 3] = 255;
  }
  const w = c.width;
  const h = c.height;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
  const add = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push((y * w + x) * 4);
    }
  }
  for (const i of add) { d[i] = INK_RGB[0]; d[i + 1] = INK_RGB[1]; d[i + 2] = INK_RGB[2]; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}

export function stampText(c, text, cx, cy, size, color, shadow) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); // the model drawing left a scale on this context
  const w = text.length * 4 * size - size;
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - (5 * size) / 2);
  [...text].forEach((ch, k) => {
    FONT[ch].forEach((row, y) => [...row].forEach((on, x) => {
      if (on !== '#') return;
      const px = x0 + (k * 4 + x) * size;
      const py = y0 + y * size;
      g.fillStyle = shadow;
      g.fillRect(px + size, py + size, size, size);
      g.fillStyle = color;
      g.fillRect(px, py, size, size);
    }));
  });
}

// Embroidery: a stitch map ('#' = thread) stitched onto the art, centred on (cx, cy), `size` art pixels per
// 10 cells (it grows with the bag). Gold satin stitches with a light top edge and a shaded bottom edge,
// on a dark thread outline. Pixels where `cover` (a mask canvas, same size as the art) is drawn are left alone.
const THREAD = { light: [255, 233, 160], main: [242, 199, 90], stitch: [214, 166, 62], shade: [168, 116, 36], edge: [62, 26, 10] };
export function stampEmbroidery(c, map, cx, cy, size, cover) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const mask = cover ? cover.getContext('2d').getImageData(0, 0, c.width, c.height).data : null;
  const w = Math.max(map[0].length, Math.round(map[0].length * size));
  const h = Math.round((w * map.length) / map[0].length);
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && map[Math.floor((y * map.length) / h)][Math.floor((x * map[0].length) / w)] === '#';
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const X = x0 + x;
      const Y = y0 + y;
      if (X < 0 || Y < 0 || X >= c.width || Y >= c.height) continue;
      const i = (Y * c.width + X) * 4;
      if (d[i + 3] < 255 || (mask && mask[i + 3] >= 120)) continue; // off the sack, or under a rope
      let col = null;
      if (on(x, y)) {
        if (!on(x, y - 1)) col = THREAD.light;
        else if (!on(x, y + 1)) col = THREAD.shade;
        else col = (x - y + 99) % 3 === 0 ? THREAD.stitch : THREAD.main; // slanted satin stitches
      } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) col = THREAD.edge;
      if (col) [d[i], d[i + 1], d[i + 2]] = col;
    }
  }
  g.putImageData(img, 0, 0);
}

export function enlarge(src, f) {
  const c = document.createElement('canvas');
  c.width = src.width * f;
  c.height = src.height * f;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}


// Cloth textures, done pixel by pixel after the pixel-art step. mask = same size canvas where the
// hat is red, the coat green, fur blue and hair yellow (santa.js draws it).
export function texture(art, mask) {
  const g = art.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, art.width, art.height);
  const m = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
  const d = img.data;
  const shift = (i, v) => { d[i] = clamp(d[i] + v); d[i + 1] = clamp(d[i + 1] + v * 0.7); d[i + 2] = clamp(d[i + 2] + v * 0.7); };
  for (let y = 0; y < art.height; y++) {
    for (let x = 0; x < art.width; x++) {
      const i = (y * art.width + x) * 4;
      if (d[i + 3] !== 255 || d[i] + d[i + 1] + d[i + 2] < 110) continue; // empty or outline
      const r = m[i] > 128;
      const gr = m[i + 1] > 128;
      const b = m[i + 2] > 128;
      const h = (x * 37 + y * 91 + x * y * 7) % 11;
      if (r && !gr && !b) { // hat: knitted ribs
        if (x % 3 === 0) shift(i, -42);
        else if ((x + y) % 2 === 0 && y % 3 === 1) shift(i, 22);
      } else if (gr && !r && !b) { // coat: velvet weave
        if ((x + y) % 4 === 0) shift(i, -36);
        else if ((x - y + 1000) % 6 === 0) shift(i, 20);
      } else if (b && !r && !gr) { // fur: fluffy
        if (h < 2) shift(i, -34);
        else if (h === 5) shift(i, -18);
      } else if (r && gr && !b) { // hair: strands
        if (x % 2 === 0 && h % 3 === 0) shift(i, -30);
      }
    }
  }
  g.putImageData(img, 0, 0);
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

// A cute eye for a small sprite: a 1 x 2 dark-brown oval. Rules from cute pixel faces:
// no white around the eye (white = scary), no lashes or brows pressing on it (= angry),
// placed low and wide on the face, with pink blush on the cheeks (drawn in the model).
const EYE_RGB = [44, 26, 30];
export function stampEye(c, cx, cy) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgb(${EYE_RGB.join(',')})`;
  g.fillRect(Math.round(cx - 0.5), Math.round(cy - 1), 1, 2);
}
