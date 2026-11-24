# SPEC.md: Santa TUS rules, screens, data and tests (source of truth)

Based on "Santa TUS game: requirements analysis" (24 Oct 2026). Every rule has an ID. To ask for a change,
quote the ID: "R7: free try 35%". Claude: use Grep on the ID, do not read this whole file.
Marked *proposal* = not yet agreed by the group. Values in brackets live in `src/config.js`.

## Goal

Run the stall's whole game, prize and money logic on 26 November 2026, 9:00-13:00, without losing a single record.
One 16:9 screen (1920 x 1080): the game on the left 1280 px, the leaderboard panel on the right 640 px.
Out of scope: online play, accounts, card payments, emails or phone numbers, phone or tablet version, changes on market day.

## Game rules

Goal: make money for Paediatric Diabetes UHL. Fun for all ages, fair, easy to understand, and **never lose money, even on a bad day**
(plan: about 35 payments and 20 to 25 wheel spins). Every number below lives in `src/config.js`.

**Paying and trying** (final rules from 24 Nov 2026; they replace all earlier prize, wheel and jackpot rules)

- **R1 Prices** [`prices`]: staff type the code, then press the key after the payment is received. The game does not show or track how people pay.

| Key | Price | What | Note |
| --- | --- | --- | --- |
| 1 | €2.50 | PLAY: 1 try | |
| 2 | €6.50 | PLAY: 3 tries | |
| 3 | €10 | PLAY: 5 tries + 1 bonus draw ticket at payment | "BEST VALUE +1 BONUS TICKET" |
| 4 | €2.50 | TICKETS ONLY: 1 draw ticket | no game, straight to the ticket screen |
| 5 | €6.50 | TICKETS ONLY: 3 draw tickets | no game |
| 6 | €10 | TICKETS ONLY: 6 draw tickets | no game |

- **R2 Best try counts:** inside one payment, the highest chimney reached in any try decides the prizes (except the chimney 10 ticket, R5).
- **R3 Free restart:** crash before chimney 5 and the try restarts without using it, at most 3 times per try [`freeRestart`].
- **R4 The course:** 50 chimneys in 5 levels. Harder at 10, 20, 30, 40; a sound announces each level (no text on screen). Each level has its own sky colour and more snow (almost none at level 1, a storm at level 5) [`scenery`]. Bottom: brick chimneys. Top: a packed stack of wide and tall Christmas presents with no gaps (patterned paper, ribbons, bows on the front); when Santa passes, the presents fly into his TUS bag, which grows with each chimney, and Santa laughs (mouth opens, no sound) [`scenery.laughSecs`]. Passing 50 beats the game and ends the try.

| Level | Chimneys | Feel | What changes [`levels`] | Target pass rate (*proposal*) |
| --- | --- | --- | --- | --- |
| 1 Easy | 1-10 | A child can do it | slow, wide gaps | 80% |
| 2 Medium | 11-20 | Many players lose here | faster, smaller gaps | 25% |
| 3 Hard | 21-30 | Very hard, never impossible | gaps move slowly up and down | 6% |
| 4 Veteran | 31-40 | For Flappy Bird veterans | big speed jump, tight moving gaps | 1% |
| 5 Mythic | 41-50 | Bragging rights | as hard as level 4 (*proposal*) | very few |

**Fairness check:** every gap can be reached from the one before. `course.js isFairStep()` checks each chimney it builds,
using what a player can surely do [`fair`]. T26 builds 10,000 courses.

**Prizes are per payment**

- **R2b** The best try of the payment decides the prizes. **R15** Each prize level is given at most once per payment (only the chimney 10 ticket is per try): never more than 1 wheel spin per payment.
- **R10 Free tries:** a free try (from R5 or the wheel) adds 1 try to the same payment. After it, the game checks again for any prize level the payment has not had yet.
- **R9 Order at the end of a payment** (when no tries are left, `rules.js nextStep`): chimney 10 choice -> wheel -> nickname (if needed) -> sponsor prize check (R23) -> the ticket screen (R12) -> hand-over. Prizes add up: reaching 30 also gives the wheel spin and the 10 choice.

**R5-R8 Prize ladder**

| Chimney | Prize |
| --- | --- |
| 10 | **R5** +1 draw ticket for EVERY try that reaches 10 [`tickets.per10`] (5 tries reaching 10 = 5 tickets). And ONCE per payment the player picks **SWEET** or **FREE TRY** [`choice`]. A free try gives up the sweet; the choice is not offered again. After beating the game (50) there is no free-try tile. |
| 20 | **R6** 1 wheel spin (R7). Max 1 spin per payment. |
| 30 | **R8** +5 draw tickets [`tickets.p30`] + the LEGEND tag (gold badge). |
| 40 | **R20** MYTHIC tag (feral purple badge), instead of LEGEND. |
| 50 | **R21** "YOU BEAT SANTA TUS!", the GODLIKE tag (red and blue divine badge). 50 is the highest score. |

