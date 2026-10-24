// flow.js: one payment from start to hand-over (the S3 -> S10 path). It asks rules.js what comes
// next, saves each event BEFORE showing the result (D1), and shows the right screen or effect.

import { CONFIG } from './config.js';
import * as R from './rules.js';
import { displayName, rankFor, fmtTickets } from './ledger.js';
import * as screens from './screens.js';
import * as fx from './fx.js';
import { sfx } from './sound.js';
import { music } from './music.js';

const TH = CONFIG.thresholds;
const MILESTONE_TIER = { 10: 1, 20: 2, 30: 3, 40: 3, 50: 4 };

// app: { led(name), commit(name, body), flight, wheel, setScene(name), refresh() }
export async function runPayment(app, name, p) {
  app.flowActive = true;
  music.lobby(); // soft Jingle Bells under every screen of the payment
  try {
    for (let guard = 0; guard < 200; guard++) {
      if (p.status !== 'open') return; // undone from the staff panel
      const s = app.led(name);
      const st = R.nextStep(p, s, CONFIG);
      if (st.step === 'fly') await flyOnce(app, name, p);
      else if (st.step === 'award') await giveAward(app, name, p, st.kind);
      else if (st.step === 'wheel') await spinWheel(app, name, p);
      else if (st.step === 'choice') await pickChoice(app, name, p, st.freeTile);
      else if (st.step === 'nick') await askNick(app, name, p);
      else if (st.step === 'handover') {
        await screens.handover({ items: R.handoverItems(p, CONFIG), pid: p.pid, best: p.best, name: displayName(p, CONFIG) });
        await app.commit(name, R.doneBody(p));
        app.freshPid = p.pid;
        app.refresh();
        return; // R17: straight back to the title screen
      }
    }
  } finally {
    app.flowActive = false;
    app.setScene('attract');
  }
}

// S4-S6: one try, with free restarts (R3). Resolves after the try is saved.
async function flyOnce(app, name, p) {
  let restarts = 0;
  for (;;) {
    app.flight.reset();
    app.hud = { triesLeft: R.triesLeft(p), best: p.best, restarts };
    app.setScene('flight');
    music.lobby();
    const res = await app.waitFlight();
    if (res.aborted || p.status !== 'open') return;
    if (!res.beat && R.isFreeRestart(res.pillars, restarts, CONFIG)) {
      restarts += 1;
      sfx.restart();
      await screens.message(CONFIG.text.freeRestart, ['THIS TRY IS NOT USED.'], { secs: 1.6, cls: 'gold' });
      continue;
    }
    await app.commit(name, R.tryBody(p, res.pillars, restarts));
    music.lobby();
    if (res.beat) {
      await screens.message(CONFIG.text.beat, [`ALL ${TH.beat} CHIMNEYS!`], { secs: CONFIG.timing.tryOver + 1, cls: 'gold' });
    } else {
      const lines = [`CHIMNEY ${res.pillars}`, `BEST SO FAR: ${p.best}`];
      if (R.triesLeft(p) > 0) lines.push(`TRIES LEFT: ${R.triesLeft(p)}`);
      await screens.message('TRY OVER', lines, { secs: CONFIG.timing.tryOver });
    }
    return;
  }
}

// R6, R8, R11: shows the award after it is saved.
async function giveAward(app, name, p, kind) {
  const ev = await app.commit(name, R.awardBody(kind, p, app.led(name), CONFIG));
  if (kind === 'p20') {
    sfx.ticket(ev.tickets.length);
    fx.celebrate(2, 640, 560, '', '#ff8fd0');
    await screens.message('DRAW TICKET!', [`TICKET ${fmtTickets(ev.tickets)}`, 'NOW SPIN THE WHEEL!'], { secs: CONFIG.timing.awardShow, cls: 'gold' });
  } else if (kind === 'p30') {
    sfx.milestone(3);
    fx.celebrate(3, 640, 560, '', '#ffd23f');
    await screens.message('LEGEND!', [`+${ev.tickets.length} TICKETS: ${fmtTickets(ev.tickets)}`, 'YOUR NAME GOES ON THE LEGENDS LIST'], { secs: CONFIG.timing.awardShow + 1, cls: 'gold' });
  } else {
    sfx.milestone(1);
    await screens.message('THANK YOU!', [`1 ${CONFIG.consolation.item} FOR YOU`], { secs: CONFIG.timing.awardShow });
  }
}

