# CLAUDE.md: read this first, every session

Santa TUS is an arcade game for the BIG KEAF charity stall at MarketLink (TUS, 26 November 2026, 9:00-13:00).
Players fly Santa past 50 chimneys. Staff take cash, start each game with a code, and hand over prizes.
Plain HTML, CSS and JavaScript modules (no framework, no build step) + one small Python server (standard library only).

The person you work with writes simple English as a second language. Answer in simple English.

## How to work (saves tokens, stops broken code)

1. Read this file, then **only** the files the change needs (see "Where to change what"). Never read the whole project.
2. SPEC.md is long. Find a rule with Grep on its ID (`R7`, `S8`, `T15`) and read only that part.
3. Change code with small, exact edits (Edit tool). Never rewrite a whole file unless asked.
4. Never delete or rename a function unless the request says so.
5. Numbers and words go in `src/config.js`, never inside the code.
6. For a rule change: update SPEC.md first (keep the ID), then `src/rules.js`, then its test.
7. Run the tests after every change (see "Tests"). If one fails, fix the code or undo the change. Never delete or weaken a test to make it pass.
8. One change = one version bump + one CHANGELOG line + one git commit + push (see "Versions").
9. Keep each file under about 300 lines (`server/server.py` may go to about 450, it must stay one file). Split a file when it grows.
10. Report what changed in 2 or 3 lines. Never paste whole files back. After a visual change, take a screenshot (Playwright) and look at it instead of guessing.

## Where to change what

| To change... | Edit |
| --- | --- |
| Prices, staff code, odds, prizes, level speeds and gaps, words on screen, draw time | `src/config.js` only |
| Who gets which prize, in which order (R1-R21) | `src/rules.js` (+ test in `tests/rules.test.mjs`) |
| Leaderboard, totals, jackpot, ticket numbers (L1, R12-R14) | `src/ledger.js` |
| One payment from start to hand-over (screen order) | `src/flow.js` |
| Flying, gravity, collisions, HUD | `src/game.js` |
| Course building and the fairness check (R4, T26) | `src/course.js` |
| Sky, town, rooftop, chimney drawing | `src/world.js` |
| Santa and prize icons (pixel art maps) | `src/sprites.js` |
| Title screen scenes (A1-A6) | `src/attract.js` |
| The wheel and its spin (R7) | `src/wheel.js` |
| Particles, rays, coins, fireworks, shake, flash, `celebrate(tier)` | `src/fx.js` |
| Sounds and the jingle | `src/sound.js` |
| Staff screens: code, payment, choice, nickname, hand-over, health (S2-S10, S13) | `src/screens.js` |
| Staff panel and the draw (S11, S12, K2, K3) | `src/staff.js` |
| Right-hand leaderboard panel (L2) | `src/board.js` |
| Saving: server or browser, offline queue (D1, D4, P1) | `src/store.js` |
| Start-up, keys, mouse, banners, health check, staff actions | `src/main.js` |
| CSV export | `src/report.js` |
| Colours, layout, screen boxes | `style.css` (tokens in `:root`) |
| Version and beta badge | `src/version.js` |
| Saving to disk, backups, USB, export, new day, opening Chrome | `server/server.py` |
| Windows start file | `Start Santa TUS.bat` (CRLF line endings) |
| Printed A4 odds sheet (R18) | `print/odds.html` (reads config.js) |
| Test link and Windows ZIP builds | `.github/workflows/` |

## Tests

| Command | What | When |
| --- | --- | --- |
| `npm test` | 28 rule, ledger and course tests (Node, about 3 s) | after every change |
| `npm run test:server` | 9 server tests (Python) | after a change to `server/` |
| `npm run test:flow` | full browser flow with Playwright (T4, T12, T13, T30, about 40 s) | after a change to screens, flow, store, main |

GitHub runs `npm test` and the server tests on every push before it publishes the test link.

## Versions (the person asked Claude to manage them)

- The version lives in `src/version.js`: `VERSION` (like `0.9.3`) and `STAGE` (`BETA` now).
- While `STAGE` is not `FINAL`, every screen shows the badge "BETA v0.9.3 · NOT THE FINAL GAME". Do not remove it.
- Every change: bump the last number (`0.9.3` -> `0.9.4`). A bigger new feature: bump the middle number and reset the last (`0.9.4` -> `0.10.0`).
- Add one line at the top of `CHANGELOG.md`: `- 0.9.4 (2026-10-30): R7 free try now 35% (asked by finance).`
- Commit message: `0.9.4: <what changed>` + the attribution lines the session asks for. Then `git push`.
- Release candidate before the feature freeze (22 Nov): `STAGE = 'RC'`. Market-day version: `VERSION = '1.0.0'`, `STAGE = 'FINAL'` (the badge goes away), then a release (below).
- To build a Windows ZIP: `gh workflow run windows-zip.yml --ref main -f release=true` (pushing tags is blocked from Claude's
  workspace). It builds and tests the ZIP on Windows and makes the release `v<VERSION>` with `SantaTUS-Windows.zip`.
  Without `-f release=true` it only builds (download from the run's artifacts).

## Test link

GitHub Pages publishes `main` after each push (workflow "Test and publish the test link"), in 1-2 minutes:
https://fpatrick.github.io/santa-tus/ . On the test link there is no server, so results stay in that browser (P1).
`window.santa` exists only so the browser test can drive the game. Never add a shortcut that starts a paid game or gives prizes without the staff code.

## Things that must stay true

- Works offline. No CDN, no web fonts from the internet, no npm packages in the game.
- The wheel result is picked with `secureRandom()` and saved BEFORE the animation (R7, D1).
- Nothing is ever deleted: undo, hide and new day only mark or archive (D5).
- Test-mode plays go to the `test` ledger, never to `live` (D7).
- Flashing effects stay at or under 3 per second (A4, `CONFIG.fx.maxFlashPerSec`).
- Players only need the mouse. Staff keys: F2 = start a paid game, F9 = staff panel (both need the code).

## Saved events (short)

Every action is one event `{id, n, ts, t, ...}` saved in order. `t` is one of:
`pay`, `try`, `award` (kind `p10` | `p20` | `wheel` | `p30` | `consolation`), `nick`, `done`, `undo`, `hide`, `draw`, `staff`.
`ledger.js` turns the list of events into the state. Details: SPEC.md "Saved events".
