"""recovery.py: the log and the database never get lost (M4), and the timed backups (M5). Used by launcher.py."""

import json
import os
import shutil
import sqlite3
import time

import server as S

KEEP_AUTO = 20  # M5


# ---------- M4: the log and the database never get lost ----------
def repair_log(path):
    """A power cut during a write can leave half a line at the end: it is moved to a side file, never deleted."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return
    with open(path, "rb") as f:
        data = f.read()
    if data.endswith(b"\n"):
        return
    cut = data.rfind(b"\n") + 1
    side = f"{path}.partial-{S.stamp_now()}"
    with open(side, "wb") as f:
        f.write(data[cut:])
        f.flush()
        os.fsync(f.fileno())
    with open(path, "r+b") as f:
        f.truncate(cut)
        f.flush()
        os.fsync(f.fileno())
    S.log(f"Log repair: a half-written last line ({len(data) - cut} bytes) was moved to {os.path.basename(side)}")


def read_log(path):
    events = []
    if not os.path.exists(path):
        return events
    with open(path, encoding="utf-8", errors="replace") as f:
        for k, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                events.append(json.loads(line))
            except ValueError:
                S.log(f"Log repair: line {k} of {os.path.basename(path)} is not readable, skipped")
    return events


def check_db(path):
    """A database that SQLite cannot read is moved aside (it is rebuilt from the log)."""
    if not os.path.exists(path):
        return
    try:
        con = sqlite3.connect(path)
        ok = con.execute("PRAGMA quick_check").fetchone()[0]
        con.close()
    except sqlite3.Error as err:
        ok = str(err)
    if ok == "ok":
        return
    folder = os.path.join(os.path.dirname(path), f"broken-{S.stamp_now()}")
    os.makedirs(folder, exist_ok=True)
    for p in (path, path + "-wal", path + "-shm"):
        if os.path.exists(p):
            shutil.move(p, os.path.join(folder, os.path.basename(p)))
    S.log(f"Database repair: {os.path.basename(path)} was broken ({ok}); moved to {folder}, rebuilding it from the log")


def sync_ledger(led):
    """The database and the log hold the same events: whatever one is missing is copied from the other."""
    from_log = read_log(led.log_path)
    with led.lock:
        have = {r[0] for r in led.db.execute("SELECT id FROM events")}
        new = [ev for ev in from_log if isinstance(ev, dict) and "id" in ev and str(ev["id"]) not in have]
        if new:
            led.db.execute("BEGIN IMMEDIATE")
            for ev in new:
                led.db.execute("INSERT OR IGNORE INTO events (id, n, ts, t, pid, body, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                               (str(ev["id"]), int(ev.get("n", 0)), int(ev.get("ts", 0)), str(ev.get("t", "")), ev.get("pid"),
                                json.dumps(ev, ensure_ascii=False), int(time.time() * 1000)))
            led.db.execute("COMMIT")
            S.log(f"Recovery: {len(new)} events copied from the log into the {led.name} database")
        logged = {str(ev.get("id")) for ev in from_log if isinstance(ev, dict)}
        rows = led.db.execute("SELECT id, body FROM events ORDER BY n, ts").fetchall()
        missing = [body for (eid, body) in rows if eid not in logged]
        if missing:
            with open(led.log_path, "a", encoding="utf-8") as f:
                for body in missing:
                    f.write(body + "\n")
                f.flush()
                os.fsync(f.fileno())
            S.log(f"Recovery: {len(missing)} events copied from the {led.name} database into the log")


# ---------- M5: timed backups, the last 20 are kept ----------
def auto_backup(srv):
    folder = os.path.join(srv.data_dir, "backups", f"auto-{S.stamp_now()}")
    for led in srv.ledgers.values():
        led.copy_to(folder)
    base = os.path.join(srv.data_dir, "backups")
    autos = sorted(d for d in os.listdir(base) if d.startswith("auto-"))
    for old in autos[:-KEEP_AUTO]:
        shutil.rmtree(os.path.join(base, old), ignore_errors=True)  # only old automatic copies (the log keeps everything)


def every_five_minutes(srv):
    while True:
        time.sleep(S.BACKUP_EVERY)
        try:
            auto_backup(srv)
            srv.safe_backup()  # the latest copy + the USB stick
        except Exception as err:  # noqa: BLE001
            S.log(f"Auto backup failed: {err}")
