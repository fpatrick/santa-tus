// helpers.mjs: a small game "robot" for the rule tests. It plays one payment
// through nextStep() exactly like main.js does, without drawing anything.

import { CONFIG } from '../src/config.js';
import { applyEvent, emptyState } from '../src/ledger.js';
import * as R from '../src/rules.js';

export function cfgWith(patch = {}) {
  const c = structuredClone(CONFIG);
  return Object.assign(c, patch);
}

// A random function that makes pickOutcome() return the outcome with this id.
export function forceWheel(cfg, id) {
  const list = cfg.wheel.outcomes;
  const total = list.reduce((a, o) => a + o.odds, 0);
  let start = 0;
  for (const o of list) {
    if (o.id === id) return () => (start + o.odds / 2) / total;
    start += o.odds;
  }
  throw new Error(`no outcome ${id}`);
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

// Plays one payment. tries = pillars per try. wheel = wheel results in order.
// choices = pillar 10 choices in order. Returns { p, steps, items }.
export function playPayment(sess, priceId, { tries = [], wheel = [], choices = [], nick = 'SAM', done = true } = {}) {
  const { cfg } = sess;
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
      sess.commit(R.wheelBody(p, sess.s, cfg, forceWheel(cfg, id)));
    } else if (st.step === 'choice') {
      const c = choiceQ.shift();
      if (!c) return { p, steps, stoppedAt: 'choice' };
      sess.commit(R.choiceBody(p, c, cfg));
    } else if (st.step === 'nick') {
      sess.commit(R.nickBody(p, nick, cfg));
    } else if (st.step === 'handover') {
      const items = R.handoverItems(p, cfg);
      if (done) sess.commit(R.doneBody(p));
      return { p, steps, items };
    }
  }
  throw new Error('payment never ended');
}