- **R19** No new prizes after 30: chimneys 31-50 count only for the leaderboard and the tags. Ranks: LEGEND (30) < MYTHIC (40) < GODLIKE (50).
- **R11 Consolation** (*proposal*, off) [`consolation.on`]: gave up the 10 prize for a free try and ended below 20: still 1 sweet.

**R22 Sponsor prizes in 3 tiers** [`sponsors`] (staff can change the counts in F9, logged)

| Tier | Items (count) | Who picks |
| --- | --- | --- |
| GOLD "Day out for 4" | Vue cinema, 4 tickets (1) · Fun World bowling, 4 games (1) | the winner picks one that is left |
| SILVER | Lidl €20 voucher (3) · One4all €20 voucher (1) | the winner picks one that is left |
| BRONZE | PlayStation €10 voucher (4) · Xbox €10 voucher (2) · Rocknshop shirt (3) · The Works book set (1) · The Works art set (1) · Serenity Scents candle (1) · Serenity Scents room spray (1) | the winner picks one from the table |

- NOT on the wheel (part 2): One4all €20 x1 (top score prize) and GTA 6 for PS5 (draw prize).
- The prize screens show the sponsor name (text only; logos later).
- **R23 One sponsor prize per nickname per day:** a sponsor winner is always asked for a nickname. If that nickname already won a sponsor prize today, staff see "ALREADY WON A PRIZE TODAY? Y = GIVE +2 TICKETS INSTEAD" [`tickets.swap`]. Staff decide (Y or N). The default nickname (skipped) is never matched.
- An item is **reserved** when the wheel lands on its tier (so stock can never go below 0) and **given** when staff confirm the item (the pick screen). Y in R23 gives +2 tickets and frees the reservation.

**R7 The wheel** [`wheel.outcomes`]

| Slice | Base chance |
| --- | --- |
| GOLD | 4% |
| SILVER | 8% |
| BRONZE | 24% |
| FREE TRY | 26% |
| +2 TICKETS | 38% |

- **R24 Fallbacks**, worked out before every spin from the saved log (`prizes.js liveOdds`):
  - a tier (GOLD, SILVER, BRONZE) with no items left: its chance goes to +2 TICKETS. On the wheel its slice shows "SOLD OUT - +2 TICKETS".
  - the live odds always add up to exactly 100% (the +2 TICKETS slice takes what is left).
- The computer picks the result with `secureRandom()` and SAVES it before the animation (D1). The slice sizes on the wheel are the live odds. After a crash the same result is shown again; a payment never spins twice (D11).
- The wheel screen always shows the live odds and the items left per tier.
- Each result has a tier 1-4: effects and sounds grow with the tier.

**R27 Cash fallback** (a safety option, only when ALL sponsor prizes are gone) [`CASH_FALLBACK_ENABLED`, `CASH_FALLBACK_MAX_WINS`]

- `CASH_FALLBACK_ENABLED = true` in config. Staff can switch it on or off in F9 (key C); each switch is saved as a `staff` event (`cash-fallback`, on/off).
- It turns on ONLY when GOLD, SILVER and BRONZE are ALL sold out. Then a "€10 CASH" slice appears at 2% [`wheel` cash `onWhenAllEmpty`], taken from +2 TICKETS.
- €10 CASH can be won at most 3 times per day (`CASH_FALLBACK_MAX_WINS = 3`); after that its chance goes back to +2 TICKETS.
- Staff screen: "PAY €10", confirmed twice, then saved (`staff` event `cash-paid` with the payment number).
- **Worst case: €10 x 3 = €30 cash paid per day.** No other money prize exists while the jackpot is off (R13).

**R12-R14 Tickets, jackpot and draw**

