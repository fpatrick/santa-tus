// staffapi.js: what the staff panel (staff.js) can do. Every action is saved as an event first (D1, D14).
// Moved here from main.js so main.js stays short.

import { CONFIG } from './config.js';
import * as R from './rules.js';
import { buildState, openPayment, totals, lastActivePayment } from './ledger.js';
import { liveOdds, summary, drawState, allItems, stock, timeState } from './prizes.js';
import { buildCsv } from './report.js';
import * as screens from './screens.js';
import { setMuted, isMuted } from './sound.js';
import { runDraw } from './draw.js';
import { fmtEuro } from './ledger.js';

export function staffApi(app) {
  const name = () => app.ledgerName();
  return {
    info: () => {
      const s = app.led();
      const st = stock(s, CONFIG);
      return {
        totals: totals(s, CONFIG), summary: summary(s, CONFIG), live: liveOdds(s, CONFIG), draw: drawState(s, CONFIG),
        items: allItems(CONFIG).map((it) => ({ ...it, left: st.left[it.id] })),
        nextTicket: s.nextTicket, mode: app.store.mode, test: app.test, muted: isMuted(), pending: app.store.pendingCount(),
      };
    },
    undoInfo: () => lastActivePayment(app.led()),
    undo: async () => {
      const body = R.undoBody(app.led());
      if (!body) return null;
      await app.commit(name(), body);
      if (app.flowActive) app.endFlight({ aborted: true });
      return body;
    },
    freePlay: async (reason) => {
      if (app.flowActive || openPayment(app.led())) return false;
      await app.commit(name(), R.payBody(app.led(), 'free', CONFIG, reason));
      return true;
    },
    setTest: async (on) => {
      if (app.flowActive) return false;
      app.test = on;
      await app.commit(name(), R.staffBody('test-mode', on ? 'on' : 'off'));
      app.refresh();
      return true;
    },
    backup: async () => { await app.commit(name(), R.staffBody('backup')); return app.store.backup(); },
    exportCsv: async () => { await app.commit(name(), R.staffBody('export')); return app.store.exportCsv(name(), buildCsv(app.led(), CONFIG, name())); },
    hide: async (pid) => { if (!app.led().byPid.get(pid)) return false; await app.commit(name(), { t: 'hide', pid }); return true; },
    toggleSound: () => setMuted(!isMuted()),
    askCode: () => screens.staffCode('CODE AGAIN FOR NEW DAY'),
    newDay: async () => {
      if (app.flowActive) return { ok: false };
      await app.commit(name(), R.staffBody('new-day'));
      const r = await app.store.newDay(name());
      if (r && r.ok) app.ledgers[name()] = buildState([]);
      app.refresh();
      return r;
    },
    // K2, D14: staff changes, each saved with the time.
    setStock: async (n, count) => {
      const it = allItems(CONFIG)[n - 1];
      if (!it || !(count >= 0)) return 'Type the item number and the count, for example "4 2".';
      const ev = await app.commit(name(), R.stockBody(app.led(), CONFIG, it.id, count));
      return `${it.label}: ${ev.before} -> ${ev.left} left. Saved.`;
    },
    fixJackpot: async (value) => {
      try {
        const ev = await app.commit(name(), R.jackpotFixBody(app.led(), CONFIG, value));
        return `Jackpot: ${fmtEuro(ev.before)} -> ${fmtEuro(ev.value)}. Saved.`;
      } catch (err) { return err.message; }
    },
    undoDraw: async (reason) => {
      await app.commit(name(), R.undoDrawBody(reason));
      return 'The draw is undone (saved with the reason). It can run again with 8.';
    },
    // R14: the draw needs no open payment. Returns a message when it cannot start, else ''.
    drawCheck: () => {
      if (app.flowActive || openPayment(app.led())) return 'Finish the open payment first.';
      const ds = drawState(app.led(), CONFIG);
      if (ds.done) return 'The draw is already done. Press U to undo it (needs a reason).';
      return '';
    },
    draw: async () => {
      if (!drawState(app.led(), CONFIG).started) {
        const [h, m] = CONFIG.event.drawTime.split(':').map(Number);
        const now = new Date();
        if (now.getHours() * 60 + now.getMinutes() < h * 60 + m && timeState(CONFIG, now) !== 'late') {
          await screens.message('IT IS NOT DRAW TIME YET', [`THE DRAW IS AT ${CONFIG.event.drawTime}.`, 'Press ENTER to start anyway.']);
        }
      }
      await runDraw(app, name(), () => totals(app.led(), CONFIG).jackpot);
      app.refresh();
    },
  };
}
