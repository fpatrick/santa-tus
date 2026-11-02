// santaface.js: Santa's faces as hand-made pixel sprites (the model face is too small to convert well).
// Art direction: the classic jolly Santa (the warm 1930s advertising-painting style): a round bald head,
// rosy round cheeks and nose, small happy eyes, a big curly moustache with a smile under it, and a big
// full white beard that flows from the hair down over the chest, with soft blue-grey shading (no black
// lines inside the beard) and a wavy, tufted bottom edge so it never looks cut off.
// Front view (crash scene, hat lost): 24 x 21, moods ok / happy / sad. Side view (sleigh): 20 x 17.

const PAL = {
  o: [26, 10, 20], s: [246, 202, 164], S: [222, 166, 128], h: [255, 236, 214], w: [255, 255, 255],
  g: [222, 228, 242], G: [182, 192, 218], e: [44, 26, 30], p: [255, 132, 150], n: [236, 104, 104],
  m: [110, 24, 40], t: [232, 80, 96], b: [127, 212, 255],
};

const FRONT = {
  ok: [
    '.........oooooo.........',
    '.......oohhssssoo.......',
    '......oshhssssssso......',
    '.....osssssssssssso.....',
    '....owwsssssssssswwo....',
    '...owwwsssssssssswwwo...',
    '...owwssessssssesswwo...',
    '...owwssessssssesswwo...',
    '...owwsppssnnssppswwo...',
    '..owwwgwwwgnngwwwgwwwo..',
    '.owwwGGGwwwggwwwGGGwwwo.',
    '.owgwwwwwmttttmwwwwwgwo.',
    'owwgwwwwwwmmmmwwwwwwgwwo',
    'owwGgwwwwGgwwgGwwwwgGwwo',
    'owwwwGgwwwwwwwwwwgGwwwwo',
    '.owGgwwwwGgwwgGwwwwgGwo.',
    '..owwwGgwwwwwwwwgGwwwo..',
    '...owGgwwwGggGwwwgGwo...',
    '...oowwGgwwwwwwgGwwoo...',
    '.....owwwoowwoowwwo.....',
    '......ooo..oo..ooo......',
  ],
  happy: [
    '.........oooooo.........',
    '.......oohhssssoo.......',
    '......oshhssssssso......',
    '.....osssssssssssso.....',
    '....owwsssssssssswwo....',
    '...owwwsssssssssswwwo...',
    '...owwssessssssesswwo...',
    '...owwsesesssseseswwo...',
    '...owwsppssnnssppswwo...',
    '..owwwgwwwgnngwwwgwwwo..',
    '.owwwGGGwwwggwwwGGGwwwo.',
    '.owgwwwwmttttttmwwwwgwo.',
    'owwgwwwwwmmmmmmwwwwwgwwo',
    'owwGgwwwwGgwwgGwwwwgGwwo',
    'owwwwGgwwwwwwwwwwgGwwwwo',
    '.owGgwwwwGgwwgGwwwwgGwo.',
    '..owwwGgwwwwwwwwgGwwwo..',
    '...owGgwwwGggGwwwgGwo...',
    '...oowwGgwwwwwwgGwwoo...',
    '.....owwwoowwoowwwo.....',
    '......ooo..oo..ooo......',
  ],
  sad: [
    '.........oooooo.........',
    '.......oohhssssoo.......',
    '......oshhssssssso......',
    '.....osssssssssssso.....',
    '....owwsssssssssswwo....',
    '...owwwssgssssgsswwwo...',
    '...owwssessssssesswwo...',
    '...owwssessssssesswwo...',
    '...owwsppssnnssbpswwo...',
    '..owwwgwwwgnngwbwgwwwo..',
    '.owwwGGGwwwggwwwGGGwwwo.',
    '.owgwwwwwwwmmwwwwwwwgwo.',
    'owwgwwwwwwmwwmwwwwwwgwwo',
    'owwGgwwwwGgwwgGwwwwgGwwo',
    'owwwwGgwwwwwwwwwwgGwwwwo',
    '.owGgwwwwGgwwgGwwwwgGwo.',
    '..owwwGgwwwwwwwwgGwwwo..',
    '...owGgwwwGggGwwwgGwo...',
    '...oowwGgwwwwwwgGwwoo...',
    '.....owwwoowwoowwwo.....',
    '......ooo..oo..ooo......',
  ],
};

