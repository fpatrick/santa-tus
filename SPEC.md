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
| 3 | €10 | PLAY: 5 tries + 1 bonus draw ticket at payment | "BEST VALUE +1 BONUS DRAW ENTRY" |

- **Draw tickets come ONLY from playing: nobody can buy them.** Keys 4, 5, 6 (and every other key) do nothing on the payment screen. (The "draw entries only" prices were removed on 24 Nov 2026.)

- **R2 Best try counts:** inside one payment, the highest chimney reached in any try decides the prizes (except the chimney 10 ticket, R5).
- **R3 Free restart:** crash before chimney 5 and the try restarts without using it. At most 3 restarts per PAYMENT in total, shared by all its tries (paid and free), not 3 per try (a 5-try payment also gets 3). With 0 left, a crash before chimney 5 ends the try as normal. The screen shows "RESTARTS LEFT: X" during the payment [`freeRestart`].
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
- **R10 Free tries:** a free try (from R5 or the wheel) adds 1 try to the same payment. A free try can still win every prize level the payment has not had yet (the wheel at 20, the draw entries at 30, 40 and 50), but it NEVER gives the chimney 10 draw entry (R5). During a free try the screen shows "FREE TRY - no draw entry at chimney 10".
- **R9 Order at the end of a payment** (when no tries are left, `rules.js nextStep`): chimney 10 choice -> wheel -> nickname (if needed) -> sponsor item pick (R22, R28) -> the ticket screen (R12) -> hand-over. Prizes add up: reaching 30 also gives the wheel spin and the 10 choice.

**R5-R8 Prize ladder**

| Chimney | Prize |
| --- | --- |
| 10 | **R5** +1 draw entry for every PAID try that reaches 10 [`tickets.per10`] (5 paid tries reaching 10 = 5 entries). FREE tries (from the chimney 10 choice or the wheel) never give it. Key 3 (€10) still gives +1 bonus entry at payment. And ONCE per payment the player picks **SWEET** or **FREE TRY** [`choice`]. A free try gives up the sweet; the choice is not offered again. After beating the game (50) there is no free-try tile. |
| 20 | **R6** 1 wheel spin (R7). Max 1 spin per payment. |
| 30 | **R8** +3 draw entries [`tickets.levels.legend`] + the LEGEND tag (gold badge). |
| 40 | **R20** +4 draw entries [`tickets.levels.mythic`] + the MYTHIC tag (feral purple badge), instead of LEGEND. |
| 50 | **R21** "YOU BEAT SANTA TUS!", +5 draw entries [`tickets.levels.beat`] + the GODLIKE tag (red and blue divine badge). 50 is the highest score. |

The 30, 40 and 50 entries ADD UP (reaching 50 = 3 + 4 + 5 = 12). Each level is given ONCE per payment (the best try counts), by a paid or a free try. (Old saved days keep their old chimney 30 +5.)

- **R19** No new prizes after 30: chimneys 31-50 count only for the leaderboard and the tags. Ranks: LEGEND (30) < MYTHIC (40) < GODLIKE (50).
- **R11 Consolation** (*proposal*, off) [`consolation.on`]: gave up the 10 prize for a free try and ended below 20: still 1 sweet.

**R22 Sponsor prizes in 3 tiers** [`sponsors`] (staff can change the counts in F9, logged). Version 2 (24 Nov 2026).

| Tier | Items (count) | Who picks |
| --- | --- | --- |
| GOLD "€20 VOUCHER" | Lidl €20 voucher (3) · One4all €20 voucher (2) | the winner picks one that is left |
| SILVER "GAMING OR DAY OUT" | PlayStation €10 voucher (4) · Xbox €10 voucher (2) · Vue cinema, 4 tickets (1) · Fun World bowling, 4 games (1) | the winner picks one that is left |
| BRONZE "GIFT" | Rocknshop shirt (3) · The Works book set (1) · The Works art set (1) · Serenity Scents candle (1) · Serenity Scents room spray (1) | the winner picks one that is left |

- RESERVED, never on the wheel [`reserved`]: ONLY GTA 6 for PS5 x1 (the 13:00 draw, last prize). It is in the F9 stock list (staff can edit the count) and can only be given by the draw.
- The prize screens show the sponsor name (text only; logos later).
- **R23 No limit per nickname (changed 25 Nov):** anyone can win sponsor prizes as many times as the wheel gives them. There is no "already won a prize today?" check any more. (Old saved days may still have a swap with `why: 'already'`; it is still read and shown as before.)
- **R22b Sponsor item pick = keyboard only:** after the wheel, the player says which item they want and STAFF press its number (or N for +2 draw entries instead). Clicking the items does nothing, so only staff can choose.
- **R28 No item wanted:** every sponsor prize pick screen (even with only 1 item left) has "N = +2 DRAW ENTRIES INSTEAD", for a player who does not want any item left in that tier. The item stays in stock (the reservation is freed) (saved as an `award` kind `swap` with `why: 'declined'`).
- An item is **reserved** when the wheel lands on its tier (so stock can never go below 0) and **given** when staff confirm the item (the pick screen). N in R28 gives +2 draw tickets and frees the reservation.

**R7 The wheel** [`wheel.outcomes`]