- **R12 Draw tickets:** always called "draw ticket" on screen [`text.ticket`]. A payment collects tickets from: each try that reaches 10 (+1), key 3 bonus (+1), chimney 30 (+5), the wheel +2 TICKETS slice (+2), R23 swap (+2), and the TICKETS ONLY keys (1, 3 or 6). They are all given at the END of the payment, on ONE ticket screen that lists where they came from and their numbers ("GIVE 4 TICKETS #0012-#0015"); this is one `award` event (kind `tickets`). Numbers start at #0001 and go up by 1: they never repeat and never skip. Staff hand out pre-numbered cloakroom tickets in the same order.
- **R13 Jackpot: OFF** [`JACKPOT_ENABLED = false`]. When off, the jackpot is hidden everywhere (title screen, panel, wheel, draw, staff summary, odds sheet) and has no wheel slice. The old jackpot code stays (not deleted) for a later year: start €10, +€10 every hour, max €30, at most 2 wheel wins a day [`jackpot`].
- **R14 The draw** (12:45 [`event.drawTime`], started by staff in F9, never automatic):
  - The prizes are every sponsor item not won yet. Order: bronze items, then silver, then gold. Each draw is for one named item. (Part 2 adds the GTA 6 draw prize.)
  - The ticket number shows in big text. One ticket can win only once.
  - The winner is not there: staff press N ("NOT HERE"), type a reason (logged), and the same prize is drawn again. That ticket is out of the rest of the draw.
  - No tickets left: the items still in the list stay with the team.
  - The draw is saved step by step and cannot run twice unless staff undo it in F9 (logged, with a reason). A stopped draw goes on from where it stopped.
  - (Jackpot on only: the jackpot is drawn last and one ticket is always kept for it.)
- **R26 Times** [`event`]: 12:30 a warning banner for the last games. 12:35 last payment: after it (and after the draw) the payment screen needs O to go on (logged). Times only apply on the event day (`event.date`), so tests on other days are never blocked.

**Fair play**

- **R16 Hand-over:** the last screen lists everything to give: "GIVE 1 SWEET", "SILVER: GIVE LIDL €20 VOUCHER" + sponsor name, "GIVE 4 TICKETS #0012-#0015". The €10 CASH fallback ("PAY €10") is confirmed twice. Staff confirm everything with Enter.
- **R17 No pressure:** after a payment the game goes back to the title screen. It never asks "play again?".
- **R18 Odds shown:** in the title screen loop, on the wheel screen (live odds), and on the A4 sheet `print/odds.html`.

## Screens

| ID | Screen | Who | Where in code |
| --- | --- | --- | --- |
| S1 | Title (attract mode): logo, prices (play + tickets only), prizes + odds, sponsors, top 15 + draw time (jackpot only when on), demo flight | nobody | attract.js |
| S2 | Staff code: F2 (or hold F + press 2) or a click in the top-left corner. Dots. Enter checks, Esc cancels. A wrong code just clears. | staff | screens.staffCode |
| S3 | Payment: PLAY €2.50 / €6.50 / €10 (keys 1-3), TICKETS ONLY €2.50 / €6.50 / €10 (keys 4-6), Cancel (Esc). After 12:35 or after the draw: a red warning, O to go on (R26) | staff | screens.payment |
| S4 | Get ready: "CLICK TO FLY", tries left, best | player | game.js HUD |
| S5 | Play: chimney count, level, tries left, best, next goal. A new level plays a sound only (no text). A warning glow between chimney and presents just before each level change | player | game.js, flow.flightHooks |
| S6 | Try over: the crash scene C1-C4 (Santa speaks), or "YOU BEAT SANTA TUS!" (R21) | nobody | flow.flyOnce, crash.js |
| S7 | Wheel: live odds and items left per tier, "SOLD OUT - +2 TICKETS" on empty tiers; "CLICK TO SPIN!", the player clicks, it spins and shows the result | player | wheel.js |
| S8 | Chimney 10 choice: SWEET or FREE TRY, big tiles, mouse | player | screens.choice |
| S9 | Nickname: for the best players list, LEGEND, MYTHIC, GODLIKE and every sponsor winner (R23). Max 12 characters, Esc = "PLAYER 37" | staff | screens.nickname |
| S10 | Ticket screen (R12): all tickets of the payment with where they came from and the numbers. Then the hand-over (R16): €10 CASH confirmed twice, then the list. (The "already won today?" check and the item pick (R23) come just before the ticket screen.) Enter saves and goes back to S1 | staff | screens.handover, handover.js |
| S11 | Staff panel: F9 (or hold F + press 9) + code | staff | staff.staffPanel |
| S12 | Draw (R14): one prize at a time, rolling numbers, the winning ticket in big text, N = NOT HERE + reason | staff | staff.drawScreen |
| S13 | Health check at every start: server, database, USB, clock, screen, fonts, sound, settings | nobody | main.healthCheck |

**Leaderboard panel (L2):** "PRIZE DRAW" ("JACKPOT" with "+€10 IN 34 MIN" only when the jackpot is on), "DRAW AT 12:45" + countdown on the event day, this player's prizes (chimney 10 prize, wheel result, draw tickets; shown until the next game starts), "BEST PLAYERS" top 15 (rank, the LEGEND / MYTHIC / GODLIKE badge, name, chimneys).
Panel text is at least 28 px. **Players never need the keyboard** (mouse or a USB arcade button set as a click).

