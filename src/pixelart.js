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
  const q = (v) => Math.min(255, Math.round(v / 36) * 36);
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

export function enlarge(src, f) {
  const c = document.createElement('canvas');
  c.width = src.width * f;
  c.height = src.height * f;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

