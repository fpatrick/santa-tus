// handover.js: the sponsor prize step (R22, R23: the "already won a prize today?" check and the item pick, staff
// press the number of the item the player picks) and the S10 hand-over (R16): money confirmed twice (R27), then
// the list of everything to give. Every choice is saved before the next screen (D1), so after a
// crash the hand-over starts again where it stopped (D3).

import { CONFIG } from './config.js';
import * as R from './rules.js';
import * as screens from './screens.js';
import { displayName, fmtEuro } from './ledger.js';

const T = CONFIG.text;
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));

export async function runHandover(app, name, p) {
  if (p.sponsor && !p.item && !p.swapped) await sponsorPrize(app, name, p); // old saved days only: now a step before the tickets
  if (p.jackpotWon) await screens.payMoney(fill(T.payJackpot, { amount: fmtEuro(p.jackpotWon) }));
  if (p.cash && !p.cashPaid) { // R27: "PAY €10" confirmed twice, then saved
    await screens.payMoney(fill(T.payCash, { amount: fmtEuro(p.cash) }));
    await app.commit(name, { ...R.staffBody('cash-paid', `${fmtEuro(p.cash)} payment #${p.pid}`), pid: p.pid });
  }
  await screens.handover({ items: R.handoverItems(p, CONFIG), pid: p.pid, best: p.best, name: displayName(p, CONFIG) });
  await app.commit(name, R.doneBody(p));
}

// R22, R23: one sponsor prize per nickname per day; the player picks from what is left. Runs after the nickname
// and before the ticket screen (R9), so the +2 swap tickets are on the same ticket screen.
export async function sponsorPrize(app, name, p) {
  const n = CONFIG.tickets.swap;
  const left = R.itemsLeft(p.sponsor, app.led(name), CONFIG);
  if (!left.length) { // staff changed the stock meanwhile: never below 0 (D12)
    await app.commit(name, R.awardBody('swap', p, app.led(name), CONFIG));
    await screens.message(fill(T.soldOutNow, { n }), [], { cls: 'gold' });
    return;
  }
  if (R.alreadyWon(p, app.led(name)) && await screens.alreadyWon(p.nick, n)) {
    await app.commit(name, R.awardBody('swap', p, app.led(name), CONFIG));
    return;
  }
  const tier = CONFIG.sponsors[p.sponsor];
  const id = tier.pick && left.length > 1 ? await screens.pickItem(p.sponsor, left) : left[0].id;
  await app.commit(name, R.itemBody(p, id, app.led(name), CONFIG));
}