**Attract mode:** A1 1980s arcade look (Press Start 2P + VT323 pixel fonts in `assets/fonts`, neon on a night sky, scanlines, detailed pixel-art Santa (all-red hat) in a red and gold sleigh, his burlap TUS bag tied on with ropes, the TUS logo on a town building).
A2 four scenes of 8 s, then a demo that crashes [`attract`]. A3 prices 64 px+, nothing under 32 px. A4 nothing flashes more than 3 times a second.
A5 music [`music`]: the title screen loops a bright, quick Christmas-waltz version of Silent Night (156 bpm, about 60 s) to catch people walking past: a 4-bar hook with a cymbal, the melody on high music-box bells with sparkle fills, then a key change up with the full chip band and drums, then back to the hook. During a payment a soft Jingle Bells chorus plays under every screen (quieter while the wheel spins). When Santa flies, the full Jingle Bells starts at the first click and is timed to Santa's distance: intro + verse end at chimney 10, chorus at 20, chorus a key higher at 30 (no loop before 30, T31). After 30, verse + chorus loop two keys higher. Crash = music stops. Mute in the staff panel. A6 every word comes from `config.text`.

**Version badge:** every screen shows "BETA v0.9.x · NOT THE FINAL GAME" while `STAGE` in `src/version.js` is not FINAL.

## Crash scene (C1-C4)

When Santa crashes, the try is saved first (D1), then a short scene plays instead of a "TRY OVER" box:
he tumbles onto the roof, his hat flies off and his bag rolls away and spills presents. After 1 second
the camera zooms in, Santa climbs out of the sleigh (bald, no hat!) and a big speech box shows what he says.
It stays at least `read[state]` seconds and longer for long texts (typing time + words / `wordsPerSec` + `readExtra`); a click (or Enter / Space) skips it after 1.2 s [`crash`]. Music: a slow minor-key Jingle Bells music box (C1, C2, C4), or the happy chorus when Santa has prizes (C3). Words: `text.crash` (one line of each list is picked at random).

| ID | When | Santa | Says (examples) |
| --- | --- | --- | --- |
| C1 | Crash before chimney 5, free restart (R3) | smiles, waves | "WHOOPS! That one doesn't count. Fly again! Free restarts left: 2" |
| C2 | Tries left | smiles, waves (cheers with arms up if a prize is coming first) | "So close! Only 2 more to 10. 2 more tries left!" / "New best: chimney 14!" / "Your chimney 10 prize is safe!" / "But first: a spin on the wheel!" |
| C3 | No tries left, prizes to collect (or jackpot tickets kept) | laughs and jumps | "WHAT A RIDE! Let's get your prizes: a spin on the wheel and a prize from chimney 10!" / "Keep your 2 jackpot tickets safe. The draw is at 12:45!" |
| C4 | No tries left, nothing won | sad, a tear, sad trombone | "GAME OVER. So close! Chimney 10 was only 2 away. Thank you for helping kids with diabetes at UHL!" |

Never "play again?" (R17). The title-screen demo shows only the tumble (no zoom, no speech).

## Staff controls

- **K1** Staff code [`staffCode`], typed on the staff keyboard, shown as dots.
- **K2 Staff panel** (F9 + code): totals and the end-of-day summary (total taken, €10 cash paid, sweets given, sponsor items given and left per tier, tickets given), the cash fallback switch and its counter (€10 cash x/3), (jackpot lines only when the jackpot is on), the live wheel odds, the stock per item, clock, mode, waiting events, version. Actions:
  1 Undo last payment (second Enter; marks it "undone", never deletes) · 2 Free play (€0, needs a reason) · 3 Test mode (separate ledger, banner) ·
  4 Backup now · 5 Export CSV · 6 Hide a nickname · 7 Sound on/off · 8 Draw (start or go on; warns before 12:45) · 9 New day (code again, archives the day) ·
  S Stock: set the items left of one item · C Cash fallback on/off (R27, logged) · J Jackpot fix (only when the jackpot is on) · U Undo the draw (needs a reason).
  Every manual change is saved as an event with the time (D14). The panel can open at the title screen, or at "CLICK TO FLY" during a payment.
- **K3 Draw:** follows R14 with `secureRandom()`. The draw is never automatic.

## Data that must never be lost