| Slice | Base chance |
| --- | --- |
| GOLD €20 VOUCHER | 4% |
| SILVER GAMING / DAY OUT | 12% |
| BRONZE GIFT | 14% |
| FREE TRY | 26% |
| +2 DRAW ENTRIES | 44% |

- **R24 Sold out: chance moves DOWN only** [`wheel.soldOutDown`], worked out before every spin from the saved log (`prizes.js liveOdds`):
  - GOLD sold out: its chance goes to SILVER. SILVER sold out: its chance (and any it got from GOLD) goes to BRONZE. BRONZE sold out: its chance (and any it got) goes to +2 DRAW ENTRIES.
  - Applied from the top down, so the chance keeps moving down until it reaches a tier with stock, or +2 DRAW ENTRIES. It never moves up: GOLD is never more than 4%. FREE TRY always stays 26%.
  - The live odds always add up to exactly 100% (the +2 DRAW ENTRIES slice takes what is left).
  - "Sold out" = no free items in the tier (items left minus items won on the wheel and not given yet).
- The computer picks the result with `secureRandom()` and SAVES it before the animation (D1). After a crash the same result is shown again; a payment never spins twice (D11).
- **Wheel drawing:** the wheel is ALWAYS drawn from the live odds: each slice size = its real chance. A slice with 0% is not drawn (no empty or "SOLD OUT" slices). The wheel is drawn again whenever the live odds change (a win, an F9 edit, an undo).
- The wheel screen always shows the live odds, the items left per tier ("ONLY 1 LEFT!" when a tier has 1 item) and "REACH CHIMNEY 20 = SPIN: X IN 10 WIN A PRIZE" [`text.spinChance`], X = the live prize chance (gold + silver + bronze) / 10, rounded down; hidden when X is 0. The title screen shows the same line.
- Each result has a tier 1-4: effects and sounds grow with the tier.

**R27 Cash fallback: MANUAL only** [`CASH_FALLBACK_ENABLED`, `CASH_FALLBACK_MAX_WINS`]

- `CASH_FALLBACK_ENABLED = false` in config (off at the start of the day).
- Staff can switch it ON in F9 (key C) ONLY when GOLD, SILVER and BRONZE are ALL sold out; otherwise the switch is greyed out and refuses. Switching OFF always works. Each switch is a `staff` event (`cash-fallback`, on/off).
- When ON (and all tiers are still sold out): a "€10 CASH" slice at 2% [`wheel` cash `onWhenAllEmpty`], taken from +2 DRAW ENTRIES.
- €10 CASH can be won at most 3 times per day (`CASH_FALLBACK_MAX_WINS = 3`); after that its chance goes back to +2 DRAW ENTRIES.
- If stock comes back to any tier (an F9 stock edit or an undo), the switch turns OFF by itself, saved as a `staff` event `cash-fallback` off with detail "auto: stock is back".
- Staff screen: "PAY €10", confirmed twice, then saved (`staff` event `cash-paid` with the payment number).
- **Worst case: €10 x 3 = €30 cash paid per day.** No other money prize exists while the jackpot is off (R13).

**R12-R14 Tickets, jackpot and draw**

- **R12 Draw tickets:** On screen, draw tickets are called DRAW ENTRIES (one: DRAW ENTRY) [`text.ticket`, `text.tickets`]; a game play is always a TRY. Code, config and SPEC keep "draw ticket". A payment collects tickets from: each PAID try that reaches 10 (+1), key 3 bonus (+1), chimney 30 / 40 / 50 (+3 / +4 / +5), the wheel +2 TICKETS slice (+2), R28 "+2 instead" (+2). They are all given at the END of the payment, on ONE ticket screen ("YOUR DRAW ENTRIES") that lists where they came from and their numbers; the hand-over says "WRITE ON THE NEXT CARD: DRAW ENTRIES #0012 TO #0015"; this is one `award` event (kind `tickets`). Numbers start at #0001 and go up by 1: they never repeat and never skip. Staff give ONE plain paper card per payment and write the range on it (no cloakroom tickets): about 70-110 cards a day. The F9 summary shows "Cards used" (payments with at least 1 draw entry) and "NEXT DRAW ENTRY".
- **R13 Jackpot: OFF** [`JACKPOT_ENABLED = false`]. When off, the jackpot is hidden everywhere (title screen, panel, wheel, draw, staff summary, odds sheet) and has no wheel slice. The old jackpot code stays (not deleted) for a later year: start €10, +€10 every hour, max €30, at most 2 wheel wins a day [`jackpot`].
- **R29 No top score prize** (24 Nov 2026): the best score of the day wins nothing. The leaderboard (L1, L2) is for bragging rights only.
- **R14 The draw** (13:00 [`event.drawTime`], started by staff in F9 key 8, never automatic; the draw starts straight away):
  - The prizes, in this order: 1) every bronze item not won yet, 2) every silver item not won yet, 3) every gold item not won yet, 4) GTA 6 for PS5 LAST (the reserved draw item [`reserved`]). Each draw is for one named item: the winner gets the item drawn (no picking).
  - The draw entry number shows in big text. One draw entry can win only once.
  - Staff press Enter = "GIVEN", or N = "NOT HERE - DRAW AGAIN": type a reason (logged) and the same prize is drawn again; that draw entry is out of the rest of the draw. Winners write their name and phone on their card, so staff can call them first.
  - No tickets left: the items still in the list stay with the team.
  - The draw is saved step by step and cannot run twice unless staff undo it in F9 (logged, with a reason). A stopped draw goes on from where it stopped.
  - (Jackpot on only: the jackpot is drawn last and one ticket is always kept for it.)
