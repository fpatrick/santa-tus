# SPEC.md: Santa TUS rules, screens, data and tests (source of truth)

Based on "Santa TUS game: requirements analysis" (24 Oct 2026). Every rule has an ID. To ask for a change,
quote the ID: "R7: free try 35%". Claude: use Grep on the ID, do not read this whole file.
Marked *proposal* = not yet agreed by the group. Values in brackets live in `src/config.js`.

## Goal

Run the stall's whole game, prize and money logic on 26 November 2026, 9:00-13:00, without losing a single record.
One 16:9 screen (1920 x 1080): the game on the left 1280 px, the leaderboard panel on the right 640 px.
Out of scope: online play, accounts, card payments, emails or phone numbers, phone or tablet version, changes on market day.

## Game rules

Every payment gets one set of prizes, decided by its best try.

**Paying and trying**

- **R1 Prices:** €2 = 1 try, €5 = 3 tries [`prices`]. Staff choose one after typing the code.
- **R2 Best try counts:** inside one payment, the highest chimney reached in any try decides the prizes.
- **R3 Free restart:** crash before chimney 5 and the try restarts without using it, at most 3 times per try [`freeRestart`] (*proposal*, on).
- **R4 The course:** 50 chimneys in 5 levels. Harder at 10, 20, 30, 40; a sound announces each level (no text on screen). Each level has its own sky colour and more snow (almost none at level 1, a storm at level 5) [`scenery`]. Bottom: brick chimneys. Top: a stack of Christmas presents; when Santa passes, the presents fly into his TUS bag, which grows with each chimney. Passing 50 beats the game and ends the try.

| Level | Chimneys | Feel | What changes [`levels`] | Target pass rate (*proposal*) |
| --- | --- | --- | --- | --- |
| 1 Easy | 1-10 | A child can do it | slow, wide gaps | 80% |
| 2 Medium | 11-20 | Many players lose here | faster, smaller gaps | 25% |
| 3 Hard | 21-30 | Very hard, never impossible | gaps move slowly up and down | 6% |
| 4 Veteran | 31-40 | For Flappy Bird veterans | big speed jump, tight moving gaps | 1% |
| 5 Master | 41-50 | Bragging rights | as hard as level 4 (*proposal*) | very few |

**Fairness check:** every gap can be reached from the one before. `course.js isFairStep()` checks each chimney it builds,
using what a player can surely do [`fair`]. T26 builds 10,000 courses.

**Prizes**

- **R5 Chimney 10 choice:** once per payment, when no tries are left and the best try is 10 or more. The player picks a small prize (cookie, 3D token, sticker) or 1 free try [`choice`]. A free try gives up the prize and the choice is not offered again. After beating the game (50) there is no free-try tile.
- **R6 Chimney 20 prize:** the first time a try in this payment passes 20: at the end of that try, "YOU WON A SPIN ON THE WHEEL!", then the wheel shows and the player clicks to spin it. No jackpot ticket at 20 [`tickets.p20` = 0].
- **R7 The wheel:** 40% free try, 30% +2 jackpot tickets, 28% +5 jackpot tickets, 2% €10 cash [`wheel.outcomes`]. When the player clicks, `secureRandom()` picks the result and it is SAVED before the spin starts. The animation only shows it.
  A wooden wheel with 7 big slices with icons (same total odds) [`pieces`]. Each result has a tier 1-4: effects and sounds grow with the tier (VS-style chest opening, Christmas bells: rays, coins, flashes, shake, fireworks).
- **R8 Chimney 30 prize:** the first time a try passes 30: 3 jackpot tickets [`tickets.p30`] and the tag LEGEND before the name.
- **R9 Prizes add up:** reaching 30 also gives the 20 prizes and the 10 choice.
- **R10 Free tries:** a free try (from R5 or the wheel) is one more try on the same payment; the best try still counts. Never a second wheel spin or a second choice.
- **R11 Consolation** (*proposal*, off) [`consolation.on`]: gave up the 10 prize for a free try and ended below 20: still 1 sticker.

Order after each try (from `rules.js nextStep`): chimney 20 ticket -> wheel -> chimney 30 tickets -> fly again if tries are left -> chimney 10 choice -> consolation -> nickname -> hand-over.

**After the prizes**

- **R19 No prizes after 30:** chimneys 31-50 count only for the leaderboard.
- **R20 Master tag:** passing 40 shows "MASTER" before the nickname everywhere (instead of LEGEND).
- **R21 Beating the game:** passing 50 ends the try with "YOU BEAT SANTA TUS!". 50 is the highest score.

**Tickets and jackpot**

- **R12 Jackpot tickets:** always called "jackpot ticket" on screen [`text.ticket`]. Numbered from #0001, in order. The screen says "GIVE 5 JACKPOT TICKETS #0041 TO #0045". Staff hand out pre-numbered cloakroom tickets in the same order.
- **R13 Jackpot:** €10 + 10% of all takings [`jackpot`], shown live. Test plays and undone payments do not count.
- **R14 Draw:** at 12:45 [`event.drawTime`] staff start the draw. One issued ticket wins the whole jackpot. No tickets: the jackpot goes to charity.