- **D1 Save first, then show:** each event is saved (server: SQLite + log) before the next screen appears.
- **D2 Three copies:** SQLite in WAL mode with full sync; a log file that only grows (`santa-live.log.jsonl`); a copy of both on the USB stick after every payment, draw or undo and every 5 minutes. Also a copy in `SantaTUS-data/backups`.
- **D3 Resume:** an open payment reopens after a browser or laptop restart, with the right tries left ("WELCOME BACK").
- **D4 Server down:** events wait in the browser (red banner), and are sent again every 3 seconds.
- **D5 Never delete:** undo and hide only mark; new day moves the files to `SantaTUS-data/archive`.
- **D6 Restore:** move to the spare laptop with the USB backup in under 10 minutes (docs/MARKET-DAY.md).
- **D7 Test data apart:** test mode uses the `test` ledger (`santa-test.db`).
- **D8 Privacy:** only a nickname is stored.
- **D9 State from the log:** jackpot, stock, tickets, payments, wins and cash paid are rebuilt from the saved events (`ledger.js`, `prizes.js`), never from timers in memory. A crash or reload gives the exact same state.
- **D10 Jackpot clock:** saved timestamps only; the latest saved time counts, so a clock that goes back never lowers the jackpot (except after a win), and it never goes above €30 (R13).
- **D11 Wheel after a crash:** the saved wheel result is shown again ("YOUR WHEEL RESULT"). The same payment never spins again.
- **D12 Stock and caps** are checked before the spin; stock never goes below 0. A prize is given only when staff confirm; undo is always logged.
- **D13 Draw:** each draw step is saved; it cannot run twice unless staff undo it (logged).
- **D14 Manual changes:** every change in F9 (stock, jackpot fix, undo, draw undo, test mode, new day, late payment) is an event with the time. New day starts the jackpot, stock, caps and stats again and keeps the old logs. Test mode never counts toward the jackpot, stock, caps or stats (D7).

USB stick: the server uses a drive that has a `SantaTUS-backup` folder, otherwise the first removable drive.
Data folder: `Documents\SantaTUS-data` (W6), outside the game folder.

## Saved events

All records are events, saved in order. The state (payments, board, totals) is rebuilt from them by `ledger.js buildState()`.
Common fields: `id` (unique), `n` (order number), `ts` (time in ms), `t` (type).

| t | Fields | Meaning |
| --- | --- | --- |
| `pay` | pid, kind (`p1`, `p3`, `p5`, `t1`, `t3`, `t6`, `free`), amount, tries, bonus (tickets, key 3), buy (tickets, keys 4-6), reason | a new payment |
| `try` | pid, tryNo, pillars, restarts, source (`paid`, `free-p10`, `free-wheel`) | one finished try |
| `award` | pid, kind (`p10`, `wheel`, `swap`, `tickets`, `consolation`; old days: `p30`), tickets [numbers, only on kind `tickets`], add (tickets to give at the end), freeTry, choice; wheel: result, cash, jackpot (euro), sponsor (tier), odds (the live odds used); tickets: parts [{why, n}], legend | a prize |
| `item` | pid, tier, item | the sponsor item staff gave at the hand-over |
| `nick` | pid, nick (null = skipped) | nickname |
| `done` | pid | hand-over confirmed |
| `undo` | pid (a payment) or what: `draw` + reason | undo a payment, or the whole draw |
| `hide` | pid | nickname hidden |
| `draw` | prize (`item`, `rest`, `jackpot`), tier, item, items, ticket (null = no tickets), amount, count | one draw step |
| `nothere` | draw (id), ticket, reason | the drawn winner was not there |
| `stock` | item, left, before | staff set the items left |
| `jackpot` | value, before | staff fixed the jackpot |
| `staff` | action, detail, on, pid | other staff actions (test mode, backup, export, new day, late payment, `cash-fallback` on/off, `cash-paid`) |

Server API (127.0.0.1 only): `GET /api/health`, `GET /api/events?ledger=live|test&after=n`, `POST /api/events?ledger=`,
`POST /api/backup`, `POST /api/export?ledger=` (CSV body), `POST /api/newday?ledger=`.

**Leaderboard:** L1 best chimneys per payment, a tie goes to the latest player. L2 top 15 "BEST PLAYERS" with LEGEND / MYTHIC / GODLIKE badges.
L3 updates on hand-over; a second screen can open `?view=board` on the same laptop.

## Test link and Windows install

