// config.js: every number and word that may change lives here (CLAUDE.md rule 4).
// Rule IDs (R1, R7...) match SPEC.md. Change a value here, not in the code.

export const CONFIG = {
  // K1: the staff code, typed on the staff keyboard. Shown as dots.
  staffCode: 'PAID',
  // Keyboards without F keys: hold the letter, then press the number (F + 2 = F2, F + 9 = F9).
  keys: { staffCode: 'F2', staffPanel: 'F9', holdKey: 'f', staffCodeAlt: '2', staffPanelAlt: '9' },

  // Market day. Times use the laptop clock (24 h). R26: the warning and the last payment only apply on `date`.
  event: { date: '2026-11-26', open: '09:00', lastGameWarn: '12:30', lastPayment: '12:35', drawTime: '12:45', close: '13:00' },

  // R1: prices. key = staff keyboard key on the payment screen (pressed after the payment is received).
  prices: [
    { id: 'p1', amount: 2.5, tries: 1, key: '1', label: '€2.50 = 1 TRY', badge: '' },
    { id: 'p3', amount: 6.5, tries: 3, key: '2', label: '€6.50 = 3 TRIES', badge: '' },
    { id: 'p5', amount: 10, tries: 5, key: '3', label: '€10 = 5 TRIES', badge: 'BEST VALUE' },
  ],
  freePlay: { tries: 1 }, // K2: a €0 payment after a technical problem

  // R3: a crash before chimney 5 restarts the try for free, at most 3 times per try.
  freeRestart: { below: 5, max: 3 },

  // Chimney numbers that unlock prizes (R5, R6, R8, R20, R21).
  thresholds: { choice: 10, ticket: 20, legend: 30, mythic: 40, beat: 50 },
  tickets: { p30: 3, swap: 2 }, // R8: draw tickets at chimney 30. R23: tickets instead of a 2nd sponsor prize
  consolation: { on: false, item: 'SWEET' }, // R11 (proposal, off by default)

  // R5: the chimney 10 choice. Set enabled: false to hide a tile.
  choice: [
    { id: 'sweet', label: 'SWEET', icon: 'sweet', enabled: true },
    { id: 'free', label: 'FREE TRY', icon: 'free', enabled: true },
  ],

  // R22: sponsor prizes. count = items at the start of the day (staff can change them in F9).
  // pick = the winner picks one item that is left. sponsor = the name shown on the prize screens.
  sponsors: {
    gold: { name: 'GOLD', color: '#ffd23f', pick: false, give: 'GOLD: GIVE {item}',
      items: [{ id: 'lidl20', label: 'LIDL €20 VOUCHER', sponsor: 'LIDL', count: 3 }] },
    silver: { name: 'SILVER', title: 'DAY OUT FOR 4', color: '#d8e0f0', pick: true, give: 'SILVER: PLAYER PICKS CINEMA OR BOWLING',
      items: [
        { id: 'vue4', label: 'VUE CINEMA, 4 TICKETS', sponsor: 'VUE CINEMA', count: 1 },
        { id: 'bowl4', label: 'FUNWORLD BOWLING, 4 GAMES', sponsor: 'FUNWORLD BOWLING', count: 1 },
      ] },
    bronze: { name: 'BRONZE', color: '#e0894a', pick: true, give: 'BRONZE: PLAYER PICKS FROM THE TABLE',
      items: [
        { id: 'shirtS', label: 'ROCKNSHOP SHIRT (S)', sponsor: 'ROCKNSHOP', count: 1 },
        { id: 'shirtL', label: 'ROCKNSHOP SHIRT (L)', sponsor: 'ROCKNSHOP', count: 1 },
        { id: 'shirtXL', label: 'ROCKNSHOP SHIRT (XL)', sponsor: 'ROCKNSHOP', count: 1 },
        { id: 'works', label: 'THE WORKS GIFT', sponsor: 'THE WORKS', count: 2 },
        { id: 'scents', label: 'SERENITY SCENTS GIFT', sponsor: 'SERENITY SCENTS', count: 3 },
        { id: 'gem', label: 'VINTAGE GEM GIFT', sponsor: 'VINTAGE GEM', count: 1 },
      ] },
  },
  drawOrder: ['bronze', 'silver', 'gold'], // R14: the items first (in this order), the jackpot last

  // R7: the wheel. odds = base chance in % (must add up to 100). pieces = how many slices it shows.
  // tier 1-4 sets how big the effects and sounds are. short = text on the slice (\n = new line), icon = wheelicons.js.
  // R24: sponsor = the tier it gives (no items left: its chance goes to `fallbackTo`).
  // The cash slice has odds 0: it turns on at `onWhenEmpty` % (taken from fallbackTo) when a tier is empty, max `maxWins` a day.
  wheel: {
    outcomes: [
      { id: 'jackpot', label: 'JACKPOT', short: 'JACKPOT', icon: 'coin', odds: 3, pieces: 1, tier: 4, color: '#ffd23f', jackpot: true },
      { id: 'gold', label: 'GOLD PRIZE', short: 'GOLD\nPRIZE', icon: 'gold', odds: 4, pieces: 1, tier: 4, color: '#ffb81f', sponsor: 'gold' },
      { id: 'silver', label: 'SILVER PRIZE', short: 'SILVER\nPRIZE', icon: 'silver', odds: 5, pieces: 1, tier: 3, color: '#b8c4dc', sponsor: 'silver' },
      { id: 'bronze', label: 'BRONZE PRIZE', short: 'BRONZE\nPRIZE', icon: 'bronze', odds: 20, pieces: 2, tier: 3, color: '#d9733a', sponsor: 'bronze' },
      { id: 'free', label: 'FREE TRY', short: 'FREE TRY', icon: 'free', odds: 30, pieces: 3, tier: 1, color: '#27c8ff', freeTry: true },
      { id: 't2', label: '+2 TICKETS', short: '+2\nTICKETS', icon: 'ticket', odds: 38, pieces: 4, tier: 2, color: '#3dff8b', tickets: 2 },
      { id: 'cash', label: '€10 CASH', short: '€10', icon: 'note', odds: 0, onWhenEmpty: 2, maxWins: 3, pieces: 1, tier: 4, color: '#ff5a6a', cash: 10 },
    ],
    fallbackTo: 't2',
    soldOut: 'SOLD OUT\n+2 TICKETS', // on an empty tier's slice
    jackpotDone: 'DRAW ONLY\n+2 TICKETS', // on the jackpot slice after 2 wheel wins or after the draw
    soldOutColor: '#5a5f78',
    tierNames: ['', 'NICE!', 'GREAT!', 'AMAZING!', 'LEGENDARY!'],
    spinSeconds: 5.5, // how long the spin lasts
    turns: 9, // full turns before it stops
    pegs: 28, // pegs on the rim: each one clicks as it passes the pointer (the fast slot-machine clatter)
    // the jackpot-machine sounds: eighth = seconds per note of the fast Jingle Bells, rollSecs = drum roll
    // at the end, coins = coin dings in the payout per tier (1-4), coinGap = seconds between coin dings.
    sound: { eighth: 0.065, rollSecs: 1.6, coins: [0, 8, 16, 26, 60], coinGap: 0.04 },
  },

  // R13: the jackpot. start euro at the first paid game of the day, +step every stepMins nobody wins it, max euro.
  // It runs only for the time from event.open to event.drawTime after the first paid game (R25, D10).
  jackpot: { start: 10, step: 10, stepMins: 60, max: 30, wheelMaxWins: 2 },

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
    // the Limerick town far behind (limerick.js): size = how big it is drawn (smaller = further away),
    // fade = how much the sky shows through it, scroll = how fast it moves (front = 1), lights = tree lights.
    town: { size: 0.6, fade: 0.72, scroll: 0.12, lightChance: 0.12, lightAlpha: 0.7 },
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
    win10: 'A SWEET OR A FREE TRY',
    win20: 'A SPIN ON THE WHEEL',
    win30: '3 DRAW TICKETS + LEGEND',
    win40: 'MYTHIC TAG',
    win50: 'GODLIKE TAG',
    oddsTitle: 'WHEEL ODDS',
    drawAt: 'DRAW AT',
    clickToFly: 'CLICK TO FLY',
    goals: { 10: 'PRIZE', 20: 'SPIN THE WHEEL', 30: 'LEGEND', 40: 'MYTHIC', 50: 'GODLIKE' },
    milestones: { 10: 'PRIZE UNLOCKED!', 20: 'SPIN THE WHEEL!', 30: 'LEGEND!', 40: 'MYTHIC!', 50: 'GODLIKE!' },
    jackpot: 'JACKPOT',
    // R13: {start}, {step}, {max} = euro, {draw} = draw time. jackpotNext: {step}, {mins}.
    jackpotRule: 'STARTS AT {start}. GROWS {step} EVERY HOUR NOBODY WINS IT. MAX {max}. WIN IT ON THE WHEEL OR IN THE {draw} DRAW.',
    jackpotNext: '+{step} IN {mins} MIN',
    jackpotMax: 'MAX',
    jackpotWaits: 'STARTS WITH THE FIRST GAME',
    jackpotDrawn: 'DRAWN',
    ticket: 'DRAW TICKET', // used everywhere a ticket is named
    tickets: 'DRAW TICKETS',
    sponsorsTitle: 'PRIZES FROM OUR SPONSORS',
    sponsorsHow: 'WIN THEM ON THE WHEEL (PASS {n} CHIMNEYS) OR IN THE {draw} DRAW',
    itemsLeft: 'ITEMS LEFT',
    lastGames: 'LAST GAMES! THE DRAW IS AT {draw}',
    lateTitle: 'NO NEW PAYMENTS',
    late: 'THE LAST PAYMENT TIME ({time}) IS OVER.',
    lateDraw: 'THE DRAW IS DONE: NEW TICKETS ARE NOT IN IT.',
    alreadyWon: 'ALREADY WON A PRIZE TODAY?',
    alreadyWonHint: 'Y = GIVE +{n} TICKETS INSTEAD · N = GIVE THE PRIZE',
    soldOutNow: 'SOLD OUT: GIVE +{n} TICKETS INSTEAD',
    wheelBack: 'YOUR WHEEL RESULT',
    // S10 hand-over words. {n} = count, {TICKETS} = TICKET/TICKETS, {range} = "#0012-#0013", {amount} = euro.
    giveTickets: 'GIVE {n} {TICKETS} {range}',
    payJackpot: 'PAY JACKPOT {amount}',
    payCash: 'PAY {amount}',
    payAgain: 'CONFIRM AGAIN: {what} DONE?',
    pickTitle: '{give}',
    sponsorBy: 'SPONSOR: {name}',
    spinWon: 'YOU WON A SPIN ON THE WHEEL!',
    wheelTitle: 'SPIN THE WHEEL!',
    clickToSpin: 'CLICK TO SPIN!',
    freeRestart: 'FREE RESTART!',
    beat: 'YOU BEAT SANTA TUS!',
    noPrize: 'NO PRIZE THIS TIME. THANK YOU FOR PLAYING!',
    staffPays: 'STAFF WILL GIVE IT AT THE END',
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
      prizesTitle: ['GAME OVER... BUT YOU WON!', 'WHAT A RIDE!', 'HO HO HO! A WINNER!'],
      prizes: "LET'S GET YOUR PRIZES: {prizes}!",
      ticketsOnly: 'KEEP YOUR {n} DRAW {TICKETS} SAFE. THE DRAW IS AT {draw}!',
      waiting: 'WAITING FOR YOU AT THE END: {prizes}!',
      overTitle: ['GAME OVER', 'OH NO... GAME OVER', 'GAME OVER, MY FRIEND'],
      over: ['THE CHIMNEYS WON THIS TIME...', 'I LOST MY HAT AND MY PRESENTS!', 'THAT ROOF CAME OUT OF NOWHERE!'],
      overClose: 'SO CLOSE! CHIMNEY 10 WAS ONLY {gap} AWAY.',
      thanks: 'THANK YOU FOR HELPING KIDS WITH DIABETES AT UHL!',
      prize: { spin: 'A SPIN ON THE WHEEL', legend: '3 DRAW TICKETS AND THE LEGEND TAG', mythic: 'THE MYTHIC TAG', choice: 'A SWEET OR A FREE TRY', consolation: 'A SWEET' },
      skip: 'CLICK TO CONTINUE',
    },
  },
};