**Fair play**

- **R15** Each prize level at most once per payment.
- **R16 Hand-over:** the last screen lists everything to hand over. Staff confirm with Enter.
- **R17 No pressure:** after a payment the game goes back to the title screen. It never asks "play again?".
- **R18 Odds shown:** in the title screen loop, under the wheel, and on the A4 sheet `print/odds.html`.

## Screens

| ID | Screen | Who | Where in code |
| --- | --- | --- | --- |
| S1 | Title (attract mode): logo, prices, prizes + odds, top 10 + legends + jackpot, demo flight | nobody | attract.js |
| S2 | Staff code: F2 or a click in the top-left corner. Dots. Enter checks, Esc cancels. A wrong code just clears. | staff | screens.staffCode |
| S3 | Payment: €2 (key 1), €5 (key 2), Cancel (Esc) | staff | screens.payment |
| S4 | Get ready: "CLICK TO FLY", tries left, best | player | game.js HUD |
| S5 | Play: chimney count, level, tries left, best, next goal. A new level plays a sound only (no text). A warning glow between chimney and presents just before each level change | player | game.js, flow.flightHooks |
| S6 | Try over: chimney and best, "FREE RESTART!" (R3), "YOU BEAT SANTA TUS!" (R21) | nobody | flow.flyOnce |
| S7 | Wheel: shows "CLICK TO SPIN!", the player clicks, it spins and shows the result | player | wheel.js |
| S8 | Chimney 10 choice: big tiles, mouse | player | screens.choice |
| S9 | Nickname: only for the best players list, LEGEND or MASTER. Max 12 characters, Esc = "PLAYER 37" | staff | screens.nickname |
| S10 | Hand-over: prize, ticket numbers, cash. Enter saves and goes back to S1 | staff | screens.handover |
| S11 | Staff panel: F9 + code | staff | staff.staffPanel |
| S12 | Draw: rolling numbers, winning ticket, jackpot, or "goes to charity" | staff | staff.drawScreen |
| S13 | Health check at every start: server, database, USB, clock, screen, fonts, sound, settings | nobody | main.healthCheck |

**Leaderboard panel (L2):** "JACKPOT UNTIL NOW" (biggest), "DRAW AT 12:45" + countdown on the event day, this player's prizes (chimney 10 prize, wheel spin, jackpot tickets; shown until the next game starts), "BEST PLAYERS" top 15 (rank, name with LEGEND/MASTER tag, chimneys).
Panel text is at least 28 px. **Players never need the keyboard** (mouse or a USB arcade button set as a click).

**Attract mode:** A1 1980s arcade look (Press Start 2P + VT323 pixel fonts in `assets/fonts`, neon on a night sky, scanlines, chunky Santa with a TUS bag, the TUS logo on a town building).
A2 four scenes of 8 s, then a demo that crashes [`attract`]. A3 prices 64 px+, nothing under 32 px. A4 nothing flashes more than 3 times a second.
A5 music [`music`]: Silent Night (music box) loops on the title screen. During a payment a soft Jingle Bells chorus plays under every screen (quieter while the wheel spins). When Santa flies, the full Jingle Bells starts at the first click and is timed to Santa's distance: intro + verse end at chimney 10, chorus at 20, chorus a key higher at 30 (no loop before 30, T31). After 30, verse + chorus loop two keys higher. Crash = music stops. Mute in the staff panel. A6 every word comes from `config.text`.

**Version badge:** every screen shows "BETA v0.9.x · NOT THE FINAL GAME" while `STAGE` in `src/version.js` is not FINAL.

## Staff controls

- **K1** Staff code [`staffCode`], typed on the staff keyboard, shown as dots.
- **K2 Staff panel** (F9 + code): totals (payments by type, money in, cash paid, tickets, jackpot, draw, clock, mode, waiting events, version) and actions:
  1 Undo last payment (asks for a second Enter; marks it "undone", never deletes) · 2 Free play (€0, needs a reason) · 3 Test mode (separate ledger, banner) ·
  4 Backup now · 5 Export CSV · 6 Hide a nickname (by payment number) · 7 Sound on/off · 8 Start the draw (warns before 12:45) · 9 New day (code again, archives the day).
  The panel can open at the title screen, or at "CLICK TO FLY" during a payment (to undo a wrong button).
- **K3 Draw:** follows R14 with `secureRandom()`. A second draw needs a typed reason.

## Data that must never be lost

- **D1 Save first, then show:** each event is saved (server: SQLite + log) before the next screen appears.
- **D2 Three copies:** SQLite in WAL mode with full sync; a log file that only grows (`santa-live.log.jsonl`); a copy of both on the USB stick after every payment, draw or undo and every 5 minutes. Also a copy in `SantaTUS-data/backups`.
- **D3 Resume:** an open payment reopens after a browser or laptop restart, with the right tries left ("WELCOME BACK").
- **D4 Server down:** events wait in the browser (red banner), and are sent again every 3 seconds.
- **D5 Never delete:** undo and hide only mark; new day moves the files to `SantaTUS-data/archive`.
- **D6 Restore:** move to the spare laptop with the USB backup in under 10 minutes (docs/MARKET-DAY.md).
- **D7 Test data apart:** test mode uses the `test` ledger (`santa-test.db`).
- **D8 Privacy:** only a nickname is stored.

