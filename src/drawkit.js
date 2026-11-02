// drawkit.js: small drawing helpers for santa.js: gradients, outlined shapes with a material
// (for the texture mask), the mask context and a canvas sized for a model.

export const INK = '#1a0a14';
export const PAD = 12; // room for the outline and the runner curls

export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

// mat = the material, for the texture pass: 'hat', 'coat', 'fur' or 'hair' (nothing = no texture).
export function shape(g, draw, fill, line = 3, mat = '') {
  const raw = g.__raw || g;
  raw.beginPath();
  draw(raw);
  raw.fillStyle = g.__raw ? (MASK[mat] || '#000000') : fill;
  raw.fill();
  if (line) { raw.lineWidth = line; raw.strokeStyle = g.__raw ? '#000000' : INK; raw.stroke(); }
}

// Mask drawing: every shape is painted in its material colour, everything else black.
// The texture pass reads it to know which art pixels are hat, coat, fur or hair.
export const MASK = { hat: '#ff0000', coat: '#00ff00', fur: '#0000ff', hair: '#ffff00' };
export function maskCtx(raw) {
  return new Proxy(raw, {
    get(t, p) { if (p === '__raw') return t; const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; },
    set(t, p, v) { t[p] = p === 'fillStyle' || p === 'strokeStyle' ? '#000000' : v; return true; },
  });
}

export function canvasFor(scale, wu, hu, paint) {
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
