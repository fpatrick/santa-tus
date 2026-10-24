// store.js: saves events. Two modes:
//  - server mode (stall laptop): each event goes to server.py, which writes it to SQLite and the log
//    before the game moves on (D1). A copy also stays in this browser.
//  - browser mode (staff test link, P1): no server, events stay in this browser only.
// D4: if the server stops, events wait in the browser and are sent again when it is back.

const PREFIX = 'santatus:v1:';
export const LEDGERS = ['live', 'test'];

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch { return null; }
}
function writeLS(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
}

async function request(url, opts = {}, ms = 2500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
const postJson = (url, body, ms) => request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, ms);

function merge(a, b) {
  const map = new Map();
  for (const ev of [...a, ...b]) map.set(ev.id, ev);
  return [...map.values()].sort((x, y) => x.n - y.n);
}

export async function createStore({ forceBrowser = false } = {}) {
  const st = { mode: 'browser', online: true, health: null, events: {}, pending: {}, listeners: [] };
  const health = forceBrowser ? null : await request('api/health', {}, 1500);
  if (health && health.ok) { st.mode = 'server'; st.health = health; }

  for (const name of LEDGERS) {
    st.pending[name] = readLS(`${name}:pending`) || [];
    if (st.mode === 'server') {
      const r = await request(`api/events?ledger=${name}`, {}, 5000);
      st.events[name] = merge(r ? r.events : readLS(`${name}:cache`) || [], st.pending[name]);
    } else {
      st.events[name] = readLS(`${name}:events`) || [];
    }
  }

  const notify = () => { for (const fn of st.listeners) fn({ online: st.online, pending: pendingCount() }); };
  const pendingCount = () => LEDGERS.reduce((a, n) => a + st.pending[n].length, 0);
  st.onStatus = (fn) => st.listeners.push(fn);
  st.pendingCount = pendingCount;

  async function flush(name) {
    if (!st.pending[name].length) return true;
    const batch = [...st.pending[name]];
    const r = await postJson(`api/events?ledger=${name}`, { events: batch });
    if (!r || !r.ok) return false;
    const sent = new Set(batch.map((e) => e.id));
    st.pending[name] = st.pending[name].filter((e) => !sent.has(e.id));
    writeLS(`${name}:pending`, st.pending[name]);
    return true;
  }

  // Saves one event. In server mode it waits for the server (at most ~2.5 s), then goes on anyway (D4).
  st.append = async (name, ev) => {
    st.events[name].push(ev);
    if (st.mode === 'browser') {
      if (!writeLS(`${name}:events`, st.events[name])) console.warn('Browser storage is full');
      return true;
    }
    st.pending[name].push(ev);
    writeLS(`${name}:pending`, st.pending[name]);
    writeLS(`${name}:cache`, st.events[name]);
    const ok = await flush(name);
    if (ok !== st.online) { st.online = ok; notify(); }
    return ok;
  };

  // D4: keeps trying to send waiting events every 3 seconds.
  if (st.mode === 'server') {
    setInterval(async () => {
      if (!pendingCount() && st.online) return;
      let ok = true;
      for (const name of LEDGERS) ok = (await flush(name)) && ok;
      if (!pendingCount()) {
        const h = await request('api/health', {}, 1500);
        ok = ok && !!(h && h.ok);
      }
      if (ok !== st.online) { st.online = ok; notify(); }
      else if (ok) notify();
    }, 3000);
  }

  st.check = async () => (st.mode === 'server' ? request('api/health', {}, 2000) : null);

  st.backup = async () => {
    if (st.mode === 'server') return postJson('api/backup', {}, 15000);
    download(`santatus-backup-${stampNow()}.json`, JSON.stringify(st.events, null, 1), 'application/json');
    return { ok: true, local: 'downloaded to this computer' };
  };

  st.exportCsv = async (name, csv) => {
    download(`santatus-${name}-${stampNow()}.csv`, csv, 'text/csv');
    if (st.mode === 'server') return request(`api/export?ledger=${name}`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv }, 15000);
    return { ok: true, path: 'downloaded to this computer' };
  };

  // K2 new day: archive the day and start empty. Nothing is deleted (D5).
  st.newDay = async (name) => {
    if (st.mode === 'server') {
      await flush(name);
      const r = await postJson(`api/newday?ledger=${name}`, {}, 15000);
      if (!r || !r.ok) return r || { ok: false };
    } else {
      writeLS(`${name}:archive:${stampNow()}`, st.events[name]);
    }
    st.events[name] = [];
    st.pending[name] = [];
    writeLS(`${name}:events`, []);
    writeLS(`${name}:pending`, []);
    writeLS(`${name}:cache`, []);
    return { ok: true };
  };

  // L3: a second screen reads new events every second (server) or from other tabs (browser).
  st.watch = (name, cb) => {
    if (st.mode === 'server') {
      setInterval(async () => {
        const after = st.events[name].length ? st.events[name][st.events[name].length - 1].n : 0;
        const r = await request(`api/events?ledger=${name}&after=${after}`, {}, 2000);
        if (r && r.events.length) { st.events[name] = merge(st.events[name], r.events); cb(st.events[name]); }
      }, 1000);
    } else {
      window.addEventListener('storage', (e) => {
        if (e.key === `${PREFIX}${name}:events`) { st.events[name] = readLS(`${name}:events`) || []; cb(st.events[name]); }
      });
    }
  };

  return st;
}

function stampNow() {
  const d = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