USB stick: the server uses a drive that has a `SantaTUS-backup` folder, otherwise the first removable drive.
Data folder: `Documents\SantaTUS-data` (W6), outside the game folder.

## Saved events

All records are events, saved in order. The state (payments, board, totals) is rebuilt from them by `ledger.js buildState()`.
Common fields: `id` (unique), `n` (order number), `ts` (time in ms), `t` (type).

| t | Fields | Meaning |
| --- | --- | --- |
| `pay` | pid, kind (`p2`, `p5`, `free`), amount, tries, reason | a new payment |
| `try` | pid, tryNo, pillars, restarts, source (`paid`, `free-p10`, `free-wheel`) | one finished try |
| `award` | pid, kind (`p20`, `wheel`, `p30`, `p10`, `consolation`), tickets [numbers], cash, freeTry, result, choice | a prize |
| `nick` | pid, nick (null = skipped) | nickname |
| `done` | pid | hand-over confirmed |
| `undo` | pid | payment undone |
| `hide` | pid | nickname hidden |
| `draw` | ticket (null = no tickets), jackpot, count, reason | the draw |
| `staff` | action, detail | staff actions (test mode, backup, export, new day) |

Server API (127.0.0.1 only): `GET /api/health`, `GET /api/events?ledger=live|test&after=n`, `POST /api/events?ledger=`,
`POST /api/backup`, `POST /api/export?ledger=` (CSV body), `POST /api/newday?ledger=`.

**Leaderboard:** L1 best chimneys per payment, a tie goes to the latest player. L2 top 15 "BEST PLAYERS" with LEGEND/MASTER tags.
L3 updates on hand-over; a second screen can open `?view=board` on the same laptop.

## Test link and Windows install

- **P1** The test link (GitHub Pages) has no server: results stay in that browser, banner "TEST VERSION". `?mode=browser` forces this mode anywhere.
- **P2** The full flow works there (code, €2/€5).
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
| T1 | €2, crash at 1-4 | free restart; crash at 5 is not (R3) | N |
| T2 | crash at 1 four times | 4th uses the try, best 1, no prize | N |
| T3 | €2, best 7 | no prize | N |
| T4 | €2, best 12, sticker | hand-over: 1 sticker | N, F |
| T5 | best 12, free try, then 14 | no prize; R11 on: sticker | N |
| T6 | best 12, free try, then 21 | wheel spin, no 10 prize, no 2nd choice | N |
| T7 | 22, wheel +5 | then the choice; prize + 5 jackpot tickets | N |
| T8 | 22, wheel free try, then 9 | best 22, no 2nd spin, then choice | N |
| T9 | 33, wheel +2 | 5 jackpot tickets, LEGEND, choice with free tile | N |
| T10 | €5: 5, 12, 9 | choice after the 3rd try | N |
| T11 | €5: try 1 = 23, wheel free try | 3 tries left | N |
| T12 | browser closed after try 1 of €5 | reopens, 2 tries left, best kept | N, F |
| T13 | server stopped during a game | red warning, play goes on, saved later | F |
| T14 | restart / power cut | everything intact | S |
| T15 | 100,000 spins | each within 0.5 points | N |
| T16 | draw, no tickets | jackpot to charity | N |
| T17 | draw with tickets | only issued numbers; 2nd draw needs a reason | N |
| T18 | test mode | no effect on live board or totals | N |
| T19 | undo last payment | out of totals and jackpot, kept as undone | N |
| T20 | 30 x €2 + 10 x €5 | jackpot €21 | N |
| T21 | tie on 18 | latest one higher | N |
| T22 | 4 hours of play | 60 fps, no slowdown | manual |
| T23 | crash at 37 | same prizes as 30, board shows 37 | N |
| T24 | passes 40 / 30 | "MASTER SAM" / "LEGEND ANA" | N |
| T25 | passes 50 | beat screen, no free-try tile | N |
| T26 | 10,000 courses | all fair | N |
| T27 | fresh Windows 11 + ZIP | playing in 5 minutes | W (smoke) + manual |
| T28 | start file inside the ZIP | "Unzip the folder first" | W |
| T29 | new version over the old folder | data still there | S |
| T30 | test link, no server | plays, banner, browser only | F |
| T31 | flight music | ends exactly at chimney 30, no loop before; tempo 140-260 bpm | N |

## Open decisions (from the analysis)

1 R11 consolation on/off (off) · 2 R3 limit (3, on) · 3 last game before the draw (not built) · 4 winner not there (redraw with reason) ·
5 cookie allowed? (`choice` enabled) · 6 leaderboard same screen (yes; `?view=board` for a 2nd screen) · 7 mouse or arcade button (mouse) ·
8 paid play 18+? (`text.ageNote`) · 9 difficulty targets (play tests) · 10 public repo (yes) · 11 level 5 = level 4 (yes) · 12 title music (Silent Night, always on, mute in panel).
