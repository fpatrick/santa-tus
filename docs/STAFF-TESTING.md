# Testing the game (staff)

Test link: **https://fpatrick.github.io/santa-tus/**

## Before you start

- Use a laptop with a keyboard and a mouse. Full screen is best: press **F11**.
- Click once on the page so the sound can play.
- On the test link, results stay in **your browser only** (yellow banner at the top). Nothing is shared with the team.
- To clear your test results: **F9**, type the code, press **9** (New day), type the code again.

## Keys

| Key | What it does |
| --- | --- |
| **F2** (or a click in the top-left corner) | Start a paid game. Type the code `PAID`, then Enter. |
| **1** / **2** | On the payment screen: €2 = 1 try / €5 = 3 tries |
| **Mouse click** (or Space) | Fly |
| **Enter** | Confirm (hand-over, nickname, messages) |
| **Esc** | Cancel, or skip the nickname |
| **F9** | Staff panel (code `PAID`). Undo, free play, test mode, backup, export, sound, draw, new day. |

## What to test

1. A full game with €2 and with €5.
2. Reach chimney 10 and pick each prize once. Pick the free try once.
3. Reach chimney 20 (the wheel). Watch and listen to the wheel.
4. Undo a payment from the staff panel.
5. The draw (staff panel, key 8).
6. Leave the title screen running for 1 minute: is it easy to read from 5 metres?
7. Is level 2 (chimneys 11-20) too easy or too hard? Write how far you got.

## How to send feedback (P3)

Write one line per problem in the shared list, and **start with the screen or rule ID**:

```
S8: the prize tiles are too small on my laptop
R7: the wheel gives too many free tries
Level 2: I always crash at chimney 12, too hard
Sound: the wheel is too loud
```

IDs: S1 title screen, S2 code, S3 payment, S4 "click to fly", S5 flying, S6 try over, S7 wheel, S8 prize choice,
S9 nickname, S10 hand-over, S11 staff panel, S12 draw, S13 start check. Rules R1-R21 are in SPEC.md.

Also write the **version** from the yellow badge at the bottom left (for example "BETA v0.9.0").
Then pass the whole list to Claude in one message.