- **R26 Times** [`event`]: 12:45 a warning banner for the last games. 12:50 last payment: after it (and after the draw) the payment screen needs O to go on (logged). 13:00 the draw (R14). Times only apply on the event day (`event.date`), so tests on other days are never blocked.

**Fair play**

- **R16 Hand-over:** the last screen lists everything to give: "GIVE 1 SWEET", "SILVER: GIVE LIDL €20 VOUCHER" + sponsor name, "WRITE ON THE NEXT CARD: DRAW ENTRIES #0012 TO #0015". The €10 CASH fallback ("PAY €10") is confirmed twice. Staff confirm everything with Enter.
- **R17 No pressure:** after a payment the game goes back to the title screen. It never asks "play again?".
- **R18 Odds shown:** in the title screen loop, on the wheel screen (live odds), and on the A4 sheet `print/odds.html`.

## Screens

| ID | Screen | Who | Where in code |
| --- | --- | --- | --- |
| S1 | Title (attract mode): logo, prices, prizes + odds + "X IN 10", sponsors with items left per tier ("GOLD: 2 LEFT"), the draw scene (R30) + top 15, demo flight | nobody | attract.js |
| S2 | Staff code: F2 (or hold F + press 2) or a click in the top-left corner. Dots. Enter checks, Esc cancels. A wrong code just clears. | staff | screens.staffCode |
| S3 | Payment: €2.50 / €6.50 / €10 (keys 1-3; other keys do nothing), Cancel (Esc). After 12:50 or after the draw: a red warning, O to go on (R26) | staff | screens.payment |
| S4 | Get ready: "CLICK TO FLY", tries left, best | player | game.js HUD |
| S5 | Play: chimney count, level, tries left, best, next goal. A new level plays a sound only (no text). A warning glow between chimney and presents just before each level change | player | game.js, flow.flightHooks |
| S6 | Try over: the crash scene C1-C4 (Santa speaks), or "YOU BEAT SANTA TUS!" (R21) | nobody | flow.flyOnce, crash.js |
| S7 | Wheel: drawn from the live odds (no 0% slices), items left per tier ("ONLY 1 LEFT!"), "REACH CHIMNEY 20 = SPIN: X IN 10 WIN A PRIZE"; "CLICK TO SPIN!", the player clicks, it spins and shows the result | player | wheel.js |
| S8 | Chimney 10 choice: SWEET or FREE TRY, big tiles, mouse | player | screens.choice |
| S9 | Nickname: for the best players list, LEGEND, MYTHIC, GODLIKE and every sponsor winner (R23). Max 12 characters, Esc = "PLAYER 37" | staff | screens.nickname |
| S10 | Ticket screen (R12): all tickets of the payment with where they came from and the numbers. Then the hand-over (R16): €10 CASH confirmed twice, then the list. (The item pick (R22, R28) comes just before the ticket screen.) Enter saves and goes back to S1 | staff | screens.handover, handover.js |
| S11 | Staff panel: F9 (or hold F + press 9) + code | staff | staff.staffPanel |
| S12 | Draw (R14): one prize at a time, rolling numbers, the winning draw entry in big text, Enter = GIVEN, N = NOT HERE - DRAW AGAIN + reason | staff | draw.js |
| S13 | Health check at every start: server, database, USB, clock, screen, fonts, sound, settings | nobody | main.healthCheck |

**R30 Engagement lines** (title screen draw scene and the leaderboard panel) [`text`]: on the panel, a photo of the draw prize (supplied by the team, unchanged, in a gold pixel frame) [`text.drawPrizeImg`] sits beside "13:00 DRAW: WIN GTA 6", "REACH CHIMNEY 10 = 1 DRAW ENTRY", "REACH CHIMNEY 20 = SPIN: X IN 10 WIN A PRIZE" (live, R7), "DRAW ENTRIES IN THE BOX: 123" (live: all draw entries given today, not undone), and items left per tier ("GOLD: 2 LEFT", live).

**Leaderboard panel (L2):** the R30 lines ("JACKPOT" with "+€10 IN 34 MIN" only when the jackpot is on), "DRAW AT 13:00" + countdown on the event day, this player's prizes (chimney 10 prize, wheel result, draw tickets; shown until the next game starts), "BEST PLAYERS" top 15 (rank, the LEGEND / MYTHIC / GODLIKE badge, name, chimneys).
Panel text is at least 28 px. **Players never need the keyboard** (mouse or a USB arcade button set as a click).

