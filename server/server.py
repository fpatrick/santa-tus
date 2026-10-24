"""Santa TUS local server (server.py).

Serves the game to Chrome on this laptop only (127.0.0.1, W5), saves every event to a SQLite
database and to a log file that only grows (D1, D2), copies both to a USB stick (D2), exports
CSV files, archives a day (D5) and opens Chrome in kiosk mode (W4).

Python standard library only, so the official Windows embeddable Python can run it (W2).
Run:  python server/server.py            (normal, opens the browser)
      python server/server.py --window   (normal window instead of full-screen kiosk)
      python server/server.py --no-browser --port 8765 --data some/folder   (tests)
"""

import argparse
import datetime as dt
import http.server
import json
import os
import re
import shutil
import sqlite3
import string
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGERS = ("live", "test")
PUBLIC = ("index.html", "style.css", "src/", "assets/", "print/")
BACKUP_FOLDER = "SantaTUS-backup"
BACKUP_EVERY = 300  # seconds (D2: every 5 minutes)


def log(msg):
    stamp = dt.datetime.now().strftime("%H:%M:%S")
    print(f"[{stamp}] {msg}", flush=True)


def read_version():
    try:
        with open(os.path.join(ROOT, "src", "version.js"), encoding="utf-8") as f:
            text = f.read()
        v = re.search(r"VERSION = '([^']+)'", text)
        st = re.search(r"STAGE = '([^']+)'", text)
        return f"{st.group(1) if st else ''} {v.group(1) if v else '?'}".strip()
    except OSError:
        return "?"


def default_data_dir():
    """W6: data lives in Documents\\SantaTUS-data, outside the game folder."""
    if os.environ.get("SANTA_DATA_DIR"):
        return os.environ["SANTA_DATA_DIR"]
    docs = None
    if sys.platform == "win32":
        try:
            import ctypes
            buf = ctypes.create_unicode_buffer(260)
            if ctypes.windll.shell32.SHGetFolderPathW(None, 5, None, 0, buf) == 0:  # 5 = My Documents
                docs = buf.value
        except Exception:  # noqa: BLE001
            docs = None
    if not docs:
        docs = os.path.join(os.path.expanduser("~"), "Documents")
    return os.path.join(docs, "SantaTUS-data")


def stamp_now():
    return dt.datetime.now().strftime("%Y%m%d-%H%M%S")


class Ledger:
    """One SQLite file + one log file. All writes hold a lock and are synced to disk (D1, D2)."""

    def __init__(self, data_dir, name):
        self.data_dir = data_dir
        self.name = name
        self.lock = threading.Lock()
        self.db_path = os.path.join(data_dir, f"santa-{name}.db")
        self.log_path = os.path.join(data_dir, f"santa-{name}.log.jsonl")
        self.open()

    def open(self):
        self.db = sqlite3.connect(self.db_path, check_same_thread=False, isolation_level=None)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, n INTEGER, ts INTEGER, t TEXT,"
            " pid INTEGER, body TEXT NOT NULL, saved_at INTEGER)"
        )
        self.db.execute("CREATE INDEX IF NOT EXISTS events_n ON events (n)")

    def add(self, events):
        added = []
        with self.lock:
            self.db.execute("BEGIN IMMEDIATE")
            try:
                for ev in events:
                    if not isinstance(ev, dict) or "id" not in ev:
                        continue
                    cur = self.db.execute(
                        "INSERT OR IGNORE INTO events (id, n, ts, t, pid, body, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (str(ev["id"]), int(ev.get("n", 0)), int(ev.get("ts", 0)), str(ev.get("t", "")),
                         ev.get("pid"), json.dumps(ev, ensure_ascii=False), int(time.time() * 1000)),
                    )
                    if cur.rowcount:
                        added.append(ev)
                self.db.execute("COMMIT")
            except Exception:
                self.db.execute("ROLLBACK")
                raise
            if added:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    for ev in added:
                        f.write(json.dumps(ev, ensure_ascii=False) + "\n")
                    f.flush()
                    os.fsync(f.fileno())
        return added

    def all(self, after=0):
        with self.lock:
            rows = self.db.execute("SELECT body FROM events WHERE n > ? ORDER BY n, ts", (after,)).fetchall()
        return [json.loads(r[0]) for r in rows]

    def check(self):
        with self.lock:
            return self.db.execute("PRAGMA quick_check").fetchone()[0]

    def copy_to(self, folder, suffix=""):
        """A safe copy of the database (SQLite backup API) and the log file."""
        os.makedirs(folder, exist_ok=True)
        dest = os.path.join(folder, f"santa-{self.name}{suffix}.db")
        tmp = dest + ".tmp"
        with self.lock:
            out = sqlite3.connect(tmp)
            self.db.backup(out)
            out.close()
            if os.path.exists(self.log_path):
                shutil.copyfile(self.log_path, os.path.join(folder, f"santa-{self.name}{suffix}.log.jsonl"))
        os.replace(tmp, dest)
        return dest

    def archive(self):
        """D5: new day. Moves the files into archive/ and starts an empty ledger. Nothing is deleted."""
        folder = os.path.join(self.data_dir, "archive")
        os.makedirs(folder, exist_ok=True)
        tag = stamp_now()
        with self.lock:
            self.db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            self.db.close()
            for path in (self.db_path, self.db_path + "-wal", self.db_path + "-shm", self.log_path):
                if os.path.exists(path):
                    base = os.path.basename(path).replace(f"santa-{self.name}", f"santa-{self.name}-{tag}")
                    shutil.move(path, os.path.join(folder, base))
            self.open()
        return os.path.join(folder, f"santa-{self.name}-{tag}.db")