// Side view, facing right: hat brim, white hair at the back flowing into the sideburn and the beard,
// round cheek, eye, nose, curly moustache, beard over the chest with a wavy bottom.
const SIDE = {
  0: [
    '.owwwwwwwwwwwwwwwwo.',
    '.owggwwwwwwwwwwgggo.',
    '.owwwssssssssssssso.',
    '..owwSsssssssssssso.',
    '..owwSSssssssesssso.',
    '..owwwSssssssessspno',
    '..owwwwssssppssssnno',
    '..owwwwwsswwwwwwwwwo',
    '..owwwwwGwGGGwmmGGo.',
    '..owwwGwwwwwwwwwwwo.',
    '..owwGgwwwwGgwwwwo..',
    '...owwwwgGwwwwgGwo..',
    '...owGgwwwwwGgwwo...',
    '....owwwgGwwwwwo....',
    '.....owwwwwgGwo.....',
    '.....oowwoowwoo.....',
    '......oo..oo........',
  ],
  1: [
    '.owwwwwwwwwwwwwwwwo.',
    '.owggwwwwwwwwwwgggo.',
    '.owwwssssssssssssso.',
    '..owwSsssssssssssso.',
    '..owwSSssssssesssso.',
    '..owwwSsssssesespno.',
    '..owwwwssssppssssnno',
    '..owwwwwsswwwwwwwwwo',
    '..owwwwwGwGGGmmmmGo.',
    '..owwwGwwwwwwmttmwo.',
    '..owwGgwwwwGgwwwwo..',
    '...owwwwgGwwwwgGwo..',
    '...owGgwwwwwGgwwo...',
    '....owwwgGwwwwwo....',
    '.....owwwwwgGwo.....',
    '.....oowwoowwoo.....',
    '......oo..oo........',
  ],
  bald: [
    '...oooooooooooooo...',
    '..oshhhsssssssssso..',
    '.owwwssssssssssssso.',
    '..owwSsssssssssssso.',
    '..owwSSssssssesssso.',
    '..owwwSsssssesespno.',
    '..owwwwssssppssssnno',
    '..owwwwwsswwwwwwwwwo',
    '..owwwwwGwGGGmmmmGo.',
    '..owwwGwwwwwwmttmwo.',
    '..owwGgwwwwGgwwwwo..',
    '...owwwwgGwwwwgGwo..',
    '...owGgwwwwwGgwwo...',
    '....owwwgGwwwwwo....',
    '.....owwwwwgGwo.....',
    '.....oowwoowwoo.....',
    '......oo..oo........',
  ],
};
SIDE[2] = SIDE[1];

function paint(c, rows, x0, y0) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = `rgb(${PAL[ch].join(',')})`;
    g.fillRect(Math.round(x0) + x, Math.round(y0) + y, 1, 1);
  }));
}

// Front face with its top-left at (x0, y0) in art pixels.
export function stampFace(c, x0, y0, mood = 'ok') {
  paint(c, FRONT[mood] || FRONT.ok, x0, y0);
}

// Side face with its top-left at (x0, y0). mouth 0 = smile, 1/2 = laughing; bald = hat lost (crash).
export function stampSideFace(c, x0, y0, mouth = 0, bald = false) {
  paint(c, bald ? SIDE.bald : SIDE[mouth] || SIDE[0], x0, y0);
}

export const FACE_SIZE = { w: 24, h: FRONT.ok.length };
