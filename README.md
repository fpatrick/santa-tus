# Santa TUS

Arcade game for the BIG KEAF charity stall at MarketLink, TUS, 26 November 2026.
All profit goes to Paediatric Diabetes, UHL.

**Status: BETA. Not the final game.** The version shows on every screen.

## Play the test version

**https://fpatrick.github.io/santa-tus/**

- Open it on a laptop or a 16:9 screen (on a phone it is very small).
- It updates by itself 1-2 minutes after each change.
- There is no server on the test link: results stay in your browser only.
- How to test and how to send feedback: [docs/STAFF-TESTING.md](docs/STAFF-TESTING.md).

## How the game works (short)

1. A player pays. PLAY: €2.50 = 1 try, €6.50 = 3 tries, €10 = 5 tries + 1 bonus draw entry (keys **1**-**3**). DRAW ENTRIES ONLY (no game): €2.50 = 1, €6.50 = 3, €10 = 6 draw entries (keys **4**-**6**). Staff press **F2**, type the code, then the key.
2. The player clicks to fly Santa past the chimneys. The best try counts.
3. Prizes (at the end of the payment, the best try counts): chimney 10 = +1 draw entry for every try that gets there, and once a sweet or a free try; 20 = a wheel spin (gold / silver / bronze sponsor prizes, free try, +2 draw entries); 30 = +5 draw entries + LEGEND, 40 = MYTHIC, 50 = GODLIKE. All draw entries come on one screen at the end; staff write the numbers on one paper card.
4. Staff hand over what the screen lists, then press **Enter**.
5. At 12:45 staff run the draw from the staff panel (**F9**): the sponsor items left. The cash jackpot is OFF this year. A €10 CASH wheel slice only comes on when ALL sponsor prizes are gone (max 3 a day, F9 key **C** switches it).

All rules with their IDs: [SPEC.md](SPEC.md).

## For market day

- Install on the stall laptop: [docs/INSTALL.md](docs/INSTALL.md)
- Morning check, during the day, end of day, spare laptop: [docs/MARKET-DAY.md](docs/MARKET-DAY.md)
- Printable A4 odds sheet: open `print/odds.html` on the test link and press Ctrl+P.

## For developers (and Claude)

Read [CLAUDE.md](CLAUDE.md) first. Plain HTML, CSS and JavaScript modules, no build step.
The stall laptop runs `server/server.py` (Python standard library only) to save every result.

```
npm test               # rule tests
npm run test:server    # server tests
npm run test:flow      # full browser test (needs Playwright + Chromium)
npm run serve          # run the server locally, then open http://127.0.0.1:8765
```

Every push to `main` runs the tests and updates the test link. The "Build the Windows ZIP" workflow (started by hand) builds and tests the ZIP on Windows and makes a release.
