// songdata.js: the songs as notes (moved out of songs.js so each file stays short). The helpers that turn
// them into sounds are in songs.js. Both songs are public domain: "Jingle Bells" (1857), "Silent Night" (1818).
// Melody format: "NOTE BEATS" pairs, "R" = rest, "|" = bar line (ignored). chords: one chord per bar.

const JB_VERSE = `
  G4 1 E5 1 D5 1 C5 1 | G4 3 G4 .5 G4 .5 | G4 1 E5 1 D5 1 C5 1 | A4 4 |
  A4 1 F5 1 E5 1 D5 1 | B4 4 | G5 1 G5 1 F5 1 D5 1 | E5 4 |
  G4 1 E5 1 D5 1 C5 1 | G4 4 | G4 1 E5 1 D5 1 C5 1 | A4 3 A4 1 |
  A4 1 F5 1 E5 1 D5 1 | G5 1 G5 1 G5 1 G5 1 | A5 1 G5 1 F5 1 D5 1 | C5 3 R 1 |`;
const JB_VERSE_CHORDS = 'C C C F F G7 G7 C C C C F F G7 G7 C';

const JB_CHORUS = `
  E5 1 E5 1 E5 2 | E5 1 E5 1 E5 2 | E5 1 G5 1 C5 1.5 D5 .5 | E5 4 |
  F5 1 F5 1 F5 1.5 F5 .5 | F5 1 E5 1 E5 1 E5 .5 E5 .5 | E5 1 D5 1 D5 1 E5 1 | D5 2 G5 2 |
  E5 1 E5 1 E5 2 | E5 1 E5 1 E5 2 | E5 1 G5 1 C5 1.5 D5 .5 | E5 4 |
  F5 1 F5 1 F5 1 F5 1 | F5 1 E5 1 E5 1 E5 .5 E5 .5 | G5 1 G5 1 F5 1 D5 1 | C5 4 |`;
const JB_CHORUS_CHORDS = 'C C C C F C D7 G7 C C C C F C G7 C';

// Flight intro: a heroic fanfare over the epic chord climb bVI - bVII - I (Ab, Bb, C), into the verse.
const JB_INTRO = 'G4 .5 C5 .5 E5 .5 G5 .5 C6 2 | C6 .5 Bb5 .5 Ab5 .5 Eb5 .5 C6 2 | D6 .5 C6 .5 Bb5 .5 F5 .5 D6 1 F6 1 | E6 2 G5 .5 F5 .5 E5 .5 D5 .5 |';
const JB_INTRO_CHORDS = 'C Ab Bb C';
// The triumphant chorus ends with the same epic move: bar 15 is Bb (bVII) before C.
const JB_EPIC_CHORDS = 'C C C C F C D7 G7 C C C C F C Bb C';
// Rising scale runs (bells) in the long melody notes: verse and chorus, one bar per melody bar.
const JB_VERSE_RUNS = `
  R 4 | R 1 C5 .25 D5 .25 E5 .25 F5 .25 G5 .5 E5 .5 C5 1 | R 4 | R 1 F5 .25 G5 .25 A5 .25 Bb5 .25 C6 .5 A5 .5 F5 1 |
  R 4 | R 1 G5 .25 A5 .25 B5 .25 C6 .25 D6 .5 B5 .5 G5 1 | R 4 | R 1 E5 .25 F5 .25 G5 .25 A5 .25 B5 .25 C6 .25 D6 .25 E6 .25 C6 1 |
  R 4 | R 1 G5 .5 C6 .5 E6 .5 C6 .5 G5 1 | R 4 | R 1 C6 .25 Bb5 .25 A5 .25 G5 .25 F5 .5 A5 .5 C6 1 |
  R 4 | R 4 | R 4 | R 1 G5 .25 A5 .25 B5 .25 C6 .25 D6 .25 E6 .25 F6 .25 G6 .25 C7 1 |`;
const JB_CHORUS_RUNS = `
  R 4 | R 2 G5 .5 A5 .5 B5 .5 C6 .5 | R 4 | R 1 C6 .25 B5 .25 A5 .25 G5 .25 E6 .5 D6 .5 C6 1 |
  R 4 | R 4 | R 4 | R 2 D6 .25 C6 .25 B5 .25 A5 .25 G5 .25 F5 .25 E5 .25 D5 .25 |
  R 4 | R 2 G5 .5 A5 .5 B5 .5 C6 .5 | R 4 | R 1 E6 .25 D6 .25 C6 .25 B5 .25 C6 .5 G5 .5 E5 1 |
  R 4 | R 4 | R 4 | R 1 C6 .25 D6 .25 E6 .25 F6 .25 G6 .5 E6 .5 C6 1 |`;

