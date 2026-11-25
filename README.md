# Santa TUS

Arcade game for the BIG KEAF charity stall at MarketLink, TUS, 26 November 2026.
All profit goes to Paediatric Diabetes, UHL.

**Status: FINAL (market-day version).** The version shows in the staff panel (F9).

## Run the game on the laptops

Download from the latest release: **https://github.com/fpatrick/santa-tus/releases/latest**

| Laptop | File |
| --- | --- |
| Fedora / Linux (main) | `santa-tus-linux-x64` |
| Windows (backup) | `santa-tus-windows-x64.exe` |

No install, no internet, no admin password. The game saves in a folder **`SantaTUS-data`** made next to the program: never delete it.

**Linux (Fedora)**

1. Download `santa-tus-linux-x64` and put it in a folder in your home, for example `Documents/SantaTUS`.
2. First time: right-click the folder > **Open in Terminal**, then type:

   ```
   chmod +x santa-tus-linux-x64
   ./santa-tus-linux-x64
   ```

   (`chmod +x` gives the file back its "can run" mark. Downloads and USB copies lose it.)
3. The game opens full screen in Firefox (or Chromium / Chrome).
4. Next times: press the **Super** key, type **Santa**, open **Santa TUS** (the launcher is made at the first start).
   A double-click on the file may not work in GNOME Files: use the app list or the terminal.

**Windows**

1. Download `santa-tus-windows-x64.exe` and put it in a folder, for example `Documents\SantaTUS`.
2. Double-click it. If Windows says **"Windows protected your PC"**: click **More info**, then **Run anyway**.
3. The game opens full screen in Edge (or Chrome). There is no black window: that is normal.

**On both**

- Leave full screen: **Alt+F4**. The game keeps running in the background; start the program again to reopen the window (it never starts twice).
- Backup to USB: **F9** > code > **4** (or **P** to pick the USB folder).
- Swap laptops: copy the whole `SantaTUS-data` folder next to the other program and start it: the day continues.
- Full staff guide (one page): `README-STAFF.txt` in the release, or [docs/README-STAFF.txt](docs/README-STAFF.txt).

## Play the test version

**https://fpatrick.github.io/santa-tus/**

- Open it on a laptop or a 16:9 screen (on a phone it is very small).
- It updates by itself 1-2 minutes after each change.
- There is no server on the test link: results stay in your browser only.
- How to test and how to send feedback: [docs/STAFF-TESTING.md](docs/STAFF-TESTING.md).

## How the game works (short)

1. A player pays. PLAY: €2.50 = 1 try, €6.50 = 3 tries, €10 = 5 tries + 1 bonus draw entry (keys **1**-**3**). Draw entries cannot be bought: they come only from playing. Staff press **F2**, type the code, then the key.
2. The player clicks to fly Santa past the chimneys. The best try counts.
3. Prizes (at the end of the payment, the best try counts): chimney 10 = +1 draw entry for every PAID try that gets there, and once a sweet or a free try; 20 = a wheel spin (gold / silver / bronze sponsor prizes, free try, +2 draw entries); 30 = +3 draw entries + LEGEND, 40 = +4 + MYTHIC, 50 = +5 + GODLIKE (they add up). All draw entries come on one screen at the end; staff write the numbers on one paper card.
4. Staff hand over what the screen lists, then press **Enter**.
5. At 13:00 staff run the draw from the staff panel (**F9**): the sponsor items left (bronze, silver, gold), then GTA 6 for PS5 last. The cash jackpot is OFF this year. Sponsor tiers: GOLD €20 voucher, SILVER gaming or day out, BRONZE gift; a sold-out tier's chance moves down to the next tier. A €10 CASH wheel slice is manual: staff can switch it on (F9 key **C**) only when ALL sponsor prizes are gone (max 3 a day).

All rules with their IDs: [SPEC.md](SPEC.md).

## For market day

- Run on the laptops: see **Run the game on the laptops** above (older ZIP install: [docs/INSTALL.md](docs/INSTALL.md))
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