- **P1** The test link (GitHub Pages) has no server: results stay in that browser, banner "TEST VERSION". `?mode=browser` forces this mode anywhere.
- **P2** The full flow works there (code, keys 1-6).
- **P3** Feedback names the screen or rule ("S8: tiles too small"). See docs/STAFF-TESTING.md.
- **P4** Test on a laptop or a 16:9 screen.
- **W1** One ZIP: unzip, double-click "Start Santa TUS". **W2** official embeddable Python inside, no home-made .exe.
- **W3** The start file catches: run from inside the ZIP, already running (opens the screen), no USB (warns), busy port (next port).
- **W4** Chrome kiosk, else Edge kiosk. "Start Santa TUS (window)" opens a normal window. **W5** server only on 127.0.0.1.
- **W6** Data in Documents\SantaTUS-data. **W7** health check at start. **W8** auto-start (optional, not built).
- **W9** GitHub Actions builds and tests the ZIP on Windows for each `v*` tag. **W10** docs/INSTALL.md.

## Acceptance tests

Automatic: **N** = `npm test`, **S** = `npm run test:server`, **F** = `npm run test:flow`, **W** = Windows ZIP workflow. Manual = dress rehearsal.

| ID | Situation | Expected | How |
| --- | --- | --- | --- |
| T1 | crash at 1-4 | free restart; crash at 5 is not (R3) | N |
| T2 | crash at 1 four times | 4th uses the try, best 1, no prize | N |
| T3 | €2.50, best 7 | no prize | N |
| T4 | €2.50, best 12, sweet | hand-over: "GIVE 1 SWEET" | N, F |
| T5 | best 12, free try, then 14 | no prize; R11 on: sweet | N |
| T6 | best 12, free try, then 21 | wheel spin, no sweet, no 2nd choice | N |
| T7 | try 22 | at the end: choice, then wheel (R9) | N |
| T8 | 22, sweet, wheel free try, then 9 | best 22, no 2nd spin | N |
| T9 | 33, sweet, wheel +2 | choice -> wheel -> 3 tickets + LEGEND; 5 tickets | N |
| T10 | €6.50: 5, 12, 9 | choice after the 3rd try | N |
| T11 | €10: try 1 = 23 | no prize before all 5 tries are played | N |
| T12 | browser closed after try 1 of €6.50 | reopens, 2 tries left, best kept | N, F |
| T13 | server stopped during a game | red warning, play goes on, saved later | F |
| T14 | restart / power cut | everything intact | S |
| T15 | 100,000 spins (base odds) | each within 0.5 points, no €10 cash at the start | N |
| T16 | draw, no tickets | items stay with the team, jackpot stays with the charity | N |
| T17 | draw with tickets | only issued numbers, each ticket wins once, all items then the jackpot; cannot run twice unless undone | N |
| T18 | test mode | no effect on live board or totals | N |
| T19 | undo last payment | out of totals, stock and caps, kept as undone | N |
| T20 | 4 x €2.50 + 2 x €6.50 + 1 x €10 | €33 taken | N |
| T21 | tie on 18 | latest one higher | N |
| T22 | 4 hours of play | 60 fps, no slowdown | manual |
| T23 | crash at 37 | same prizes as 30, board shows 37 | N |
| T24 | passes 40 / 30 | "MYTHIC SAM" / "LEGEND ANA" | N |
| T25 | passes 50 | beat screen, no free-try tile, "GODLIKE" tag | N |
| T26 | 10,000 courses | all fair | N |
| T27 | fresh Windows 11 + ZIP | playing in 5 minutes | W (smoke) + manual |
| T28 | start file inside the ZIP | "Unzip the folder first" | W |
| T29 | new version over the old folder | data still there | S |
| T30 | test link, no server | plays, banner, browser only | F |
| T32 | crash messages | C1-C4 state, mood and lines are right; no "play again" | N |
| T31 | flight music | ends exactly at chimney 30, no loop before; tempo 140-260 bpm | N |
| T33 | each price key 1-6 | PLAY €2.50/1, €6.50/3, €10/5 + 1 bonus ticket "BEST VALUE +1 BONUS TICKET"; TICKETS ONLY €2.50/1, €6.50/3, €10/6; the old €2 price is gone | N |
| T34 | chain of free tries 12 -> 21 -> 31 | choice, wheel, then the ticket screen after the last free try (R10); every try that reached 10 keeps its ticket | N |
| T35 | start of the day | base odds 4/8/24/26/38, no €10 cash, no jackpot | N |
| T36 | GOLD win | the player picks cinema or bowling, sponsor name shown; stock 2 -> 1 | N, F |
| T37 | SILVER / BRONZE win | the player picks from what is left | N, F |
| T38 | same nickname wins again | "ALREADY WON?" Y = +2 tickets on the same ticket screen, the item is free again (R23) | N, F |
| T39 | each tier sells out | its chance to +2 TICKETS, "SOLD OUT"; no €10 cash until ALL tiers are sold out, then 2% | N |
| T40 | 3 x €10 CASH | cash slice off again; €30 paid = the worst case (R27) | N |
| T41 | jackpot switched on (test config) | 3% slice, max 2 wheel wins a day | N |
| T42 | 2,000 random days | odds = 100% before every spin, stock never below 0 | N |
| T43 | jackpot growth (jackpot on) | €10, +€10 every hour from the first paid game, max €30, back to €10 after a win | N |
| T44 | clock goes back / jumps (jackpot on) | jackpot never goes down; growth only in the day window | N |
| T45 | worst case (jackpot on) | jackpot paid per day <= €60 | N |
| T46 | draw with leftover items | bronze, silver, gold; NOT HERE draws the same prize again; no tickets left: the rest stays with the team (T46b: jackpot on = jackpot last) | N, F |
| T47 | crash and reload | the exact same odds, stock, totals and draw; never spins again. T47b: reload DURING the spin shows "YOUR WHEEL RESULT", one spin only | N, F + simulation |
| T48 | staff stock edit, jackpot fix, test mode, times | logged with "before"; test ledger has its own stock; 12:30 / 12:35 only on the event day | N |
| T49 | all sold out, €10 CASH in the browser | "PAY €10" confirmed twice, then a `cash-paid` event | F |
| T50 | TICKETS ONLY (keys 4-6) | no game: ticket screen, hand-over; numbers in order | N, F |
| T51 | 5 tries, 4 reach 10 | 4 chimney 10 tickets (+1 bonus on key 3), all on one ticket screen | N, F |
| T52 | key 3, no try reaches 10 | the bonus ticket still comes | N |
| T53 | F9 key C | cash fallback off = no cash slice; on again = 2%; both switches logged; `CASH_FALLBACK_ENABLED = false` = never | N, F |
| T54 | R13 jackpot off | no wheel slice, not in the draw, hidden on all screens | N, screenshots |