const SILENT = `
  G4 1.5 A4 .5 G4 1 | E4 3 | G4 1.5 A4 .5 G4 1 | E4 3 |
  D5 2 D5 1 | B4 3 | C5 2 C5 1 | G4 3 |
  A4 2 A4 1 | C5 1.5 B4 .5 A4 1 | G4 1.5 A4 .5 G4 1 | E4 3 |
  A4 2 A4 1 | C5 1.5 B4 .5 A4 1 | G4 1.5 A4 .5 G4 1 | E4 3 |
  D5 2 D5 1 | F5 1.5 D5 .5 B4 1 | C5 3 | E5 3 |
  C5 1.5 G4 .5 E4 1 | G4 1.5 F4 .5 D4 1 | C4 3 | R 3 |`;
const SILENT_CHORDS = 'C C C C G7 G7 C C F F C C F F C C G7 G7 C C C G7 C C';

// arr: lead (square | bell), bass (oompah | soft | waltz), arp (true = eighth-note chord notes),
// drums (none | bells | drive | big), up = semitones to transpose, double = lead also an octave up.
export const sec = (name, melody, chords, beatsPerBar, arr) => ({ name, melody, chords, beatsPerBar, ...arr });

// During flight (A5): Jingle Bells as a triumphant adventure march, in the same RPG sounds as the title song:
// heroic fanfare intro, a cozy verse (harp triplets, strings, sleigh bells, light march), a triumphant chorus
// (march bass, harmony, scale runs, the epic bVII - I ending), then higher keys with the melody in octaves.
// The first 3 parts end exactly when chimneys 10, 20 and 30 are passed (see flightMap).
// After 30 the last two parts loop (verse + chorus a key higher), which fills chimneys 31-50.
export const FLIGHT = {
  sections: [
    sec('intro', JB_INTRO, JB_INTRO_CHORDS, 4, { lead: 'rpg', bass: 'harp', pad: true, drums: 'marchintro', up: 0, double: true }),
    sec('verse', JB_VERSE, JB_VERSE_CHORDS, 4, { lead: 'rpg', bass: 'harp', pad: true, drums: 'march', up: 0, counter: JB_VERSE_RUNS }),
    sec('chorus', JB_CHORUS, JB_EPIC_CHORDS, 4, { lead: 'rpg', bass: 'oompah', pad: true, harm: true, drums: 'marchbig', up: 0, counter: JB_CHORUS_RUNS }),
    sec('chorus-up', JB_CHORUS, JB_EPIC_CHORDS, 4, { lead: 'rpg', bass: 'oompah', pad: true, harm: true, arp: true, drums: 'marchbig', up: 2, double: true, counter: JB_CHORUS_RUNS }),
    sec('verse-top', JB_VERSE, JB_VERSE_CHORDS, 4, { lead: 'rpg', bass: 'harp', pad: true, harm: true, drums: 'marchbig', up: 4, double: true, counter: JB_VERSE_RUNS }),
    sec('chorus-top', JB_CHORUS, JB_EPIC_CHORDS, 4, { lead: 'rpg', bass: 'oompah', pad: true, harm: true, arp: true, drums: 'marchbig', up: 4, double: true, counter: JB_CHORUS_RUNS }),
  ],
  anchors: [10, 20, 30], // chimney numbers where parts end: intro+verse | chorus | chorus-up
  anchorParts: [2, 1, 1], // how many parts each anchor covers
  loopFrom: 4,
};

// Between tries, on the wheel, the choice and the hand-over: soft chorus, loops.
export const LOBBY = {
  sections: [sec('lobby', JB_CHORUS, JB_CHORUS_CHORDS, 4, { lead: 'bell', bass: 'soft', drums: 'bells', up: 0 })],
  loopFrom: 0,
};

// After a crash (C2, C4): the Jingle Bells chorus in a minor key, slow, on a music box. A little sad,
// but still Christmas. When there are prizes (C3, happy Santa) the normal soft chorus plays instead.
const minor = (t) => t.replace(/E(\d)/g, 'Eb$1').replace(/A(\d)/g, 'Ab$1').replace(/B(\d)/g, 'Bb$1');
export const CRASH = {
  sections: [sec('crash', minor(JB_CHORUS), 'Cm Cm Cm Cm Fm Cm Fm G7 Cm Cm Cm Cm Fm Cm G7 Cm', 4, { lead: 'bell', bass: 'waltz', drums: 'none', up: 0 })],
  loopFrom: 0,
};

// Title screen (A5): Silent Night as a grand chiptune RPG Christmas theme (an epic adventure-game town theme feel,
// our own arrangement). Rolling 6/8: one beat = one eighth note, 6 beats a bar, at CONFIG.music.menuBpm (240).
// 1) a heroic 4-bar fanfare, 2) verse 1: gentle, soft lead with vibrato over harp arpeggios and string pads, light
// sleigh bells only, a drum roll at the end, 3) a key change up: the lead in octaves with harmony, bell counter-lines,
// faster harp sweeps, full rolling drums. About 78 s per loop. (The piano chords and runs below are reused.)
const CASCADE = `
  E6 .25 D6 .25 C6 .25 G5 .25 E6 .25 D6 .25 C6 .25 G5 .25 E6 .25 D6 .25 C6 .25 G5 .25 |
  F6 .25 E6 .25 C6 .25 A5 .25 F6 .25 E6 .25 C6 .25 A5 .25 F6 .25 E6 .25 C6 .25 A5 .25 |
  F6 .25 D6 .25 B5 .25 G5 .25 F6 .25 D6 .25 B5 .25 G5 .25 D6 .25 B5 .25 G5 .25 F5 .25 |
  D5 .25 F5 .25 G5 .25 B5 .25 D6 .25 F6 .25 G6 .5 R 1 |`;
