// sprites.js: chunky pixel art made from text maps (A1). One letter = one pixel colour, '.' = empty.
// Used by the game, the title screen and the prize tiles.

const COLORS = {
  R: '#ff3b4f', D: '#b81d33', W: '#f4f7ff', w: '#c9d2f0', S: '#ffc9a0', P: '#ff8fa0', K: '#07051c',
  Y: '#ffd23f', y: '#b37c00', G: '#3dff8b', g: '#12924a', B: '#8a4b22', b: '#5a2e12',
  C: '#d99a55', c: '#8a5a2b', I: '#27c8ff', i: '#127fa8', V: '#c35cff',
};

export const SANTA = [
  '...........RRRRRR.........',
  '..........RRRRRRRR........',
  '..WW....DRRRRRRRRRR.......',
  '.WWWWRRRRRRRRRRRRRR.......',
  '..WW...WWWWWWWWWWWWW......',
  '.......WSSSSSSKSSSS.......',
  '..bb...WSSSSSSSSSPPS......',
  '.bBBb..WWWWWWWWWWWW.......',
  'bBBBBb.WWWWWWWWWWWWW......',
  'bBBBBbRWWWWWWWWWWWWRR.SS..',
  'bBBBBRRRWWWWWWWWWWRRRRSS..',
  '.bBBbRRRRRWWWWWWRRRRRR....',
  '..bbRRRRRRKKYYKKRRRRR.....',
  'gYgggggggggggggggggggggYg.',
  '.gGGGGGGGGGGGGGGGGGGGGGg..',
  '..gGGGYYYGGGGGGGGYYYGGg...',
  '...ggggggggggggggggggg....',
  '....Y......Y......Y....Y..',
  '..YYYYYYYYYYYYYYYYYYYYYYY.',
  '.........................Y',
];

export const ICONS = {
  cookie: [
    '....cccccccc....', '...cCCCCCCCCc...', '..cCCKCCCCCCCc..', '.cCCCCCCCKCCCCc.',
    'cCCCCCCCCCCCCCCc', 'cCCKCCCCCCCCKCCc', 'cCCCCCCKCCCCCCCc', 'cCCCCCCCCCCCCCCc',
    'cCKCCCCCCCCKCCCc', 'cCCCCCCKCCCCCCCc', 'cCCCCCCCCCCCCKCc', '.cCCCKCCCCCCCCc.',
    '..cCCCCCCCKCCc..', '...cCCCCCCCCc...', '....cccccccc....', '................',
  ],
  token: [
    '.....yyyyyy.....', '...yyYYYYYYyy...', '..yYYYYYYYYYYy..', '.yYYYYYWYYYYYYy.',
    '.yYYYYWWWYYYYYy.', 'yYYYYYWWWYYYYYYy', 'yYYWWWWWWWWWYYYy', 'yYYYWWWWWWWYYYYy',
    'yYYYYWWWWWYYYYYy', 'yYYYYWWYWWYYYYYy', '.yYYWWYYYWWYYYy.', '.yYYWYYYYYWYYYy.',
    '..yYYYYYYYYYYy..', '...yyYYYYYYyy...', '.....yyyyyy.....', '................',
  ],
  sticker: [
    'IIIIIIIIIIII....', 'IWWWWWWWWWWIi...', 'IWWWRRRRWWWIii..', 'IWWRRRRRRWWIiii.',
    'IWRRWRRWRRWIIIII', 'IWRRRRRRRRWWWWWI', 'IWRRRRRRRRWWWWWI', 'IWWRRWWRRWWWWWWI',
    'IWWWRRRRWWWWWWWI', 'IWWWWWWWWWWWWWWI', 'IWWVVWWWWWWVVWWI', 'IWWWWWWWWWWWWWWI',
    'IWWWWWWVVVWWWWWI', 'IWWWWWWWWWWWWWWI', 'IIIIIIIIIIIIIIII', '................',
  ],
  free: [
    '......RRR.......', '.....RRRRR......', '....RRRRRRR.WW..', '...RRRRRRRRRWW..',
    '..WWWWWWWWWW....', '................', '...GG.....GGG...', '...GG....GGGG...',
    '.GGGGGG.GG.GG...', '.GGGGGG....GG...', '...GG......GG...', '...GG......GG...',
    '...........GG...', '.........GGGGGG.', '.........GGGGGG.', '................',
  ],
};

const cache = new Map();

// Returns a canvas with the pixel map drawn at `scale` pixels per pixel.
export function spriteCanvas(map, scale = 4, tint = null) {
  const key = `${map[0]}|${map.length}|${scale}|${tint}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = map[0].length * scale;
  c.height = map.length * scale;
  const g = c.getContext('2d');
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = tint || COLORS[ch] || '#f0f';
      g.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  cache.set(key, c);
  return c;
}

// Draws Santa centred on (x, y), tilted by `angle` radians, with a dark outline for contrast.
export function drawSanta(ctx, x, y, angle = 0, scale = 4) {
  const img = spriteCanvas(SANTA, scale);
  const sh = spriteCanvas(SANTA, scale, '#07051c');
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  const ox = -img.width / 2;
  const oy = -img.height / 2;
  for (const [dx, dy] of [[-scale, 0], [scale, 0], [0, -scale], [0, scale]]) ctx.drawImage(sh, ox + dx, oy + dy);
  ctx.drawImage(img, ox, oy);
  ctx.restore();
}

export function iconCanvas(name, scale = 10) {
  return spriteCanvas(ICONS[name] || ICONS.sticker, scale);
}
