// helpers.mjs: a small game "robot" for the rule tests. It plays one payment
// through nextStep() exactly like main.js does, without drawing anything.

import { CONFIG } from '../src/config.js';
import { applyEvent, emptyState } from '../src/ledger.js';
import { liveOdds } from '../src/prizes.js';
import * as R from '../src/rules.js';

export function cfgWith(patch = {}) {
  const c = structuredClone(CONFIG);
  return Object.assign(c, patch);
}

// A random function that makes pickOutcome(list) return the outcome with this id (it must have odds > 0).
export function forceList(list, id) {
  const total = list.reduce((a, o) => a + o.odds, 0);
  let start = 0;
  for (const o of list) {
    if (o.id === id) {
      if (!(o.odds > 0)) throw new Error(`outcome ${id} has no chance now`);
      return () => (start + o.odds / 2) / total;
    }
    start += o.odds;
  }
  throw new Error(`no outcome ${id}`);
}
// The same for the wheel: works out the live odds (R24) first, like wheelBody() does.
export function forceWheel(sess, id) {
  return forceList(liveOdds(sess.s, sess.cfg, sess.clock).list, id);
}

export function newSession(cfg = CONFIG) {
  const sess = { cfg, s: emptyState(), events: [], clock: 1_000_000, log: [] };
  sess.commit = (body) => {
    sess.clock += 1000;
    const ev = R.stamp(sess.s, body, sess.clock);
    sess.events.push(ev);
    applyEvent(sess.s, ev);
    return ev;
  };
  return sess;
}

// Plays one payment. tries = pillars per try. wheel = wheel results in order. choices = chimney 10 choices.
// item = the sponsor item to give (default: the first one left), swap = true answers Y to "already won?".
// at = clock (ms) when the payment starts. Returns { p, steps, items }.
export function playPayment(sess, priceId, { tries = [], wheel = [], choices = [], nick = 'SAM', done = true, item = null, swap = false, at = null } = {}) {
  const { cfg } = sess;
  if (at != null) sess.clock = at;
  const pay = sess.commit(R.payBody(sess.s, priceId, cfg));
  const p = sess.s.byPid.get(pay.pid);
  const steps = [];
  const triesQ = [...tries];
  const wheelQ = [...wheel];
  const choiceQ = [...choices];
  for (let guard = 0; guard < 50; guard++) {
    const st = R.nextStep(p, sess.s, cfg);
    steps.push(st.step === 'award' ? `award:${st.kind}` : st.step === 'choice' ? `choice:${st.freeTile ? 'free' : 'nofree'}` : st.step);
    if (st.step === 'fly') {
      if (!triesQ.length) return { p, steps, stoppedAt: 'fly' };
      sess.commit(R.tryBody(p, triesQ.shift()));
    } else if (st.step === 'award') {
      sess.commit(R.awardBody(st.kind, p, sess.s, cfg));
    } else if (st.step === 'wheel') {
      const id = wheelQ.shift();
      if (!id) throw new Error('test needs a wheel result');
      sess.commit(R.wheelBody(p, sess.s, cfg, forceWheel(sess, id), sess.clock));
    } else if (st.step === 'choice') {
      const c = choiceQ.shift();
      if (!c) return { p, steps, stoppedAt: 'choice' };
      sess.commit(R.choiceBody(p, c, cfg));
    } else if (st.step === 'nick') {
      sess.commit(R.nickBody(p, nick, cfg));
    } else if (st.step === 'handover') {
      if (p.sponsor && !p.item && !p.swapped) { // S10: the "already won?" check, then the item pick (flow.js)
        const left = R.itemsLeft(p.sponsor, sess.s, cfg);
        if (swap || !left.length) sess.commit(R.awardBody('swap', p, sess.s, cfg));
        else sess.commit(R.itemBody(p, item || left[0].id, sess.s, cfg));
      }
      const items = R.handoverItems(p, cfg);
      if (done) sess.commit(R.doneBody(p));
      return { p, steps, items };
    }
  }
  throw new Error('payment never ended');
}
