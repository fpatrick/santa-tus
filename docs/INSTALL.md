# Install Santa TUS on a Windows laptop (W10)

Time: about 5 minutes. No admin rights. No internet needed after the download.

## 1. Download

1. Open https://github.com/fpatrick/santa-tus/releases
2. Under the newest release, click **SantaTUS-Windows.zip**.

## 2. Unblock and unzip

1. Right-click **SantaTUS-Windows.zip** > **Properties**. If you see **Unblock** at the bottom, tick it, then **OK**.
   (This stops most Windows warnings later.)
2. Right-click the ZIP > **Extract All...** > choose the **Desktop** > **Extract**.
3. Open the new **SantaTUS** folder.

Do not run the game from inside the ZIP. If you try, it says "UNZIP THE FOLDER FIRST".

## 3. Start

1. Put the backup **USB stick** in the laptop. (Optional but strongly advised: make a folder called `SantaTUS-backup` on it.)
2. Double-click **Start Santa TUS**.
3. A black window opens. **Keep it open all day.** You can minimise it.
4. Chrome opens in full screen (or Edge if there is no Chrome). The start check (S13) shows green OK lines.
   - Yellow "USB backup": insert the USB stick.
   - Yellow "Sound": click once on the screen.
   - Red line: read what it says and fix it, or press Enter to go on.

To test in a normal window (not full screen), double-click **Start Santa TUS (window)** instead.

## Windows security messages (first time only)

- **"Windows protected your PC"** (blue box): click **More info**, then **Run anyway**.
- **"Open File - Security Warning"**: click **Run**.
- If you did step 2.1 (Unblock), you usually see neither.

We do not use a home-made .exe, so antivirus tools should not block it. The game only uses the laptop itself (127.0.0.1):
Windows does not ask about the firewall.

## Where the data is (W6)

`Documents\SantaTUS-data`:

| File or folder | What |
| --- | --- |
| `santa-live.db` | the database (every payment, try and prize) |
| `santa-live.log.jsonl` | a log that only grows (the database can be rebuilt from it) |
| `backups\` | a copy after every payment and every 5 minutes |
| `exports\` | CSV files for the Finance cash book |
| `archive\` | old days, after "New day" |
| `santa-test.*` | test mode plays (never counted) |

The USB stick gets a copy in `SantaTUS-backup\` after every payment and every 5 minutes.

## Update to a new version

1. Close Chrome (Alt+F4) and the black window.
2. Unzip the new ZIP **over** the old SantaTUS folder (or next to it). The data is in Documents, so nothing is lost (T29).
3. Double-click **Start Santa TUS**.

## Close the game

Press **Alt+F4** to close Chrome, then close the black window.
