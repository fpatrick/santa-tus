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
  '.......WSSSSSSSSSPPS......',
  '.......WWWWWWWWWWWW.......',
  '.......WWWWWWWWWWWWW......',
  '......RWWWWWWWWWWWWRR.SS..',
  '.....RRRWWWWWWWWWWRRRRSS..',
  '.....RRRRRWWWWWWRRRRRR....',
  '....RRRRRRKKYYKKRRRRR.....',
  'gYgggggggggggggggggggggYg.',
  '.gGGGGGGGGGGGGGGGGGGGGGg..',
  '..gGGGYYYGGGGGGGGYYYGGg...',
  '...ggggggggggggggggggg....',
  '....Y......Y......Y....Y..',
  '..YYYYYYYYYYYYYYYYYYYYYYY.',
  '.........................Y',
];

// Santa's present bag (drawn behind him, grows with each chimney). "TUS" is written on it.
export const BAG = [
  '.....bbbb.....', '....bYYYYb....', '.....bBBb.....', '....bBBBBb....', '...bBBBBBBb...',
  '..bBBBBBBBBb..', '.bBBBBBBBBBBb.', 'bBBBBBBBBBBBBb', 'bBBBBBBBBBBBBb', 'bBBBBBBBBBBBBb',
  'bBBBBBBBBBBBBb', '.bBBBBBBBBBBb.', '..bbbbbbbbbb..',
];

export const ICONS = {
  ticket: [
    '................', '................', 'yYYYYYYYYYYYYYYy', 'YWWWWWYWWWWWWWWY',
    '.WWRWWYWWKKKKWW.', '.WRRRWYWWWWWWWW.', '.WWRWWYWWKKKWWW.', 'YWWWWWYWWWWWWWWY',
    'yYYYYYYYYYYYYYYy', '................', '................', '................',
  ],
  cash: [
    '................', '................', 'gGGGGGGGGGGGGGGg', 'gGGGGGGGGGGGGGGg',
    'gGGGGGYYYYGGGGGg', 'gGGGGYYyyYYGGGGg', 'gGGGGYyYYYYGGGGg', 'gGGGGYyYYYYGGGGg',
    'gGGGGYYyyYYGGGGg', 'gGGGGGYYYYGGGGGg', 'gGGGGGGGGGGGGGGg', 'gGGGGGGGGGGGGGGg',
  ],
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

// A sprite with its dark outline baked in (one image, so the outline never flickers when it turns).
function outlinedCanvas(map, scale) {
  const key = `outlined|${map[0]}|${map.length}|${scale}`;
  if (cache.has(key)) return cache.get(key);
  const img = spriteCanvas(map, scale);
  const sh = spriteCanvas(map, scale, '#07051c');
  const c = document.createElement('canvas');
  c.width = img.width + scale * 2;
  c.height = img.height + scale * 2;
  const g = c.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(sh, dx * scale, dy * scale);
  g.drawImage(img, scale, scale);
  cache.set(key, c);
  return c;
}

function bagCanvas(scale) {
  const key = `bag|${scale}`;
  if (cache.has(key)) return cache.get(key);
  const c = outlinedCanvas(BAG, scale);
  const g = c.getContext('2d');
  g.font = `${scale * 3}px "Press Start 2P"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#07051c';
  g.fillText('TUS', c.width / 2 + scale / 2, c.height * 0.62 + scale / 2);
  g.fillStyle = '#ffd23f';
  g.fillText('TUS', c.width / 2, c.height * 0.62);
  cache.set(key, c);
  return c;
}

// Draws Santa centred on (x, y), tilted by `angle` radians. bag = size of his bag (1 = normal).
export function drawSanta(ctx, x, y, angle = 0, scale = 4, bag = 1) {
  const img = outlinedCanvas(SANTA, scale);
  const sack = bagCanvas(scale);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = true; // smooth turning, no shimmer
  ctx.imageSmoothingQuality = 'high';
  // the bag sits behind Santa, its bottom-right corner fixed on the sleigh
  const bx = -img.width / 2 + 8 * scale;
  const by = img.height / 2 - 6 * scale;
  ctx.drawImage(sack, bx - sack.width * bag, by - sack.height * bag, sack.width * bag, sack.height * bag);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

export function iconCanvas(name, scale = 10) {
  return spriteCanvas(ICONS[name] || ICONS.sticker, scale);
}
