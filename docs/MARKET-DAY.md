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
| Prizes and a money float | Sweets, the sponsor prizes on the prize table (gold, silver, bronze), €10 notes for the jackpot (max €30 a win) and the €10 CASH slice |
| Speakers (optional) | Sound |

## Morning check (8:30-9:00)

1. Plug in the laptop and the monitor. Insert the backup USB stick.
2. Double-click **Start Santa TUS**. The start check must show all green (OK).
3. Press **F9**, type the code. Check the **laptop clock** is right.
4. In the staff panel press **3** (test mode ON). Play one game. Press **F9** again and **3** (test mode OFF). The "TEST MODE" banner must be gone.
5. Check the first ticket in the ticket book is the "next" number shown in the staff panel (`#0001` on a fresh day).
6. If there is old test data from before: staff panel **9** (New day) before 9:00. It is archived, not deleted.

## During the day

- **No F keys on the keyboard?** Hold **F** and press **2** (= F2), or hold **F** and press **9** (= F9).
- **New player:** when the payment is received, press **F2**, type the code, press **1** (€2.50 = 1 try), **2** (€6.50 = 3 tries) or **3** (€10 = 5 tries). After 12:35 the game asks for **O** first (saved in the log).
- **Hand-over:** give exactly what the screen lists (sweet, sponsor item, ticket numbers, money), then press **Enter**. Sponsor prize: the player picks, you press the item's number. "ALREADY WON A PRIZE TODAY?": you decide, **Y** = 2 tickets instead. Money ("PAY JACKPOT €20", "PAY €10"): pay, then **Enter** twice.
- **Wrong button?** At "CLICK TO FLY", press **F9**, code, **1** (Undo), **Enter**.
- **Technical problem, player lost a try?** Staff panel **2** (Free play), type the reason, Enter.
- **Rude nickname?** Staff panel **6**, type the payment number (shown on the hand-over screen), Enter.
- **Red banner "SERVER DOWN"?** Keep playing. Check the black window is still open. If it was closed, double-click **Start Santa TUS** again: the waiting results are sent when it is back.
- **Chrome closed or crashed?** Double-click **Start Santa TUS** again. An unfinished payment reopens with the right tries ("WELCOME BACK").

## End of day

1. **12:45**: staff panel **8** (Draw). One prize at a time: bronze items, silver, gold, then the jackpot last. **Enter** draws; read the number out loud. Winner here: **Enter** (next prize). Not here: **N**, type the reason, the same prize is drawn again. **Esc** stops; **8** goes on later.
2. Staff panel **5** (Export CSV) and **4** (Backup now).
3. Copy `Documents\SantaTUS-data` to the second USB stick.
4. Count the money against "Total taken", "Jackpot paid" and "€10 cash paid" in the staff panel. Count the sponsor items left against the panel. Give the CSV to the Financial Manager.

## Move to the spare laptop (D6, target: under 10 minutes)

1. Take the backup USB stick out of the broken laptop.
2. On the spare laptop, open `Documents\SantaTUS-data` (create it if it is not there).
3. Copy all files from `USB:\SantaTUS-backup\` into `Documents\SantaTUS-data\`
   (`santa-live.db`, `santa-live.log.jsonl`, `santa-test.db`, `santa-test.log.jsonl`).
4. Insert the USB stick in the spare laptop. Double-click **Start Santa TUS**.
5. Check the leaderboard, the jackpot and the "next ticket" number in the staff panel. Carry on.

Practise this once at the dress rehearsal (23-24 November).
