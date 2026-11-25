SANTA TUS - STAFF README (market day, 26 November, 9:00-13:00)
================================================================

THE FILES
  santa-tus-linux-x64          Fedora laptop (MAIN)
  santa-tus-windows-x64.exe    Windows laptop (BACKUP)
  SantaTUS-data                the save folder. It is made next to the program.
                               NEVER delete it. This folder IS the day.

START ON FEDORA (main laptop)
  1. Copy santa-tus-linux-x64 into a folder in your home, for example Documents/SantaTUS.
  2. FIRST TIME: open a Terminal in that folder (right-click > Open in Terminal) and type:
        chmod +x santa-tus-linux-x64
        ./santa-tus-linux-x64
     (chmod is needed when the file comes from a USB stick: it loses its "can run" mark.)
  3. The game opens full screen in Firefox.
  4. After the first start, "Santa TUS" is in the app list (press the Super key, type "Santa").
     Next time just start it from there. Double-clicking the file may not work in GNOME Files.

START ON WINDOWS (backup laptop)
  1. Copy santa-tus-windows-x64.exe into a folder, for example Documents\SantaTUS.
  2. Double-click it. Windows may say "Windows protected your PC":
     click "More info", then "Run anyway".
  3. The game opens full screen in Edge (or Chrome). There is no black window: that is normal.

BACKUP TO USB (do it every hour, and at the end)
  - Put the USB stick in. Press F9 (or hold F + 9), type the staff code, press 4 "BACKUP TO USB".
  - The game also finds the stick by itself for its automatic copies.
  - If it says "no USB stick found": press P and pick the USB stick in the folder window.
  - The copy is in the folder SantaTUS-backup on the stick.
  - The laptop also keeps its own copies every 5 minutes (SantaTUS-data/backups, last 20).

SWAP TO THE WINDOWS LAPTOP (if the Fedora laptop dies)
  1. Best: copy the whole SantaTUS-data folder from the Fedora laptop to the USB stick.
     If the Fedora laptop does not start: use the SantaTUS-backup folder on the stick
     (rename it to SantaTUS-data).
  2. On the Windows laptop, put that SantaTUS-data folder NEXT TO santa-tus-windows-x64.exe
     (same folder). If there is already one, rename the old one first (never delete it).
  3. Start santa-tus-windows-x64.exe. Everything continues: same payments, prizes left,
     draw entries and draw. Check the F9 summary (payments and next draw entry number).
  It works the same way from Windows back to Fedora.

IF SOMETHING GOES WRONG
  - The screen shows "SOMETHING WENT WRONG - RELOADING": wait. The page reloads by itself
    and continues where it stopped. Nothing is lost.
  - The screen is frozen: press F5. Still frozen: close the window (Alt+F4) and start
    Santa TUS again. The game data is safe.
  - The game window was closed: start Santa TUS again. It opens the window again
    (the game keeps running in the background, it never starts twice).
  - The laptop crashed or lost power: start the laptop, start Santa TUS again. It repairs its
    files by itself and continues exactly where it stopped.
  - To leave full screen at the end of the day: Alt+F4.
  - The start-up check shows where the data is saved. If it says "Cannot save next to the
    program", the data is in your home folder (SantaTUS-data): use that folder for the swap.
  - A log for the organisers: SantaTUS-data/server.log