// R7: pick and save the result first, then spin.
async function spinWheel(app, name, p) {
  const ev = await app.commit(name, R.wheelBody(p, app.led(name), CONFIG));
  const outcome = CONFIG.wheel.outcomes.find((o) => o.id === ev.result);
  app.setScene('wheel');
  music.duck(true);
  await app.wheel.spin(outcome);
  const lines = [];
  if (ev.tickets.length) lines.push(`TICKETS ${fmtTickets(ev.tickets)}`);
  if (ev.cash) lines.push('STAFF WILL PAY YOU AT THE END');
  if (ev.freeTry) lines.push('ONE MORE TRY!');
  await screens.message(outcome.label, lines, { secs: CONFIG.timing.awardShow, cls: 'gold' });
  music.duck(false);
}

// S8 / R5
async function pickChoice(app, name, p, freeTile) {
  sfx.milestone(1);
  const id = await screens.choice(freeTile);
  await app.commit(name, R.choiceBody(p, id, CONFIG));
  const tile = CONFIG.choice.find((c) => c.id === id);
  if (id === 'free') {
    sfx.restart();
    await screens.message('FREE TRY!', ['GOOD LUCK!'], { secs: 1.8, cls: 'gold' });
  } else {
    sfx.reveal(1);
    fx.celebrate(1, 640, 540, '', '#3dff8b');
    await screens.message(`1 ${tile.label}!`, ['ENJOY!'], { secs: 1.8 });
  }
}

// S9
async function askNick(app, name, p) {
  const nick = await screens.nickname({ pid: p.pid, best: p.best, rank: rankFor(app.led(name), p), legend: p.best >= TH.legend });
  await app.commit(name, R.nickBody(p, nick, CONFIG));
}

// Effects while flying: points, new levels and milestone celebrations.
export function flightHooks(app) {
  return {
    onStart: (course) => music.flight(course), // Jingle Bells from the first click, timed to the chimneys
    onFlap: (x, y) => { sfx.flap(); fx.burst(x - 40, y + 10, { count: 4, colors: ['#ffd23f', '#f4f7ff'], speed: 160, size: 5, gravity: 200, life: 0.5, kind: 'star', angle: Math.PI, spread: 1.2 }); },
    onScore: (n) => {
      sfx.point(Math.ceil(n / 10));
      const tier = MILESTONE_TIER[n];
      if (tier && n < TH.beat) {
        sfx.milestone(tier);
        fx.celebrate(tier, CONFIG.physics.santaX, app.flight.y, CONFIG.text.milestones[n], tier >= 3 ? '#ffd23f' : '#3dff8b');
      }
    },
    onLevel: (lv) => { sfx.level(lv.n); fx.popText(`LEVEL ${lv.n} ${lv.name}`, { x: 640, y: 420, size: 64, color: lv.color, life: CONFIG.timing.banner }); },
    onCrash: (n, x, y) => {
      music.stop(0.08);
      sfx.crash();
      fx.burst(x, y, { count: 40, colors: ['#f4f7ff', '#ff3b4f', '#ffd23f'], speed: 500, size: 8 });
      fx.shake(10, 0.35);
      setTimeout(() => app.endFlight({ pillars: n, beat: false }), 1000);
    },
    onBeat: (n) => {
      music.stop(0.4);
      sfx.milestone(4);
      fx.celebrate(4, 640, 500, CONFIG.text.milestones[50], '#ffd23f');
      setTimeout(() => app.endFlight({ pillars: n, beat: true }), 2500);
    },
  };
}