**Attract mode:** A1 1980s arcade look (Press Start 2P + VT323 pixel fonts in `assets/fonts`, neon on a night sky, scanlines, detailed pixel-art Santa (all-red hat) in a red and gold sleigh, his burlap TUS bag tied on with ropes, the TUS logo on a town building).
A2 four scenes of 8 s, then a demo that crashes [`attract`]. A3 prices 64 px+, nothing under 32 px. A4 nothing flashes more than 3 times a second.
A5 music [`music`]: the title screen loops Silent Night as a grand chiptune RPG Christmas theme (an epic adventure-game town theme feel; our own arrangement, no melody from any real game): rolling 6/8 (one beat = one eighth, 240 bpm, about 78 s): a heroic 4-bar fanfare with timpani, verse 1 gentle (lead with vibrato, harp arpeggios, soft strings, light sleigh bells only), a drum roll and timpani into a key change up, verse 2 grand (lead in octaves with harmony, bell counter-lines, faster harp sweeps, rolling drums: kick on 1, snare on 4, no dance kick). During a payment a soft Jingle Bells chorus plays under every screen (quieter while the wheel spins). When Santa flies, the full Jingle Bells starts at the first click, arranged as an epic adventure-game title theme played by a chip orchestra, different from the title song (B-flat major; the melody is the real Jingle Bells note for note, loud and clear on top as a clean 16-bit pulse-wave lead (like an HD pixel game) with a soft triangle body; instruments: soft brass harmony, galloping strings and running violins, low brass and basses, sustained horns, tuned timpani, a field snare, a big bass drum, cymbals, a reverse cymbal swell, a glockenspiel and a small hall echo; the drums build up: an intro of anticipation (low strings pulse, timpani coming closer, a snare and timpani roll, a cymbal swell), a verse that starts as a light march and becomes the full march with trumpets in octaves at bar 9, a chorus with the whole orchestra, and a roll + swell before every new part; key changes up at chimney 20 and after 30; inspired by famous adventure-game themes, our own arrangement, no melody from any real game), and it is timed to Santa's distance: intro + verse end at chimney 10, chorus at 20, chorus a key higher at 30 (no loop before 30, T31). After 30, verse + chorus loop two keys higher. Crash = music stops. Mute in the staff panel. A6 every word comes from `config.text`.

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
| C3 | No tries left, prizes to collect (or jackpot tickets kept) | laughs and jumps | "WHAT A RIDE! Let's get your prizes: a spin on the wheel and a prize from chimney 10!" / "Keep your 2 jackpot tickets safe. The draw is at 13:00!" |
| C4 | No tries left, nothing won | sad, a tear, sad trombone | "GAME OVER. So close! Chimney 10 was only 2 away. Thank you for helping kids with diabetes at UHL!" |

Never "play again?" (R17). The title-screen demo shows only the tumble (no zoom, no speech).

## Staff controls

