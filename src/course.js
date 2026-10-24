// course.js: builds the 50-chimney course (R4) and checks that it is fair.
// Pure code: no drawing. Used by game.js and the tests (T26).

export function levelFor(i, cfg) {
  return cfg.levels.find((l) => i <= l.to) || cfg.levels[cfg.levels.length - 1];
}

// A small seeded random generator, so tests can repeat a course.
export function seeded(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The gap centre of a chimney at time t (seconds). Moving gaps go up and down (levels 3-5).
export function gapAt(ch, t) {
  if (!ch.move) return ch.center;
  return ch.center + ch.move * Math.sin((2 * Math.PI * t) / ch.period + ch.phase);
}

// R4 fairness: can a player surely get from gap a to gap b?
export function isFairStep(a, b, cfg) {
  const f = cfg.fair;
  const time = (b.x - a.x) / b.speed;
  const need = Math.abs(b.center - a.center) + a.move + b.move;
  const rate = b.center < a.center ? f.riseRate : f.fallRate;
  if (need > rate * time * f.margin) return false;
  if (b.move && (b.move * 2 * Math.PI) / b.period > f.riseRate * f.margin) return false;
  if (b.gap < cfg.physics.hitH + f.minGapExtra) return false;
  const w = cfg.world;
  return b.center - b.move >= w.gapMin && b.center + b.move <= w.gapMax;
}

function makeChimney(i, x, center, cfg, rnd) {
  const lv = levelFor(i, cfg);
  return {
    i, x, center, level: lv.n, gap: lv.gap, speed: lv.speed,
    move: lv.move, period: lv.period || 1, phase: rnd() * Math.PI * 2,
  };
}

// Builds the whole course. x is in world pixels from the start of the try.
export function buildCourse(cfg, rnd = Math.random) {
  const w = cfg.world;
  const out = [];
  let x = cfg.physics.santaX + 760;
  let prev = { x: cfg.physics.santaX, center: w.firstGap, move: 0, speed: cfg.levels[0].speed };
  for (let i = 1; i <= cfg.thresholds.beat; i++) {
    const lv = levelFor(i, cfg);
    if (i > 1) x += lv.spacing;
    const lo = w.gapMin + lv.move;
    const hi = w.gapMax - lv.move;
    let delta = (rnd() * 2 - 1) * lv.step;
    let ch = makeChimney(i, x, clamp(prev.center + delta, lo, hi), cfg, rnd);
    let guard = 0;
    while (!isFairStep(prev, ch, cfg) && guard < 20) {
      delta /= 2;
      ch.center = clamp(prev.center + delta, lo, hi);
      guard += 1;
    }
    out.push(ch);
    prev = ch;
  }
  return out;
}

// Returns the chimneys that fail the fairness check (empty = fair). T26.
export function checkCourse(course, cfg) {
  const bad = [];
  for (let k = 1; k < course.length; k++) {
    if (!isFairStep(course[k - 1], course[k], cfg)) bad.push(course[k].i);
  }
  return bad;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