def find_usb():
    """The USB stick for backups (D2). A drive with a SantaTUS-backup folder wins, else the first removable drive."""
    if os.environ.get("SANTA_USB_DIR"):
        path = os.environ["SANTA_USB_DIR"]
        return path if os.path.isdir(path) else None
    if sys.platform != "win32":
        return None
    try:
        import ctypes
        mask = ctypes.windll.kernel32.GetLogicalDrives()
        removable = []
        for i, letter in enumerate(string.ascii_uppercase):
            if letter in "ABC" or not mask & (1 << i):
                continue
            root = f"{letter}:\\"
            if os.path.isdir(os.path.join(root, BACKUP_FOLDER)):
                return root
            if ctypes.windll.kernel32.GetDriveTypeW(root) == 2:  # DRIVE_REMOVABLE
                removable.append(root)
        return removable[0] if removable else None
    except Exception:  # noqa: BLE001
        return None


class Server:
    def __init__(self, data_dir):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.ledgers = {name: Ledger(data_dir, name) for name in LEDGERS}
        self.version = read_version()
        self.last_backup = None
        self.backup_lock = threading.Lock()

    def backup(self):
        """Copies every ledger to data/backups (always) and to the USB stick (if one is there)."""
        with self.backup_lock:
            local = os.path.join(self.data_dir, "backups")
            for led in self.ledgers.values():
                led.copy_to(local)
            usb = find_usb()
            usb_path = None
            if usb:
                usb_path = os.path.join(usb, BACKUP_FOLDER)
                try:
                    for led in self.ledgers.values():
                        led.copy_to(usb_path)
                except OSError as err:
                    log(f"USB backup failed: {err}")
                    usb_path = None
            self.last_backup = dt.datetime.now().isoformat(timespec="seconds")
            return {"ok": True, "local": local, "usb": usb_path, "time": self.last_backup}

    def backup_soon(self):
        threading.Thread(target=self.safe_backup, daemon=True).start()

    def safe_backup(self):
        try:
            r = self.backup()
            log(f"Backup done. USB: {r['usb'] or 'none'}")
        except Exception as err:  # noqa: BLE001
            log(f"Backup failed: {err}")

    def health(self):
        db = "ok"
        try:
            for led in self.ledgers.values():
                res = led.check()
                if res != "ok":
                    db = res
        except Exception as err:  # noqa: BLE001
            db = f"error: {err}"
        usb = find_usb()
        return {
            "ok": True, "version": self.version, "time": dt.datetime.now().isoformat(timespec="seconds"),
            "db": db, "usb": os.path.join(usb, BACKUP_FOLDER) if usb else None,
            "dataDir": self.data_dir, "lastBackup": self.last_backup,
        }

    def export(self, ledger, text):
        folder = os.path.join(self.data_dir, "exports")
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, f"santa-{ledger}-{stamp_now()}.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            f.write(text)
        usb = find_usb()
        if usb:
            try:
                os.makedirs(os.path.join(usb, BACKUP_FOLDER), exist_ok=True)
                shutil.copy(path, os.path.join(usb, BACKUP_FOLDER, os.path.basename(path)))
            except OSError as err:
                log(f"USB export copy failed: {err}")
        return path