- **K1** Staff code [`staffCode`], typed on the staff keyboard, shown as dots.
- **K2 Staff panel** (F9 + code): totals and the end-of-day summary (total taken, payments per key, cards used, sweets given, items given and left per tier (and reserved), "+2 instead" count, €10 cash paid, draw entries given, the draw winners), the cash fallback switch and its counter (€10 cash x/3), (jackpot lines only when the jackpot is on), the live wheel odds, the stock per item, clock, mode, waiting events, version. Actions:
  1 Undo last payment (second Enter; marks it "undone", never deletes) · 2 Free play (€0, needs a reason) · 3 Test mode (separate ledger, banner) ·
  4 Backup now · 5 Export CSV · 6 Hide a nickname · 7 Sound on/off · 8 Draw (start or go on; warns before 13:00) · 9 New day (code again, archives the day) ·
  S Stock: set the items left of one item (reserved items too) · C Cash fallback on/off (R27, logged) · J Jackpot fix (only when the jackpot is on) · U Undo the draw (needs a reason).
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
| `pay` | pid, kind (`p1`, `p3`, `p5`, `free`), amount, tries, bonus (tickets, key 3), reason | a new payment |
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
| T33 | each price key 1-3 | €2.50/1, €6.50/3, €10/5 + 1 bonus ticket "BEST VALUE +1 BONUS DRAW ENTRY"; only 3 prices, no way to buy draw entries; the old €2 price is gone | N |
| T34 | chain of free tries 12 -> 21 -> 31 | choice, wheel, then the ticket screen after the last free try (R10); every try that reached 10 keeps its ticket | N |
| T35 | start of the day | base odds 4/12/14/26/44, no €10 cash, no jackpot; 3 IN 10 | N |
| T36 | GOLD win | the player picks a €20 voucher, sponsor name shown; stock 3 -> 2 | N, F |
| T37 | SILVER / BRONZE win | the player picks from what is left | N, F |
| T38 | same nickname wins again | no question: the same nickname gets a 2nd sponsor item (R23 changed 25 Nov) | N, F |
| T39 | each tier sells out | chance moves down only (gold -> silver -> bronze -> +2), GOLD never above 4%, FREE TRY 26%, 0% slices not drawn; no cash unless staff switch it on | N |
| T40 | 3 x €10 CASH (switched on) | cash slice off again; €30 paid = the worst case (R27) | N |
| T41 | jackpot switched on (test config) | 3% slice, max 2 wheel wins a day | N |
| T42 | 2,000 random days | odds = 100% before every spin, stock never below 0 | N |
| T43 | jackpot growth (jackpot on) | €10, +€10 every hour from the first paid game, max €30, back to €10 after a win | N |
| T44 | clock goes back / jumps (jackpot on) | jackpot never goes down; growth only in the day window | N |
| T45 | worst case (jackpot on) | jackpot paid per day <= €60 | N |
| T46 | draw with leftover items | bronze, silver, gold, GTA 6 last; NOT HERE draws the same prize again; no tickets left: the rest stays with the team (T46b: jackpot on = jackpot last) | N, F |
| T47 | crash and reload | the exact same odds, stock, totals and draw; never spins again. T47b: reload DURING the spin shows "YOUR WHEEL RESULT", one spin only | N, F + simulation |
| T48 | staff stock edit, jackpot fix, test mode, times | logged with "before"; test ledger has its own stock; 12:45 / 12:50 only on the event day | N |
| T49 | all sold out, €10 CASH in the browser | "PAY €10" confirmed twice, then a `cash-paid` event | F |
| T50 | keys 4-6 on the payment screen | nothing happens (no payment saved) | F |
| T51 | 5 tries, 4 reach 10 | 4 chimney 10 tickets (+1 bonus on key 3), all on one ticket screen | N, F |
| T52 | key 3, no try reaches 10 | the bonus ticket still comes | N |
| T53 | F9 key C | refused (greyed) while any tier has stock; on when all sold out = 2%; stock back = off by itself (logged) | N, F |
| T54 | R13 jackpot off | no wheel slice, not in the draw, hidden on all screens | N, screenshots |
| T55 | on-screen words | no "ticket" or "raffle" in on-screen texts: DRAW ENTRY / DRAW ENTRIES, a play is a TRY | N |
| T56 | cards used | = payments with at least 1 draw entry | N |
| T57 | R28 N on the pick screen | +2 draw entries, item stays in stock | N |
| T58 | no top score prize (R29) | no top score text on any screen, no F9 top score key, the draw starts straight away | F (quick check) |
| T59 | draw order with reserved items | bronze, silver, gold, then GTA 6 last; reserved items never on the wheel and never picked at a hand-over | N |
| T60 | every sold-out mix (R24, R27) | none G4 S12 B14 F26 E44 · gold S16 B14 F26 E44 · silver G4 B26 F26 E44 · gold+silver B30 F26 E44 · bronze G4 S12 F26 E58 · gold+bronze S16 F26 E58 · silver+bronze G4 F26 E70 · all F26 E74 · all + cash ON F26 E72 C2; cash switch refused while any tier has stock | N |
| T61 | wheel slices and picks (R7, R24) | slice sizes = live odds; 20,000 picks per mix never land on a 0% slice and stay within 1.2 points | N |
| T62 | cash cap and restock (R27) | max 3 cash wins, then back to +2; restock = cash off by itself (logged) | N |
| T63 | GTA 6 (R14, R22) | never on the wheel or at a hand-over; drawn last, given exactly once, also after NOT HERE; one draw entry wins once | N |
| T64 | crash during the draw, draw undo (R14, D9, D13) | reload gives the same next prize and totals, the draw goes on; undo (with reason) lets it run again | N |
| T65 | CSV totals (K2, D5) | taken, draw entries, cards, sweets, undone and cash in the CSV = the summary, after an undo | N |
| T66 | no top score anywhere (R29) | not in the code, the words, the summary or the CSV | N |
| T67 | times (R26) | 12:45 warning, 12:50 last payment, 13:00 draw; no other file has 12:30, 12:35 or 12:45 written in it | N |
| T68 | chimney 10 entry, paid tries only (R5, R10) | €2.50 with a free try: 1 entry (not 2); a free try can still win 20 and 30; €10 bonus stays | N |
| T69 | restarts per payment (R3) | 3 in total for a 5-try payment, shared; 0 left = a crash before 5 ends the try | N |
| T70 | chimney 30 / 40 / 50 (R8, R20, R21) | 3 / 7 / 12 entries, once per payment (best try) | N |

## Simulation results (R25, R27, T47)

Version 1.0.0 (25 Nov 2026). Simulation: 10,000 days per case, 36 cases (node scripts/simulate.js). Guesses: price mix 45%/35%/20% (€2.50/€6.50/€10), free try at chimney 10 35%, same nickname wins again 10%, draw winner not here 10%, payments spread from 09:00 to 12:50, one crash and reload at mid-day. Cash fallback OFF (manual). Gold stock 5.

Short table: chance to pass 20 (after 10) = 0.8 and to pass 30 (after 20) = 0.2. This is the busiest case for the stock; with 0.5 there are fewer spins, and P30 only changes the chimney 30 draw entries.

