// prizeicons.js: the sponsor prize icons for the wheel slices (A2, A8): what the player really wins, in the tier's
// colour. 'voucher' = GOLD €20 gift card, 'gamepad' = SILVER gaming voucher or day out, 'gift' = BRONZE present.
// Drawn with shapes on the 36 x 36 grid of wheelicons.js, which snaps them to hard pixels and adds the outline.
// Light from the top-left (A4): light shade top-left, dark shade bottom-right, a white highlight pixel.

const lin = (g, x0, y0, x1, y1, stops) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
};
const px = (g, c, pts) => { g.fillStyle = c; for (const [x, y] of pts) g.fillRect(x, y, 1, 1); };
// hand-placed pixel letters (A8): rows of '#'
const glyph = (g, c, x, y, rows) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') px(g, c, [[x + i, y + j]]); }));
const EURO = ['..###', '.#...', '####.', '.#...', '####.', '.#...', '..###'];
const TWO = ['###', '..#', '###', '#..', '###'];
const ZERO = ['###', '#.#', '#.#', '#.#', '###'];

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

// GOLD: a gold gift card with "€20", a dark magnetic stripe and a small red bow on the corner.
export function voucher(g) {
  g.fillStyle = '#7a4a00'; // edge
  roundRect(g, 1, 9, 34, 23, 3); g.fill();
  g.fillStyle = lin(g, 2, 10, 34, 31, [[0, '#fff6c8'], [0.35, '#ffd23f'], [1, '#c48a00']]);
  roundRect(g, 2, 10, 32, 21, 2.5); g.fill();
  g.fillStyle = '#8a5a00'; g.fillRect(2, 13, 32, 3); // the stripe
  glyph(g, '#7a1020', 7, 19, EURO); // "€20" in hand-placed pixels, dark red on gold
  glyph(g, '#7a1020', 14, 20, TWO);
  glyph(g, '#7a1020', 18, 20, ZERO);
  g.fillStyle = '#d61f35'; // the bow on the top-right corner
  g.beginPath(); g.moveTo(28, 7); g.lineTo(22, 2); g.lineTo(22, 11); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(28, 7); g.lineTo(34, 2); g.lineTo(34, 11); g.closePath(); g.fill();
  g.fillStyle = '#7a0a1a'; g.fillRect(27, 6, 3, 3);
  px(g, '#ff8a96', [[23, 4], [24, 5]]);
  px(g, '#ffffff', [[4, 11], [5, 11]]);
}

// SILVER: a silver game controller: a d-pad on the left, red and green buttons on the right.
export function gamepad(g) {
  g.fillStyle = '#3a4258'; // edge and shadow
  g.beginPath();
  g.ellipse(9, 22, 7.5, 9, -0.35, 0, Math.PI * 2); g.ellipse(27, 22, 7.5, 9, 0.35, 0, Math.PI * 2); g.fill();
  roundRect(g, 6, 10, 24, 14, 6); g.fill();
  const body = lin(g, 4, 9, 30, 32, [[0, '#ffffff'], [0.45, '#c8d2e6'], [1, '#6a7690']]);
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(9, 21.5, 6.5, 8, -0.35, 0, Math.PI * 2); g.ellipse(27, 21.5, 6.5, 8, 0.35, 0, Math.PI * 2); g.fill();
  roundRect(g, 7, 11, 22, 12, 5); g.fill();
  g.fillStyle = '#2a3044'; // the d-pad
  g.fillRect(8, 15, 7, 3); g.fillRect(10, 13, 3, 7);
  g.fillStyle = '#d61f35'; g.fillRect(24, 13, 3, 3); // buttons
  g.fillStyle = '#1f9e55'; g.fillRect(27, 16, 3, 3);
  g.fillStyle = '#ffd23f'; g.fillRect(21, 16, 3, 3);
  g.fillStyle = '#27c8ff'; g.fillRect(24, 19, 3, 3);
  g.fillStyle = '#6a7690'; g.fillRect(16, 17, 2, 1); g.fillRect(19, 17, 2, 1); // select / start
  px(g, '#ffffff', [[9, 12], [10, 12], [24, 13]]);
}

// BRONZE: a wrapped present in bronze-orange paper with a green ribbon and a bow on top.
export function gift(g) {
  g.fillStyle = '#4a2008'; // edge
  g.fillRect(6, 14, 24, 20); g.fillRect(4, 10, 28, 7);
  g.fillStyle = lin(g, 7, 15, 29, 33, [[0, '#ffd0a0'], [0.4, '#d9733a'], [1, '#7a3a10']]); // the box
  g.fillRect(7, 16, 22, 17);
  g.fillStyle = lin(g, 5, 11, 31, 16, [[0, '#ffd0a0'], [0.5, '#e8884a'], [1, '#9a4a18']]); // the lid
  g.fillRect(5, 11, 26, 5);
  g.fillStyle = '#1f9e55'; // ribbon
  g.fillRect(16, 11, 4, 22);
  g.fillStyle = '#5ad08a'; g.fillRect(16, 11, 1, 22);
  g.fillStyle = '#1f9e55'; // the bow: two loops and two tails
  g.beginPath(); g.ellipse(13, 7, 5, 3.4, 0.35, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(23, 7, 5, 3.4, -0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0c5a2c'; g.beginPath(); g.ellipse(13, 7, 2, 1.3, 0.35, 0, Math.PI * 2); g.ellipse(23, 7, 2, 1.3, -0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#12924a'; g.fillRect(16, 7, 4, 4);
  px(g, '#5ad08a', [[10, 5], [11, 5], [21, 5]]);
  g.fillStyle = 'rgba(90,30,0,0.35)'; g.fillRect(7, 16, 22, 1); // lid shadow
  px(g, '#fff0d8', [[8, 17], [6, 12]]);
}