def make_handler(srv):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=ROOT, **kw)

        def log_message(self, fmt, *args):  # quiet: only errors are printed
            if args and str(args[1]).startswith(("4", "5")) and "favicon" not in str(args[0]):
                log(fmt % args)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def send_json(self, obj, code=200):
            data = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def query(self):
            url = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(url.query)
            ledger = q.get("ledger", ["live"])[0]
            return url.path, (ledger if ledger in LEDGERS else None), q

        def body(self):
            n = int(self.headers.get("Content-Length") or 0)
            return self.rfile.read(n) if n else b""

        def do_GET(self):
            path, ledger, q = self.query()
            if path == "/api/health":
                return self.send_json(srv.health())
            if path == "/api/events":
                if not ledger:
                    return self.send_json({"ok": False, "error": "bad ledger"}, 400)
                after = int(q.get("after", ["0"])[0] or 0)
                return self.send_json({"ok": True, "events": srv.ledgers[ledger].all(after)})
            rel = path.lstrip("/")
            if path == "/" or rel.startswith(PUBLIC) or rel in PUBLIC:
                return super().do_GET()
            return self.send_error(404)

        def do_POST(self):
            path, ledger, _ = self.query()
            try:
                if path == "/api/events" and ledger:
                    events = json.loads(self.body() or b"{}").get("events", [])
                    added = srv.ledgers[ledger].add(events)
                    if any(ev.get("t") in ("done", "draw", "undo") for ev in added):
                        srv.backup_soon()  # D2: after every payment
                    return self.send_json({"ok": True, "added": len(added)})
                if path == "/api/backup":
                    return self.send_json(srv.backup())
                if path == "/api/export" and ledger:
                    return self.send_json({"ok": True, "path": srv.export(ledger, self.body().decode("utf-8"))})
                if path == "/api/newday" and ledger:
                    srv.backup()
                    return self.send_json({"ok": True, "archived": srv.ledgers[ledger].archive()})
            except Exception as err:  # noqa: BLE001
                log(f"Error on {path}: {err}")
                return self.send_json({"ok": False, "error": str(err)}, 500)
            return self.send_error(404)

    return Handler


def find_browser():
    """W4: Chrome first, then Edge (every Windows 10/11 laptop has Edge)."""
    if sys.platform != "win32":
        for name in ("google-chrome", "chromium", "chromium-browser"):
            path = shutil.which(name)
            if path:
                return path, "chrome"
        return None, None
    roots = [os.environ.get(k, "") for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
    for root in roots:
        path = os.path.join(root, "Google", "Chrome", "Application", "chrome.exe")
        if root and os.path.exists(path):
            return path, "chrome"
    for root in roots:
        path = os.path.join(root, "Microsoft", "Edge", "Application", "msedge.exe")
        if root and os.path.exists(path):
            return path, "edge"
    return None, None


def open_browser(url, data_dir, kiosk=True):
    exe, kind = find_browser()
    if not exe:
        import webbrowser
        log("Chrome and Edge not found: opening the default browser.")
        webbrowser.open(url)
        return
    profile = os.path.join(data_dir, f"browser-{kind}")
    args = [exe, f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
            "--autoplay-policy=no-user-gesture-required", "--disable-features=Translate",
            "--overscroll-history-navigation=0", "--disable-pinch", "--disable-session-crashed-bubble"]
    if kiosk:
        args += ["--kiosk", url] + (["--edge-kiosk-type=fullscreen"] if kind == "edge" else [])
    else:
        args += [f"--app={url}", "--start-maximized"]
    log(f"Opening {kind}{' (kiosk)' if kiosk else ''}: {url}")
    subprocess.Popen(args, close_fds=True)


def running_port(data_dir):
    """W3: if the game is already running, return its port."""
    try:
        with open(os.path.join(data_dir, "server.json"), encoding="utf-8") as f:
            port = json.load(f)["port"]
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1.5) as r:
            if json.loads(r.read()).get("ok"):
                return port
    except Exception:  # noqa: BLE001
        return None
    return None


def bind(handler, first_port):
    """W3: if the port is busy, try the next ones."""
    for port in range(first_port, first_port + 20):
        try:
            httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
            httpd.daemon_threads = True
            return httpd, port
        except OSError:
            continue
    raise SystemExit("No free port found between %d and %d" % (first_port, first_port + 19))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Santa TUS local server")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--data", default=None, help="data folder (default: Documents/SantaTUS-data)")
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--window", action="store_true", help="open a normal window, not full-screen kiosk")
    args = ap.parse_args(argv)
    data_dir = os.path.abspath(args.data or default_data_dir())
    os.makedirs(data_dir, exist_ok=True)

    port = running_port(data_dir)
    if port:
        log(f"Santa TUS is already running on port {port}. Opening the screen.")
        if not args.no_browser:
            open_browser(f"http://127.0.0.1:{port}/", data_dir, kiosk=not args.window)
        return 0

    srv = Server(data_dir)
    httpd, port = bind(make_handler(srv), args.port)
    with open(os.path.join(data_dir, "server.json"), "w", encoding="utf-8") as f:
        json.dump({"port": port, "pid": os.getpid(), "started": dt.datetime.now().isoformat()}, f)
    url = f"http://127.0.0.1:{port}/"
    log(f"Santa TUS {srv.version} running at {url}")
    log(f"Data folder: {data_dir}")
    log(f"USB backup: {find_usb() or 'no USB stick found'}")
    log("Keep this window open. Close it only at the end of the day.")

    def every_five_minutes():
        while True:
            time.sleep(BACKUP_EVERY)
            srv.safe_backup()

    threading.Thread(target=every_five_minutes, daemon=True).start()
    if not args.no_browser:
        threading.Timer(0.5, open_browser, (url, data_dir, not args.window)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        log("Stopping.")
    finally:
        srv.safe_backup()
    return 0


if __name__ == "__main__":
    sys.exit(main())