| Payments | Reach 10 | Spins | Won G / S / B | Sold out % G / S / B (avg time) | All sold out % | Left for draw | Draw entries: ch10 / bonus / wheel / ch30 = total | Cards | Sweets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | 0.5 | 22.8 | 0.8 / 2.5 / 2.9 | 0.1% (12:19) / 0.3% (12:18) / 2.5% (12:12) | 0% | 14.7 | 51.2 / 7 / 21.2 / 36.3 = 115.7 | 25.6 | 16.5 |
| 35 | 0.7 | 27.5 | 1 / 3 / 3.5 | 0.3% (12:02) / 0.8% (12:16) / 5.9% (12:11) | 0% | 13.5 | 73.8 / 7 / 25.7 / 49.8 = 156.3 | 29.9 | 19.4 |
| 35 | 0.9 | 31 | 1.1 / 3.4 / 3.9 | 0.5% (12:03) / 1.7% (12:14) / 9.9% (12:07) | 0% | 12.6 | 96.4 / 7 / 29.1 / 62.2 = 194.8 | 33.4 | 21.7 |
| 50 | 0.5 | 32.5 | 1.2 / 3.6 / 4.1 | 0.8% (12:08) / 2.5% (12:14) / 12.9% (12:07) | 0% | 12.2 | 73 / 10 / 30.6 / 51.5 = 165.1 | 36.6 | 23.5 |
| 50 | 0.7 | 39.3 | 1.4 / 4.3 / 4.8 | 1.3% (12:07) / 7.2% (12:10) / 24.7% (12:02) | 0.1% | 10.5 | 105 / 10 / 37.2 / 70.9 = 223 | 42.8 | 27.8 |
| 50 | 0.9 | 44.4 | 1.6 / 4.7 / 5.3 | 2.6% (12:04) / 11.2% (12:09) / 35.7% (11:58) | 0% | 9.3 | 137.9 / 10 / 42.5 / 89.1 = 279.4 | 47.8 | 31 |
| 70 | 0.5 | 45.6 | 1.7 / 4.9 / 5.4 | 2.9% (12:02) / 13.3% (12:08) / 38.6% (11:57) | 0.2% | 9 | 102.5 / 14 / 43.7 / 72.5 = 232.6 | 51.2 | 33 |
| 70 | 0.7 | 55 | 2 / 5.7 / 6.1 | 5.1% (12:00) / 25.8% (12:04) / 61.4% (11:50) | 0.7% | 7.2 | 147.2 / 14 / 53.8 / 99.6 = 314.5 | 59.9 | 38.9 |
| 70 | 0.9 | 62.2 | 2.2 / 6.3 / 6.5 | 7.9% (12:00) / 38.6% (12:01) / 75.9% (11:42) | 2.3% | 6 | 193.1 / 13.9 / 62.1 / 124.8 = 393.9 | 66.8 | 43.4 |

Checks over all 360,000 days: odds add up to 100% before every spin (no cash slice): **PASS** · stock never below 0: **PASS** · no cash paid: **PASS** · state after reload = before: **PASS** · GTA 6 given in every draw: **PASS**.

<details><summary>All 36 cases (P10 = pass 10; P20 = pass 20 after 10; P30 = pass 30 after 20)</summary>

