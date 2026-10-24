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

1. A player pays: €2 = 1 try, €5 = 3 tries. Staff press **F2**, type the code, then **1** or **2**.
2. The player clicks to fly Santa past the chimneys. The best try counts.
3. Prizes: chimney 10 = small prize or a free try, 20 = draw ticket + wheel spin, 30 = 3 more tickets + Legend, 40 = MASTER tag.
4. Staff hand over what the screen lists, then press **Enter**.
5. At 12:45 staff run the jackpot draw from the staff panel (**F9**).

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

Every push to `main` runs the tests and updates the test link. A tag `vX.Y.Z` builds the Windows ZIP.
