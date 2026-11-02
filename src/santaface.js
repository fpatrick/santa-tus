// santaface.js: Santa's faces as hand-made pixel sprites (the model face is too small to convert well).
// Art direction: a cartoon jolly Santa built from round shapes: a big round bald head with a shine, white hair
// puffs over the ears, small dark eyes, rosy cheeks, a round red nose sitting on a curly
// moustache, and a full cloud beard made of round puffs. Each puff is shaded on its own (light from the
// top-left, blue-grey underneath) so the beard reads as soft curls; it tapers to a soft rounded point.
// Front view (crash scene, hat lost): 28 x 28, moods ok / happy / sad. Side view (sleigh): 22 x 19 under the
// hat brim; the bald side view is BALD_LIFT rows taller (the round top of the head) and is drawn that much higher.
// The rows were made by a small shape-to-pixel script, then kept here as plain text so they are easy to edit.

const PAL = {
  o: [26, 10, 20], s: [246, 202, 164], S: [222, 166, 128], h: [255, 236, 214], w: [255, 255, 255],
  g: [222, 228, 242], G: [182, 192, 218], e: [44, 26, 30], p: [255, 132, 150], n: [236, 104, 104],
  m: [110, 24, 40], t: [232, 80, 96], b: [127, 212, 255], D: [140, 150, 196],
};

const FRONT = {
  ok: [
    '...........oooooo...........',
    '.........oossssssoo.........',
    '........oshsssssssso........',
    '.......ohhhhsssssssso.......',
    '......oshhhhssssssssso......',
    '......osshhhssssssssso......',
    '.....osssssssssssssssso.....',
    '....oossssssssssssssssoo....',
    '...owgssssssssssssssssgwo...',
    '..owwgssssssssssssssssgwwo..',
    '..owwgsssssesssssesssSgggo..',
    '..owwwggssseshnssessggwwGo..',
    '..owwwwwppssnnnnsssppwwwwo..',
    '..owwwwwppwwsnnswwwppwgwgo..',
    '..oggwwwwwwwwwwwwwwwwwggGo..',
    '...oGwwwwwwwggwwwwwggwwGo...',
    '....owgwgggGGGwgggGGGgGo....',
    '.....oDDDDDDmmmmDDDDDDo.....',
    '.....owggwwwwttwgggggGo.....',
    '.....ogwwwwwwwwwwwwwwGo.....',
    '......owwwwwwwwwwwwwwo......',
    '......owwwwwwwwwwgwggo......',
    '......owggwwwwwggggGGo......',
    '.......ogGwwwgggGGGGo.......',
    '........ooogwwwwGooo........',
    '...........owwggo...........',
    '...........oggGGo...........',
    '............oooo............',
  ],
  happy: [
    '...........oooooo...........',
    '.........oossssssoo.........',
    '........oshsssssssso........',
    '.......ohhhhsssssssso.......',
    '......oshhhhssssssssso......',
    '......osshhhssssssssso......',
    '.....osssssssssssssssso.....',
    '....oossssssssssssssssoo....',
    '...owgssssssssssssssssgwo...',
    '..owwgssssssssssssssssgwwo..',
    '..owwgsssssesssssesssSgggo..',
    '..owwwggssesehnsesesggwwGo..',
    '..owwwwwppssnnnnsssppwwwwo..',
    '..owwwwwppwwsnnswwwppwgwgo..',
    '..oggwwwwwwwwwwwwwwwwwggGo..',
    '...oGwwwwwwwggwwwwwggwwGo...',
    '....owgwgggGGGwgggGGGgGo....',
    '.....oDDDDDDmmmmmDDDDDo.....',
    '.....owggwwwmtttmggggGo.....',
    '.....ogwwwwwwmmmwwwwwGo.....',
    '......owwwwwwwwwwwwwwo......',
    '......owwwwwwwwwwgwggo......',
    '......owggwwwwwggggGGo......',
    '.......ogGwwwgggGGGGo.......',
    '........ooogwwwwGooo........',
    '...........owwggo...........',
    '...........oggGGo...........',
    '............oooo............',
  ],
  sad: [
    '...........oooooo...........',
    '.........oossssssoo.........',
    '........oshsssssssso........',
    '.......ohhhhsssssssso.......',
    '......oshhhhssssssssso......',
    '......osshhhssssssssso......',
    '.....osssssssssssssssso.....',
    '....oossssswssssswssssoo....',
    '...owgssswwssssssswwssgwo...',
    '..owwgssssssssssssssssgwwo..',
    '..owwgsssssesssssesssSgggo..',
    '..owwwggssseshnssessggwwGo..',
    '..owwwwwppssnnnnssbppwwwwo..',
    '..owwwwwgwwwsnnswwbgwwgwgo..',
    '..oggwwwwwwwwwwwwwwwwwggGo..',
    '...oGwwwwwwwggwwwwwggwwGo...',
    '....owgwgggGGGwgggGGGgGo....',
    '.....oDDDDDDDmmDDDDDDDo.....',
    '.....owggwwwmwwmgggggGo.....',
    '.....ogwwwwwwwwwwwwwwGo.....',
    '......owwwwwwwwwwwwwwo......',
    '......owwwwwwwwwwgwggo......',
    '......owggwwwwwggggGGo......',
    '.......ogGwwwgggGGGGo.......',
    '........ooogwwwwGooo........',
    '...........owwggo...........',
    '...........oggGGo...........',
    '............oooo............',
  ],
};