| Pay | P10 | P20 | P30 | Spins | Won G / S / B | Sold out % (avg time) G / S / B | All sold out % (time) | Left for draw | Entries: ch10 / bonus / wheel / ch30 = total | Cards | Sweets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | 0.5 | 0.5 | 0.1 | 17.2 | 0.6 / 1.9 / 2.2 | 0.1% (12:16) / 0.1% (12:28) / 0.7% (12:12) | 0% (-) | 16.2 | 50.3 / 7 / 15.9 / 12.2 = 85.4 | 25.6 | 16.5 |
| 35 | 0.5 | 0.5 | 0.2 | 17.2 | 0.6 / 1.9 / 2.2 | 0% (12:27) / 0.1% (12:17) / 0.5% (12:12) | 0% (-) | 16.3 | 50.5 / 7 / 16 / 23.3 = 96.8 | 25.6 | 16.5 |
| 35 | 0.5 | 0.8 | 0.1 | 22.7 | 0.8 / 2.5 / 2.9 | 0.1% (12:13) / 0.3% (12:23) / 2.5% (12:13) | 0% (-) | 14.8 | 51.1 / 7 / 21.2 / 19.2 = 98.4 | 25.6 | 16.4 |
| 35 | 0.5 | 0.8 | 0.2 | 22.8 | 0.8 / 2.5 / 2.9 | 0.1% (12:19) / 0.3% (12:18) / 2.5% (12:12) | 0% (-) | 14.7 | 51.2 / 7 / 21.2 / 36.3 = 115.7 | 25.6 | 16.5 |
| 35 | 0.7 | 0.5 | 0.1 | 21.7 | 0.8 / 2.4 / 2.7 | 0.1% (11:47) / 0.2% (12:23) / 1.8% (12:16) | 0% (-) | 15.1 | 72.4 / 7 / 20.3 / 17.2 = 116.9 | 29.9 | 19.4 |
| 35 | 0.7 | 0.5 | 0.2 | 21.7 | 0.8 / 2.4 / 2.8 | 0.1% (12:11) / 0.2% (12:18) / 1.9% (12:15) | 0% (-) | 15 | 72.4 / 7 / 20.3 / 32.6 = 132.3 | 29.9 | 19.4 |
| 35 | 0.7 | 0.8 | 0.1 | 27.5 | 1 / 3 / 3.5 | 0.3% (12:15) / 1% (12:18) / 5.9% (12:10) | 0% (-) | 13.5 | 73.5 / 6.9 / 25.6 / 27 = 133.2 | 29.9 | 19.5 |
| 35 | 0.7 | 0.8 | 0.2 | 27.5 | 1 / 3 / 3.5 | 0.3% (12:02) / 0.8% (12:16) / 5.9% (12:11) | 0% (-) | 13.5 | 73.8 / 7 / 25.7 / 49.8 = 156.3 | 29.9 | 19.4 |
| 35 | 0.9 | 0.5 | 0.1 | 25.4 | 0.9 / 2.8 / 3.2 | 0.2% (12:17) / 0.5% (12:20) / 4.5% (12:10) | 0% (-) | 14.1 | 95.1 / 7 / 23.8 / 22.2 = 148.2 | 33.4 | 21.8 |
| 35 | 0.9 | 0.5 | 0.2 | 25.4 | 0.9 / 2.8 / 3.3 | 0.2% (12:11) / 0.6% (12:15) / 4.2% (12:09) | 0% (-) | 14 | 95.2 / 7 / 23.7 / 41.5 = 167.4 | 33.4 | 21.7 |
| 35 | 0.9 | 0.8 | 0.1 | 31.1 | 1.1 / 3.4 / 3.9 | 0.6% (12:08) / 1.9% (12:17) / 10.7% (12:07) | 0% (-) | 12.5 | 96.7 / 7 / 29 / 34.7 = 167.5 | 33.4 | 21.7 |
| 35 | 0.9 | 0.8 | 0.2 | 31 | 1.1 / 3.4 / 3.9 | 0.5% (12:03) / 1.7% (12:14) / 9.9% (12:07) | 0% (-) | 12.6 | 96.4 / 7 / 29.1 / 62.2 = 194.8 | 33.4 | 21.7 |
| 50 | 0.5 | 0.5 | 0.1 | 24.5 | 0.9 / 2.7 / 3.1 | 0.3% (12:05) / 0.5% (12:22) / 3.7% (12:11) | 0% (-) | 14.3 | 72.1 / 10 / 22.9 / 17.3 = 122.4 | 36.6 | 23.6 |
| 50 | 0.5 | 0.5 | 0.2 | 24.5 | 0.9 / 2.7 / 3.1 | 0.2% (12:12) / 0.5% (12:20) / 3.7% (12:13) | 0% (-) | 14.3 | 72 / 10 / 22.9 / 33.3 = 138.2 | 36.6 | 23.6 |
| 50 | 0.5 | 0.8 | 0.1 | 32.5 | 1.2 / 3.6 / 4.1 | 0.6% (12:04) / 2.7% (12:10) / 12% (12:05) | 0% (-) | 12.2 | 73.1 / 10 / 30.5 / 27.3 = 141 | 36.6 | 23.6 |
| 50 | 0.5 | 0.8 | 0.2 | 32.5 | 1.2 / 3.6 / 4.1 | 0.8% (12:08) / 2.5% (12:14) / 12.9% (12:07) | 0% (-) | 12.2 | 73 / 10 / 30.6 / 51.5 = 165.1 | 36.6 | 23.5 |
| 50 | 0.7 | 0.5 | 0.1 | 31 | 1.1 / 3.4 / 3.9 | 0.4% (12:03) / 2.1% (12:15) / 9.8% (12:06) | 0% (-) | 12.6 | 103.6 / 10 / 29.1 / 24.5 = 167.3 | 42.7 | 27.8 |
| 50 | 0.7 | 0.5 | 0.2 | 31 | 1.1 / 3.4 / 3.9 | 0.5% (12:11) / 2.3% (12:16) / 10.3% (12:07) | 0% (12:20) | 12.6 | 103.7 / 10 / 29 / 46.6 = 189.3 | 42.7 | 27.8 |
| 50 | 0.7 | 0.8 | 0.1 | 39.3 | 1.5 / 4.2 / 4.8 | 1.5% (12:02) / 6.4% (12:10) / 24.4% (12:02) | 0% (12:46) | 10.5 | 104.9 / 10 / 37.2 / 38.5 = 190.6 | 42.7 | 27.8 |
| 50 | 0.7 | 0.8 | 0.2 | 39.3 | 1.4 / 4.3 / 4.8 | 1.3% (12:07) / 7.2% (12:10) / 24.7% (12:02) | 0.1% (12:37) | 10.5 | 105 / 10 / 37.2 / 70.9 = 223 | 42.8 | 27.8 |
| 50 | 0.9 | 0.5 | 0.1 | 36.3 | 1.3 / 3.9 / 4.5 | 1.2% (12:09) / 4.4% (12:15) / 18.8% (12:03) | 0% (-) | 11.3 | 136.1 / 10 / 34.3 / 31.8 = 212.2 | 47.7 | 31 |
| 50 | 0.9 | 0.5 | 0.2 | 36.3 | 1.3 / 4 / 4.5 | 1% (12:01) / 3.9% (12:15) / 18.6% (12:05) | 0% (12:42) | 11.2 | 136.1 / 10 / 34.3 / 59.3 = 239.6 | 47.7 | 31 |
| 50 | 0.9 | 0.8 | 0.1 | 44.4 | 1.6 / 4.7 / 5.3 | 2% (12:01) / 10.9% (12:11) / 35.8% (11:59) | 0% (12:33) | 9.4 | 138.2 / 10.1 / 42.4 / 49.6 = 240.2 | 47.7 | 31 |
| 50 | 0.9 | 0.8 | 0.2 | 44.4 | 1.6 / 4.7 / 5.3 | 2.6% (12:04) / 11.2% (12:09) / 35.7% (11:58) | 0% (12:15) | 9.3 | 137.9 / 10 / 42.5 / 89.1 = 279.4 | 47.8 | 31 |
| 70 | 0.5 | 0.5 | 0.1 | 34.3 | 1.3 / 3.7 / 4.3 | 0.9% (12:07) / 3.6% (12:13) / 15.4% (12:07) | 0% (-) | 11.7 | 100.8 / 14 / 32.3 / 24.3 = 171.4 | 51.2 | 33.1 |
| 70 | 0.5 | 0.5 | 0.2 | 34.3 | 1.3 / 3.7 / 4.3 | 0.9% (12:02) / 3.4% (12:14) / 15.6% (12:05) | 0% (12:24) | 11.8 | 100.7 / 14 / 32.3 / 46.7 = 193.7 | 51.2 | 33 |
| 70 | 0.5 | 0.8 | 0.1 | 45.6 | 1.6 / 4.8 / 5.4 | 3% (12:03) / 12.9% (12:08) / 39.4% (11:57) | 0.2% (12:33) | 9.1 | 102.5 / 14 / 43.7 / 38.6 = 198.9 | 51.3 | 33 |
| 70 | 0.5 | 0.8 | 0.2 | 45.6 | 1.7 / 4.9 / 5.4 | 2.9% (12:02) / 13.3% (12:08) / 38.6% (11:57) | 0.2% (12:35) | 9 | 102.5 / 14 / 43.7 / 72.5 = 232.6 | 51.2 | 33 |
| 70 | 0.7 | 0.5 | 0.1 | 43.5 | 1.6 / 4.7 / 5.2 | 2.3% (12:05) / 10.4% (12:10) / 33.2% (11:59) | 0.1% (12:39) | 9.6 | 145.1 / 14 / 41.5 / 34.4 = 235 | 59.9 | 38.9 |
| 70 | 0.7 | 0.5 | 0.2 | 43.4 | 1.6 / 4.7 / 5.2 | 2.3% (12:03) / 10.6% (12:10) / 33.8% (11:59) | 0.1% (12:32) | 9.5 | 144.8 / 14 / 41.4 / 65 = 265.2 | 59.8 | 38.9 |
| 70 | 0.7 | 0.8 | 0.1 | 55 | 2 / 5.7 / 6.1 | 5.3% (12:00) / 25.7% (12:05) / 60.4% (11:49) | 0.8% (12:28) | 7.2 | 147.2 / 14.1 / 53.8 / 53.9 = 268.9 | 59.9 | 38.9 |
| 70 | 0.7 | 0.8 | 0.2 | 55 | 2 / 5.7 / 6.1 | 5.1% (12:00) / 25.8% (12:04) / 61.4% (11:50) | 0.7% (12:29) | 7.2 | 147.2 / 14 / 53.8 / 99.6 = 314.5 | 59.9 | 38.9 |
| 70 | 0.9 | 0.5 | 0.1 | 50.9 | 1.8 / 5.4 / 5.8 | 3.8% (11:59) / 20.2% (12:07) / 51.6% (11:53) | 0.6% (12:32) | 8 | 190.5 / 14 / 49.3 / 44.7 = 298.4 | 66.9 | 43.4 |
| 70 | 0.9 | 0.5 | 0.2 | 50.9 | 1.8 / 5.3 / 5.8 | 4% (12:04) / 19.5% (12:06) / 51.9% (11:53) | 0.3% (12:26) | 8 | 190.5 / 14 / 49.3 / 83.2 = 337.1 | 66.8 | 43.5 |
| 70 | 0.9 | 0.8 | 0.1 | 62.2 | 2.2 / 6.3 / 6.5 | 7.7% (11:59) / 39% (12:00) / 75.9% (11:42) | 2.2% (12:26) | 6 | 193.4 / 14 / 62 / 69.6 = 339 | 66.8 | 43.4 |
| 70 | 0.9 | 0.8 | 0.2 | 62.2 | 2.2 / 6.3 / 6.5 | 7.9% (12:00) / 38.6% (12:01) / 75.9% (11:42) | 2.3% (12:27) | 6 | 193.1 / 13.9 / 62.1 / 124.8 = 393.9 | 66.8 | 43.4 |

</details>

How to read it: GOLD sells out on at most 8% of days (70 payments, very good players), around 12:00. All three tiers sell out on at most 2.3% of days (then staff may switch on the manual €10 cash fallback in F9). On average 6 to 16 sponsor items are left for the 13:00 draw, then GTA 6 last (given in every simulated draw). The cash fallback is off in the simulation, so no cash is ever paid.

## Open decisions (from the analysis)

1 R11 consolation on/off (off) · 2 R3 limit (3, on) · 3 last game before the draw (not built) · 4 winner not there (redraw with reason) ·
5 cookie allowed? (`choice` enabled) · 6 leaderboard same screen (yes; `?view=board` for a 2nd screen) · 7 mouse or arcade button (mouse) ·
8 paid play 18+? (`text.ageNote`) · 9 difficulty targets (play tests) · 10 public repo (yes) · 11 level 5 = level 4 (yes) · 12 title music (Silent Night, quick Christmas waltz, always on, mute in panel).
