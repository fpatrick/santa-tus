// config.js: every number and word that may change lives here (CLAUDE.md rule 4).
// Rule IDs (R1, R7...) match SPEC.md. Change a value here, not in the code.

export const CONFIG = {
  // K1: the staff code, typed on the staff keyboard. Shown as dots.
  staffCode: 'PAID',
  // Keyboards without F keys: hold the letter, then press the number (F + 2 = F2, F + 9 = F9).
  keys: { staffCode: 'F2', staffPanel: 'F9', holdKey: 'f', staffCodeAlt: '2', staffPanelAlt: '9' },

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
  thresholds: { choice: 10, ticket: 20, legend: 30, mythic: 40, beat: 50 },
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
  // short = text on the slice (\n = new line), icon = picture on the slice (wheelicons.js).
  wheel: {
    outcomes: [
      { id: 'free', label: 'FREE TRY', short: 'FREE TRY', icon: 'free', odds: 40, pieces: 2, tier: 1, color: '#27c8ff', tickets: 0, cash: 0, freeTry: true },
      { id: 't2', label: 'JACKPOT TICKETS +2', short: 'JACKPOT\nTICKETS +2', icon: 'jackpot', odds: 30, pieces: 2, tier: 2, color: '#3dff8b', tickets: 2, cash: 0 },
      { id: 't5', label: 'JACKPOT TICKETS +5', short: 'JACKPOT\nTICKETS +5', icon: 'jackpotBig', odds: 28, pieces: 2, tier: 3, color: '#c35cff', tickets: 5, cash: 0 },
      { id: 'cash', label: '€10 CASH', short: '€10', icon: 'cash', odds: 2, pieces: 1, tier: 4, color: '#ffd23f', tickets: 0, cash: 10 },
    ],
    tierNames: ['', 'NICE!', 'GREAT!', 'AMAZING!', 'LEGENDARY!'],
    spinSeconds: 5.5, // how long the spin lasts
    turns: 9, // full turns before it stops
    pegs: 28, // pegs on the rim: each one clicks as it passes the pointer (the fast slot-machine clatter)
    // the jackpot-machine sounds: eighth = seconds per note of the fast Jingle Bells, rollSecs = drum roll
    // at the end, coins = coin dings in the payout per tier (1-4), coinGap = seconds between coin dings.
    sound: { eighth: 0.065, rollSecs: 1.6, coins: [0, 8, 16, 26, 60], coinGap: 0.04 },
  },

  // R13: jackpot = base + percent of all takings.
  jackpot: { base: 10, percent: 10 },

  // L1, L2, S9
  // L1: a tie goes to the latest player. Rank tags before the name: LEGEND (passed 30), MYTHIC (passed 40),
  // GODLIKE (beat 50). Each has its own pixel badge (rankbadge.js). newRank = the nickname screen title.
  board: { size: 15, minPillars: 1, nickMax: 12, defaultNick: 'PLAYER', title: 'BEST PLAYERS', legendTag: 'LEGEND', mythicTag: 'MYTHIC', godlikeTag: 'GODLIKE',
    newRank: { legend: 'NEW LEGEND!', mythic: 'NEW MYTHIC!', godlike: 'YOU ARE GODLIKE!' } },

  // R4: the course. Speeds in px per second, sizes in px (game area 1280 x 1080).
  // spacing = distance between chimneys. step = biggest jump of the gap centre.
  // move = how far a gap moves up and down, period = seconds for one move.
  levels: [
    { n: 1, name: 'EASY', to: 10, color: '#3dff8b', speed: 250, gap: 340, spacing: 560, step: 200, move: 0, period: 0 },
    { n: 2, name: 'MEDIUM', to: 20, color: '#27c8ff', speed: 300, gap: 275, spacing: 520, step: 250, move: 0, period: 0 },
    { n: 3, name: 'HARD', to: 30, color: '#ffd23f', speed: 320, gap: 255, spacing: 520, step: 250, move: 55, period: 3.2 },
    { n: 4, name: 'VETERAN', to: 40, color: '#ff4f6d', speed: 400, gap: 235, spacing: 560, step: 260, move: 80, period: 2.6 },
    { n: 5, name: 'MYTHIC', to: 50, color: '#c35cff', speed: 400, gap: 235, spacing: 560, step: 260, move: 80, period: 2.6 },
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
  music: { on: true, volume: 0.5, menuBpm: 84, lobbyBpm: 132, loopBpm: 250, crashBpm: 96, wheelDuck: 0.25 },

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
    laughSecs: 1.0, // Santa laughs with his mouth wide open for this long after each chimney
    bagGrow: 0.03,
    bagMax: 2.4,
  },

  // S6 + screen timings in seconds.
  timing: { tryOver: 3, healthOk: 2.5, banner: 2.2, awardShow: 3.2 },

  // C1-C4: the crash scene. Seconds: fall = tumble before the zoom, zoom = zoom-in time, zoomTo = zoom level,
  // stand = Santa getting up, read = how long the speech box stays (per state), minRead = before a click skips.
  crash: { fall: 1.0, zoom: 0.6, zoomTo: 2.4, stand: 0.5, read: { restart: 2.4, tries: 3.4, prizes: 4.4, over: 4.8 }, minRead: 1.2,
    wordsPerSec: 3, typeChars: 45, readExtra: 1 }, // long texts stay longer: typing time + words / wordsPerSec + readExtra

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
    win40: 'MYTHIC TAG',
    win50: 'GODLIKE TAG',
    oddsTitle: 'WHEEL ODDS',
    drawAt: 'DRAW AT',
    clickToFly: 'CLICK TO FLY',
    goals: { 10: 'PRIZE', 20: 'SPIN THE WHEEL', 30: 'LEGEND', 40: 'MYTHIC', 50: 'GODLIKE' },
    milestones: { 10: 'PRIZE UNLOCKED!', 20: 'SPIN THE WHEEL!', 30: 'LEGEND!', 40: 'MYTHIC!', 50: 'GODLIKE!' },
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
    // C1-C4: what Santa says after a crash. One line of each list is picked at random.
    // {tries} = "2 MORE TRIES", {chimney} = where he crashed, {gap} = chimneys to the next goal,
    // {goal} = next goal, {prizes} = prize list, {n} = a number, {draw} = draw time.
    crash: {
      restartTitle: ['OOPS!', 'WHOOPS!', 'HO HO... OUCH!'],
      restart: ["THAT ONE DOESN'T COUNT. FLY AGAIN!", 'SLIPPERY ROOF! THIS TRY IS FREE.', 'JUST A WARM-UP. HAVE ANOTHER GO!'],
      restartLeft: 'FREE RESTARTS LEFT: {n}',
      triesTitle: ["THAT'S OK!", 'NICE TRY!', 'SHAKE IT OFF!'],
      tries: ["YOU STILL HAVE {tries}. LET'S GO AGAIN!", 'CHIMNEY {chimney}! {tries} TO BEAT IT.', "I'M FINE! {tries} - LET'S FLY!"],
      triesClose: 'SO CLOSE! ONLY {gap} MORE TO {goal}. {tries} LEFT!',
      triesNewBest: 'NEW BEST: CHIMNEY {chimney}! {tries} TO GO EVEN HIGHER!',
      triesSafe: 'YOUR CHIMNEY 10 PRIZE IS SAFE! {tries} TO WIN EVEN MORE!',
      first: 'BUT FIRST: {prizes}!',
      prizesTitle: ['GAME OVER... BUT YOU WON!', 'WHAT A RIDE!', 'HO HO HO! A WINNER!'],
      prizes: "LET'S GET YOUR PRIZES: {prizes}!",
      ticketsOnly: 'KEEP YOUR {n} JACKPOT {TICKETS} SAFE. THE DRAW IS AT {draw}!',
      overTitle: ['GAME OVER', 'OH NO... GAME OVER', 'GAME OVER, MY FRIEND'],
      over: ['THE CHIMNEYS WON THIS TIME...', 'I LOST MY HAT AND MY PRESENTS!', 'THAT ROOF CAME OUT OF NOWHERE!'],
      overClose: 'SO CLOSE! CHIMNEY 10 WAS ONLY {gap} AWAY.',
      thanks: 'THANK YOU FOR HELPING KIDS WITH DIABETES AT UHL!',
      prize: { spin: 'A SPIN ON THE WHEEL', legend: '3 JACKPOT TICKETS AND THE LEGEND TAG', mythic: 'THE MYTHIC TAG', choice: 'A PRIZE FROM CHIMNEY 10', consolation: 'A STICKER' },
      skip: 'CLICK TO CONTINUE',
    },
  },
};
