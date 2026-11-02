// santaface.js: Santa's face and beard seen from the front, drawn by hand pixel by pixel (16 x 20 art pixels).
// The automatic pixel converter makes small faces noisy, so the face is a clean hand-made sprite.
// Art direction (cute pixel faces): a round bald head with white hair puffs at the sides, small dark
// 1 x 2 eyes placed wide apart, no white around the eyes and no low brows (those look scary or angry),
// round pink blush under the eyes, a small pink nose, a white moustache and a soft smile.
// Moods: ok (smile), happy (^ ^ eyes, open laughing mouth), sad (frown and a tear).

const PAL = {
  o: [26, 10, 20], s: [244, 200, 160], h: [255, 236, 214], w: [255, 255, 255], g: [222, 214, 204],
  e: [44, 26, 30], p: [255, 138, 160], n: [240, 120, 120], m: [90, 16, 32], t: [232, 67, 90], b: [127, 212, 255],
};

const TOP = [
  '....oooooooo....',
  '...oshhsssssso..',
  '.oowsssssssswoo.',
  'owwwsssssssswwwo',
];
const BEARD = [
  'owwwwwwwwwwwwwwo',
  'owgwwwwwwwwwwgwo',
  'owgwwwwwwwwwwgwo',
  '.owgwwwwwwwwgwo.',
  '.owwgwwwwwwgwwo.',
  '..owwwwwwwwwwo..',
  '...owwggggwwo...',
  '....oowwwwoo....',
  '......oooo......',
];
const FACES = {
  ok: [
    'owwssessssesswwo',
    'owwssessssesswwo',
    'owwppssnnssppwwo',
    'oowwwwwnnwwwwwoo',
    'owwwwwmmmmwwwwwo',
    'owwwwwwttwwwwwwo',
    'owwwwwwwwwwwwwwo',
  ],
  happy: [
    'owwssessssesswwo',
    'owwsesesseseswwo',
    'owwppssnnssppwwo',
    'oowwwwwnnwwwwwoo',
    'owwwwmmmmmmwwwwo',
    'owwwwmttttmwwwwo',
    'owwwwwmmmmwwwwwo',
  ],
  sad: [
    'owwssssssssssswo',
    'owwssessssesswwo',
    'owwppessssebpwwo',
    'oowwwwwnnwwwwboo',
    'owwwwwwmmwwwwwwo',
    'owwwwwmwwmwwwwwo',
    'owwwwwwwwwwwwwwo',
  ],
};

// Draws the face into an art canvas (1 art pixel = 1 canvas pixel) with its top-left at (x0, y0).
export function stampFace(c, x0, y0, mood = 'ok') {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  [...TOP, ...(FACES[mood] || FACES.ok), ...BEARD].forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = `rgb(${PAL[ch].join(',')})`;
    g.fillRect(Math.round(x0) + x, Math.round(y0) + y, 1, 1);
  }));
}

export const FACE_SIZE = { w: 16, h: TOP.length + FACES.ok.length + BEARD.length };

// Santa's face from the side, in the sleigh (facing right), 20 x 17 art pixels: the fur brim of the hat,
// white hair at the back, a round cheek with one small eye, pink blush, a round nose and a soft beard.
// Laughing: ^ eye and an open mouth in the beard.
const SIDE = {
  0: [
    '.owwwwwwwwwwwwwwwwo.',
    '.owggwwwwwwwwwwgggo.',
    '.owwwsssssssssssso..',
    '.owwwsssssssssssso..',
    '.owwwssssssessssso..',
    '.owwwssssssesssssnno',
    '.owwwssppsssssssnnno',
    '.owwwwwwwwwwwwwwwwwo',
    '.owgwwwwwwwwwwwwwwo.',
    '.owgwwwwwwwwwwwwwo..',
    '..owgwwwwwwwwwwwo...',
    '..owggwwwwwwwwwwo...',
    '...owgwwwwwwwwwo....',
    '...owggwwwwwwwgo....',
    '....owwggwwwggo.....',
    '.....ooooooooo......',
  ],
  1: [
    '.owwwwwwwwwwwwwwwwo.',
    '.owggwwwwwwwwwwgggo.',
    '.owwwsssssssssssso..',
    '.owwwsssssssssssso..',
    '.owwwssssssessssso..',
    '.owwwsssssesesssnno.',
    '.owwwssppsssssssnnno',
    '.owwwwwwwwwwwwwwwwwo',
    '.owgwwwwwwwmmmmwwwo.',
    '.owgwwwwwwwmttmwwo..',
    '..owgwwwwwwwmmwwo...',
    '..owggwwwwwwwwwwo...',
    '...owgwwwwwwwwwo....',
    '...owggwwwwwwwgo....',
    '....owwggwwwggo.....',
    '.....ooooooooo......',
  ],
};
SIDE[2] = SIDE[1].map((r, i) => (i === 9 ? '.owgwwwwwwwmmmmwwo..' : i === 10 ? '..owgwwwwwwwwwwwo...' : r));

// Draws the side face and beard with its top-left at (x0, y0) in art pixels.
export function stampSideFace(c, x0, y0, mouth = 0) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  const rows = SIDE[mouth] || SIDE[0];
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const px = Math.round(x0) + x;
    const py = Math.round(y0) + y;
    if (ch === '.') return;
    g.fillStyle = `rgb(${PAL[ch].join(',')})`;
    g.fillRect(px, py, 1, 1);
  }));
}