// Richer chords than the plain song (bar 24 = the turn into the next part).
const PIANO1 = 'C C Am C G7 G7 C C7 F F C Am F F C A7 Dm7 G7 C Am F G7 C';
const PIANO2 = 'C C Am C G7 G7 C C7 F F C Am Dm7 F C A7 Dm7 G7 C Am Fmaj7 G7 C';
// Runs in the long melody notes. Part 1: light eighths. Part 2: 16th-note runs. One bar per melody bar (1-23).
const RUNS1 = `
  R 3 | R 1 G5 .5 C6 .5 E6 .5 C6 .5 | R 3 | R 1 E6 .5 D6 .5 C6 .5 G5 .5 |
  R 3 | R 1 D6 .5 F6 .5 D6 .5 B5 .5 | R 3 | R 1 C6 .5 E6 .5 G6 .5 Bb5 .5 |
  R 3 | R 3 | R 3 | R 1 A5 .5 C6 .5 E6 .5 C6 .5 |
  R 3 | R 3 | R 3 | R 1 E6 .5 C#6 .5 A5 .5 G5 .5 |
  R 3 | R 3 | R 1 E6 .5 G6 .5 E6 .5 C6 .5 | R 1 A6 .5 E6 .5 C6 .5 A5 .5 |
  R 3 | R 3 | R 1 E5 .5 G5 .5 C6 .5 E6 .5 |`;
const RUNS2 = `
  R 3 | R 1 G5 .25 C6 .25 E6 .25 G6 .25 E6 .25 C6 .25 G5 .25 E5 .25 | R 3 | R 1 C6 .25 D6 .25 E6 .25 G6 .25 A6 .25 G6 .25 E6 .25 D6 .25 |
  R 3 | R 1 D6 .25 F6 .25 G6 .25 B6 .25 G6 .25 F6 .25 D6 .25 B5 .25 | R 3 | R 1 E6 .25 G6 .25 Bb6 .25 C7 .25 Bb6 .25 G6 .25 E6 .25 C6 .25 |
  R 3 | R 3 | R 3 | R 1 A5 .25 C6 .25 E6 .25 A6 .25 E6 .25 C6 .25 A5 .25 E5 .25 |
  R 3 | R 3 | R 3 | R 1 E6 .25 G6 .25 A6 .25 C#7 .25 A6 .25 G6 .25 E6 .25 C#6 .25 |
  R 3 | R 3 | R 1 C6 .25 E6 .25 G6 .25 C7 .25 G6 .25 E6 .25 C6 .25 G5 .25 | R 1 A6 .25 G6 .25 E6 .25 C6 .25 A5 .25 G5 .25 E5 .25 C5 .25 |
  R 3 | R 3 | R 1 G5 .25 C6 .25 E6 .25 G6 .25 C7 1 |`;
// 3/4 in quarters -> 6/8 in eighths: every length doubles.
const dbl = (t) => t.replace(/(\s)(\d*\.?\d+)(?=\s|$)/g, (_, sp, n) => `${sp}${Number(n) * 2}`);
const FANFARE = 'G4 1 C5 1 E5 1 G5 3 | A4 1 C5 1 E5 1 A5 3 | F5 1 A5 1 C6 1 A5 1 F5 1 C6 1 | B5 2 D6 1 F6 3 |';
export const MENU = {
  sections: [
    sec('fanfare', FANFARE, 'C Am F G7', 6, { lead: 'rpg', bass: 'harp', pad: true, drums: 'r68intro', up: 0, double: true, fill: true }),
    // verse 1: gentle; the last bar A7 + a drum roll turns into the key of D
    sec('verse', dbl(` ${SILENT}`), `${PIANO1} A7`, 6, { lead: 'rpg', bass: 'harp', pad: true, drums: 'r68soft', up: 0, fill: true, vel: 0.85,
      counter: dbl(` ${'R 3 | '.repeat(23)}A4 .25 C#5 .25 E5 .25 G5 .25 A5 .25 C#6 .25 E6 .25 G6 .25 A6 .5 E6 .5 |`) }),
    // verse 2: grand, 2 semitones up (D). F7 + 2 = G7 leads back to the fanfare in C.
    sec('verse-up', dbl(` ${SILENT}`), `${PIANO2} F7`, 6, { lead: 'rpg', bass: 'harpbig', pad: true, drums: 'r68big', up: 2, double: true, harm: true, vel: 1,
      counter: dbl(` ${RUNS1} F4 .25 A4 .25 C5 .25 Eb5 .25 F5 .25 A5 .25 C6 .25 Eb6 .25 F6 .25 Eb6 .25 C6 .25 A5 .25 |`) }),
  ],
  loopFrom: 0,
};