## Simulation results (R25, R27, T47)

Simulation: 10,000 days per case, 18 cases (node scripts/simulate.js). Guesses: price mix 40%/30%/15%/5%/5%/5% (PLAY €2.50/€6.50/€10, TICKETS ONLY €2.50/€6.50/€10), another try of the payment passes 10: 50%, free try at chimney 10 35%, same nickname wins again 10%, draw winner not here 10%, payments spread from 09:00 to 12:35, one crash and reload at mid-day. Jackpot OFF, cash fallback ON.

| Payments | P(20) | P(30) | Spins avg | €10 cash avg / 95% / max | Gold / silver / bronze won (wheel) avg | Sold out % (avg time) G / S / B | Items left for draw avg | Tickets avg | Sweets avg | Taken avg | Left for charity avg / min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | 0.5 | 0.1 | 17.3 | €0 / €0 / €0 | 0.6 / 1.2 / 3.8 | 14.4% (11:14) / 3.9% (11:44) / 0% (12:07) | 13.4 | 120.2 | 18.5 | €189 | €189 / €123.5 |
| 35 | 0.5 | 0.2 | 17.3 | €0 / €0 / €0 | 0.6 / 1.2 / 3.8 | 14.6% (11:14) / 3.9% (11:45) / 0% (-) | 13.4 | 139 | 18.6 | €188.8 | €188.8 / €111 |
| 35 | 0.8 | 0.1 | 25.4 | €0 / €0 / €0 | 0.8 / 1.8 / 5.5 | 25.1% (11:11) / 11.5% (11:39) / 0.2% (12:15) | 10.8 | 132.4 | 19 | €188.8 | €188.8 / €122.5 |
| 35 | 0.8 | 0.2 | 25.3 | €0 / €0 / €0 | 0.9 / 1.8 / 5.5 | 25.9% (11:10) / 12.1% (11:38) / 0.2% (12:15) | 10.8 | 152.7 | 19 | €189.1 | €189.1 / €130.5 |
| 35 | 1 | 0.1 | 29.8 | €0 / €0 / €0 | 1 / 2.1 / 6.5 | 32% (11:09) / 18.4% (11:38) / 1.1% (12:13) | 9.5 | 139.4 | 19.4 | €188.8 | €188.8 / €119 |
| 35 | 1 | 0.2 | 29.7 | €0 / €0 / €0 | 1 / 2.1 / 6.5 | 31.3% (11:08) / 17.7% (11:38) / 0.9% (12:12) | 9.5 | 160.5 | 19.3 | €189 | €189 / €130.5 |
| 50 | 0.5 | 0.1 | 24.7 | €0 / €0 / €0 | 0.8 / 1.7 / 5.4 | 24.4% (11:12) / 10.8% (11:39) / 0.3% (12:13) | 11 | 171.6 | 26.4 | €270.2 | €270.2 / €191.5 |
| 50 | 0.5 | 0.2 | 24.6 | €0 / €0 / €0 | 0.8 / 1.8 / 5.4 | 24.6% (11:08) / 11.2% (11:38) / 0.2% (12:17) | 11.1 | 198.7 | 26.4 | €269.9 | €269.9 / €196 |
| 50 | 0.8 | 0.1 | 36.2 | €0 / €0 / €0 | 1.1 / 2.4 / 7.9 | 40.2% (11:05) / 28.5% (11:34) / 4.8% (12:09) | 7.6 | 189.4 | 27.2 | €269.6 | €269.6 / €194.5 |
| 50 | 0.8 | 0.2 | 36.2 | €0 / €0 / €10 | 1.1 / 2.4 / 7.8 | 40.4% (11:05) / 27.7% (11:34) / 4.1% (12:09) | 7.6 | 218.5 | 27.2 | €269.9 | €269.9 / €195.5 |
| 50 | 1 | 0.1 | 42.5 | €0 / €0 / €20 | 1.3 / 2.8 / 9.1 | 48.9% (11:01) / 39.6% (11:28) / 12.6% (12:06) | 5.9 | 200.2 | 27.6 | €269.8 | €269.7 / €187.5 |
| 50 | 1 | 0.2 | 42.5 | €0 / €0 / €10 | 1.2 / 2.7 / 9.1 | 47.8% (11:02) / 38.7% (11:29) / 12.5% (12:07) | 5.9 | 230.1 | 27.6 | €269.6 | €269.6 / €188 |
| 70 | 0.5 | 0.1 | 34.5 | €0 / €0 / €10 | 1.1 / 2.4 / 7.5 | 37.9% (11:04) / 25.9% (11:35) / 3.7% (12:09) | 8.1 | 240.5 | 37.1 | €377.9 | €377.9 / €288.5 |
| 70 | 0.5 | 0.2 | 34.4 | €0 / €0 / €0 | 1.1 / 2.4 / 7.5 | 38.4% (11:05) / 26.2% (11:34) / 3.8% (12:10) | 8.1 | 278.3 | 37 | €378 | €378 / €292.5 |
| 70 | 0.8 | 0.1 | 50.6 | €0.1 / €0 / €30 | 1.4 / 3.1 / 10.5 | 57.6% (10:58) / 52.2% (11:23) / 31% (12:00) | 4 | 267 | 38 | €377.8 | €377.7 / €289 |
| 70 | 0.8 | 0.2 | 50.7 | €0.1 / €0 / €20 | 1.4 / 3.1 / 10.5 | 58.1% (10:58) / 53.5% (11:22) / 30.7% (12:01) | 4 | 307.9 | 38.1 | €378 | €378 / €289 |
| 70 | 1 | 0.1 | 59.5 | €0.3 / €0 / €30 | 1.5 / 3.4 / 11.7 | 66.4% (10:53) / 65.3% (11:16) / 55.2% (11:54) | 2.4 | 283.9 | 38.7 | €377.9 | €377.7 / €295 |
| 70 | 1 | 0.2 | 59.5 | €0.3 / €0 / €20 | 1.5 / 3.3 / 11.7 | 67.4% (10:54) / 64.2% (11:17) / 55.2% (11:53) | 2.4 | 325.9 | 38.7 | €378.3 | €378 / €280.5 |

Checks over all 180,000 days: €10 cash paid <= €30: **PASS** (highest €30) · no jackpot paid while it is off: **PASS** · odds add up to 100% before every spin: **PASS** · state after reload = before: **PASS** · days where prize money was more than the takings: **0**.

How to read it: P(20) / P(30) = the chance that a payment's best try passes chimney 20 / 30. "Left for charity" = takings - €10 cash paid (sweets, tickets and printing are not in it; sponsor items cost nothing). Worst case cash per day is €30 (R27); it only happens when every sponsor prize is gone. "Tickets avg" = draw tickets given a day: have at least 400 cloakroom tickets.

## Open decisions (from the analysis)

1 R11 consolation on/off (off) · 2 R3 limit (3, on) · 3 last game before the draw (not built) · 4 winner not there (redraw with reason) ·
5 cookie allowed? (`choice` enabled) · 6 leaderboard same screen (yes; `?view=board` for a 2nd screen) · 7 mouse or arcade button (mouse) ·
8 paid play 18+? (`text.ageNote`) · 9 difficulty targets (play tests) · 10 public repo (yes) · 11 level 5 = level 4 (yes) · 12 title music (Silent Night, quick Christmas waltz, always on, mute in panel).