const SIDE = {
  0: [
    'owwwwwwwwwwwwwwwwwwo..',
    'ogggwwwwwwwwwwwggggo..',
    '....ossssssssssso.....',
    '...oossssssssssso.....',
    '..ogssssssssssssso....',
    '..ogssssssssssessoo...',
    '.owgsssSSsssssessnno..',
    '..ogssSsSsssssssnhno..',
    '.owgsssggssssppsnnnwo.',
    '.owgssgwgssssswwwwwwo.',
    '.oggggwwggsggswwggGo..',
    '..owwwgwwwgwwgDDDDo...',
    '...owwwwwwwwwwwgmmo...',
    '...oGgwwgwwwgwwGGo....',
    '....ooogwwwwwwwwo.....',
    '.......owwwwwwwgo.....',
    '.......owggwwwgGo.....',
    '........ooGwwgGo......',
    '..........oGGoo.......',
  ],
  1: [
    'owwwwwwwwwwwwwwwwwwo..',
    'ogggwwwwwwwwwwwggggo..',
    '....ossssssssssso.....',
    '...oossssssssssso.....',
    '..ogssssssssssssso....',
    '..ogssssssssssessoo...',
    '.owgsssSSssssesesnno..',
    '..ogssSsSsssssssnhno..',
    '.owgsssggssssppsnnnwo.',
    '.owgssgwgssssswwwwwwo.',
    '.oggggwwggsggswwggGo..',
    '..owwwgwwwgwwgDDDDo...',
    '...owwwwwwwwwwwmmmo...',
    '...oGgwwgwwwgwwmto....',
    '....ooogwwwwwwwwo.....',
    '.......owwwwwwwgo.....',
    '.......owggwwwgGo.....',
    '........ooGwwgGo......',
    '..........oGGoo.......',
  ],
  bald: [
    '......................',
    '......................',
    '......................',
    '.......oooooo.........',
    '......ossssssoo.......',
    '.....oshhhssssso......',
    '....osshhhsssssso.....',
    '...oosshhhsssssso.....',
    '..ogssssssssssssso....',
    '..ogssssssssssessoo...',
    '.owgsssSSssssesesnno..',
    '..ogssSsSsssssssnhno..',
    '.owgsssggssssppsnnnwo.',
    '.owgssgwgssssswwwwwwo.',
    '.oggggwwggsggswwggGo..',
    '..owwwgwwwgwwgDDDDo...',
    '...owwwwwwwwwwwmmmo...',
    '...oGgwwgwwwgwwmto....',
    '....ooogwwwwwwwwo.....',
    '.......owwwwwwwgo.....',
    '.......owggwwwgGo.....',
    '........ooGwwgGo......',
    '..........oGGoo.......',
  ],
};
SIDE[2] = SIDE[1];
const BALD_LIFT = SIDE.bald.length - SIDE[0].length;

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
  if (bald) paint(c, SIDE.bald, x0, y0 - BALD_LIFT);
  else paint(c, SIDE[mouth] || SIDE[0], x0, y0);
}

export const FACE_SIZE = { w: FRONT.ok[0].length, h: FRONT.ok.length };
