# Market day: 26 November 2026

Stall open 9:00-13:00. Set-up from 8:30. Draw at 12:45.

## Bring

| Item | Why |
| --- | --- |
| Windows laptop with the game installed (docs/INSTALL.md) | Runs the game. Sleep, updates and notifications OFF. Plugged in. |
| 16:9 monitor or TV + HDMI cable | The display |
| Wired mouse (or USB arcade button) | For players |
| Wired keyboard | For staff only, kept behind the table |
| 2 USB sticks | One for live backups, one spare |
| Extension lead | Power. **Confirm the power socket with the organisers.** |
| Spare laptop with the game installed | If the main laptop fails |
| Pre-numbered cloakroom ticket book | Draw tickets, from #0001 |
| Printed A4 odds sheet (`print/odds.html`, Ctrl+P) | R18 |
| Prizes and a cash float | Small prizes, €10 notes for wheel cash, the jackpot |
| Speakers (optional) | Sound |

## Morning check (8:30-9:00)

1. Plug in the laptop and the monitor. Insert the backup USB stick.
2. Double-click **Start Santa TUS**. The start check must show all green (OK).
3. Press **F9**, type the code. Check the **laptop clock** is right.
4. In the staff panel press **3** (test mode ON). Play one game. Press **F9** again and **3** (test mode OFF). The "TEST MODE" banner must be gone.
5. Check the first ticket in the ticket book is the "next" number shown in the staff panel (`#0001` on a fresh day).
6. If there is old test data from before: staff panel **9** (New day) before 9:00. It is archived, not deleted.

## During the day

- **New player:** take the cash, press **F2**, type the code, press **1** (€2) or **2** (€5).
- **Hand-over:** give exactly what the screen lists (prize, ticket numbers, cash), then press **Enter**.
- **Wrong button?** At "CLICK TO FLY", press **F9**, code, **1** (Undo), **Enter**.
- **Technical problem, player lost a try?** Staff panel **2** (Free play), type the reason, Enter.
- **Rude nickname?** Staff panel **6**, type the payment number (shown on the hand-over screen), Enter.
- **Red banner "SERVER DOWN"?** Keep playing. Check the black window is still open. If it was closed, double-click **Start Santa TUS** again: the waiting results are sent when it is back.
- **Chrome closed or crashed?** Double-click **Start Santa TUS** again. An unfinished payment reopens with the right tries ("WELCOME BACK").

## End of day

1. **12:45**: staff panel **8** (Start the draw), Enter. Read the winning ticket number out loud. If the winner is not there, decide the time limit; a second draw needs a reason.
2. Staff panel **5** (Export CSV) and **4** (Backup now).
3. Copy `Documents\SantaTUS-data` to the second USB stick.
4. Count the cash against "Money in" and "Cash prizes paid" in the staff panel. Give the CSV to the Financial Manager.

## Move to the spare laptop (D6, target: under 10 minutes)

1. Take the backup USB stick out of the broken laptop.
2. On the spare laptop, open `Documents\SantaTUS-data` (create it if it is not there).
3. Copy all files from `USB:\SantaTUS-backup\` into `Documents\SantaTUS-data\`
   (`santa-live.db`, `santa-live.log.jsonl`, `santa-test.db`, `santa-test.log.jsonl`).
4. Insert the USB stick in the spare laptop. Double-click **Start Santa TUS**.
5. Check the leaderboard, the jackpot and the "next ticket" number in the staff panel. Carry on.

Practise this once at the dress rehearsal (23-24 November).
