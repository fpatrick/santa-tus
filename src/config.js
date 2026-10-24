// config.js: every number and word that may change lives here (CLAUDE.md rule 4).
// Rule IDs (R1, R7...) match SPEC.md. Change a value here, not in the code.

export const CONFIG = {
  // K1: the staff code, typed on the staff keyboard. Shown as dots.
  staffCode: 'PAID',
  keys: { staffCode: 'F2', staffPanel: 'F9' },

  // Market day. Times use the laptop clock (24 h).
  event: { date: '2026-11-26', open: '09:00', drawTime: '12:45', lastGameWarn: '12:30', close: '13:00' },

  // R1: prices. key = staff keyboard key on the payment screen.
  prices: [
    { id: 'p2', amount: 2, tries: 1, key: '1', label: '€2 = 1 TRY', badge: '' },
    { id: 'p5', amount: 5, tries: 3, key: '2', label: '€5 = 3 TRIES', badge: 'BEST VALUE' },
  ],
  freePlay: { tries: 1 }, // K2: a €0 payment after a technical problem

  // R3: a crash before chimney 5 restarts the try for free, at most 3 times per try.
  freeRestart: { below: 5, max: 3 },

  // Chimney numbers that unlock prizes (R5, R6, R8, R20, R21).
  thresholds: { choice: 10, ticket: 20, legend: 30, master: 40, beat: 50 },
  tickets: { p20: 0, p30: 3 }, // R6 (chimney 20 = a spin on the wheel, no ticket), R8
  consolation: { on: false, item: 'STICKER' }, // R11 (proposal, off by default)

  // R5: the pillar 10 choice. Set enabled: false to hide a tile (open decision 5).
  choice: [
    { id: 'cookie', label: 'COOKIE', icon: 'cookie', enabled: true },
    { id: 'token', label: '3D TOKEN', icon: 'token', enabled: true },
    { id: 'sticker', label: 'STICKER', icon: 'sticker', enabled: true },
    { id: 'free', label: 'FREE TRY', icon: 'free', enabled: true },
  ],

  // R7: the wheel. odds must add up to 100. pieces = how many slices it shows
  // (same total odds). tier 1-4 sets how big the effects and sounds are.
  // short = text on the slice, icon = picture on the slice (sprites.js).
  wheel: {
    outcomes: [
      { id: 'free', label: 'FREE TRY', short: 'FREE TRY', icon: 'free', odds: 40, pieces: 2, tier: 1, color: '#27c8ff', tickets: 0, cash: 0, freeTry: true },
      { id: 't2', label: '+2 JACKPOT TICKETS', short: '+2', icon: 'ticket', odds: 30, pieces: 2, tier: 2, color: '#3dff8b', tickets: 2, cash: 0 },
      { id: 't5', label: '+5 JACKPOT TICKETS', short: '+5', icon: 'ticket', odds: 28, pieces: 2, tier: 3, color: '#c35cff', tickets: 5, cash: 0 },
      { id: 'cash', label: '€10 CASH', short: '€10', icon: 'cash', odds: 2, pieces: 1, tier: 4, color: '#ffd23f', tickets: 0, cash: 10 },
    ],
    tierNames: ['', 'NICE!', 'GREAT!', 'AMAZING!', 'LEGENDARY!'],
    spinSeconds: 6.5, // how long the spin lasts
    turns: 6, // full turns before it stops
  },

  // R13: jackpot = base + percent of all takings.
  jackpot: { base: 10, percent: 10 },

  // L1, L2, S9
  // L1: a tie goes to the latest player. Tags: MASTER (passed 40) or LEGEND (passed 30) before the name.
  board: { size: 15, minPillars: 1, nickMax: 12, defaultNick: 'PLAYER', title: 'BEST PLAYERS', legendTag: 'LEGEND', masterTag: 'MASTER' },

  // R4: the course. Speeds in px per second, sizes in px (game area 1280 x 1080).
  // spacing = distance between chimneys. step = biggest jump of the gap centre.
  // move = how far a gap moves up and down, period = seconds for one move.
  levels: [
    { n: 1, name: 'EASY', to: 10, color: '#3dff8b', speed: 250, gap: 340, spacing: 560, step: 200, move: 0, period: 0 },
    { n: 2, name: 'MEDIUM', to: 20, color: '#27c8ff', speed: 300, gap: 275, spacing: 520, step: 250, move: 0, period: 0 },
    { n: 3, name: 'HARD', to: 30, color: '#ffd23f', speed: 320, gap: 255, spacing: 520, step: 250, move: 55, period: 3.2 },
    { n: 4, name: 'VETERAN', to: 40, color: '#ff4f6d', speed: 400, gap: 235, spacing: 560, step: 260, move: 80, period: 2.6 },
    { n: 5, name: 'MASTER', to: 50, color: '#c35cff', speed: 400, gap: 235, spacing: 560, step: 260, move: 80, period: 2.6 },
  ],
  physics: { gravity: 2300, flap: -680, maxFall: 900, santaX: 300, hitW: 66, hitH: 44 },
  world: { width: 1280, height: 1080, roof: 110, gapMin: 240, gapMax: 740, firstGap: 500, chimneyW: 130 },
  // R4 fairness check: what a player can surely do, with a safety margin.
  fair: { riseRate: 430, fallRate: 800, margin: 0.75, minGapExtra: 120 },

  // A2: title screen scenes, in seconds.
  attract: { sceneSeconds: 8, demoSeconds: 12 },

  // Sound effects volume (0-1). Mute from the staff panel.
  sound: { volume: 0.55, muted: false },

  // A5: background music (src/songs.js). volume is relative to the sound volume.
  // Title screen: Silent Night. Flying: Jingle Bells, timed to end at chimney 30, then it loops a key higher.
  // menuBpm/lobbyBpm/loopBpm = beats per minute. wheelDuck = music volume while the wheel spins.
  music: { on: true, volume: 0.5, menuBpm: 84, lobbyBpm: 132, loopBpm: 250, wheelDuck: 0.25 },

  // FX safety (A4): never more than 3 flashes per second.
  fx: { maxFlashPerSec: 3, particleCap: 900 },

  // Scenery per level (1-5): sky colours [top, middle, bottom], snow flakes and their fall speed (px/s).
  // Snow grows fast with each level. bagGrow = how much bigger Santa's bag gets per chimney.
  scenery: {
    skies: [
      ['#16244f', '#2c4a86', '#5a7fb8'],
      ['#101a45', '#25307a', '#4a4aa0'],
      ['#0d0b38', '#2a1466', '#55308a'],
      ['#1a0626', '#4a0f40', '#7a1f3c'],
      ['#05030f', '#1a0636', '#3a0a4a'],
    ],
    snow: [{ count: 6, speed: 35 }, { count: 30, speed: 70 }, { count: 90, speed: 130 }, { count: 220, speed: 230 }, { count: 420, speed: 380 }],
    bagGrow: 0.03,
    bagMax: 2.4,
  },

  // S6 + screen timings in seconds.
  timing: { tryOver: 3, healthOk: 2.5, banner: 2.2, awardShow: 3.2 },

  // Words on the screens (A6). Keep them short: big pixel text.
  text: {
    title: 'SANTA TUS',
    tagline: 'ARCADE GAME WITH REAL PRIZES',
    pay: 'PAY AT THE STALL TO PLAY',
    bestTry: 'BEST TRY COUNTS',
    charity: 'ALL PROFIT GOES TO PAEDIATRIC DIABETES, UHL',
    winTitle: 'WHAT YOU CAN WIN',
    win10: 'SMALL PRIZE OR A FREE TRY',
    win20: 'A SPIN ON THE WHEEL',
    win30: '3 JACKPOT TICKETS + LEGEND',
    win40: 'MASTER TAG',
    oddsTitle: 'WHEEL ODDS',
    drawAt: 'DRAW AT',
    clickToFly: 'CLICK TO FLY',
    goals: { 10: 'PRIZE', 20: 'SPIN THE WHEEL', 30: 'LEGEND', 40: 'MASTER', 50: 'BEAT THE GAME' },
    milestones: { 10: 'PRIZE UNLOCKED!', 20: 'SPIN THE WHEEL!', 30: 'LEGEND!', 40: 'MASTER!', 50: 'YOU BEAT IT!' },
    jackpot: 'JACKPOT UNTIL NOW',
    ticket: 'JACKPOT TICKET', // used everywhere a ticket is named
    tickets: 'JACKPOT TICKETS',
    spinWon: 'YOU WON A SPIN ON THE WHEEL!',
    wheelTitle: 'SPIN THE WHEEL!',
    clickToSpin: 'CLICK TO SPIN!',
    freeRestart: 'FREE RESTART!',
    beat: 'YOU BEAT SANTA TUS!',
    noPrize: 'NO PRIZE THIS TIME. THANK YOU FOR PLAYING!',
    testVersion: 'TEST VERSION: SCORES ARE KEPT IN THIS BROWSER ONLY',
    testMode: 'TEST MODE: PLAYS ARE NOT COUNTED',
    serverDown: 'SERVER DOWN: RESULTS KEPT IN BROWSER, WILL SEND LATER',
    ageNote: '', // open decision 8, for example 'PAID PLAY 18+'
  },
};
