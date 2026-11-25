"""Santa TUS market-day program (launcher.py): the entry point of the one-file builds (M1-M8).

  dist/santa-tus-linux-x64         Fedora (main laptop), double-click or ./santa-tus-linux-x64
  dist/santa-tus-windows-x64.exe   Windows (backup laptop)

It wraps server.py (same saving, same data format on both laptops) and adds:
  M1 data folder "SantaTUS-data" next to the program (else in the home folder, and says where)
  M2 only ONE copy per data folder (an operating-system lock). A 2nd start just opens the game window again.
  M3 a free port is found by itself; the server keeps running when the browser window is closed
  M4 at start: a half-written last log line (power cut) is moved aside, the database and the log are
      checked and filled from each other, a broken database is moved aside and rebuilt from the log
  M5 backups every 5 minutes into SantaTUS-data/backups/auto-<time> (the last 20 are kept)
  M6 USB backup: found by itself (or staff pick the folder from F9 -> P)
  M7 the browser full screen: Firefox kiosk first on Linux, then Chromium / Chrome; Edge or Chrome on Windows
  M8 Linux: a "Santa TUS" launcher in the app list (and on the desktop) after the first start
Run from the source:  python3 server/launcher.py [--no-browser] [--port 8765] [--data folder] [--window]
"""

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import server as S  # noqa: E402
from recovery import repair_log, check_db, sync_ledger, auto_backup, every_five_minutes  # noqa: E402

FROZEN = getattr(sys, "frozen", False)
DATA_NAME = "SantaTUS-data"
LOCK = None  # the open lock file (held while the program runs)


def program_dir():
    return os.path.dirname(os.path.abspath(sys.executable if FROZEN else os.path.dirname(os.path.abspath(__file__))))


def bundle_root():
    return getattr(sys, "_MEIPASS", S.ROOT) if FROZEN else S.ROOT


def can_write(folder):
    try:
        os.makedirs(folder, exist_ok=True)
        test = os.path.join(folder, ".write-test")
        with open(test, "w", encoding="utf-8") as f:
            f.write("ok")
            f.flush()
            os.fsync(f.fileno())
        os.remove(test)
        return True
    except OSError:
        return False


def pick_data_dir(arg):
    """M1: (folder, note). note is set when the folder is not the normal one."""
    if arg or os.environ.get("SANTA_DATA_DIR"):
        return os.path.abspath(arg or os.environ["SANTA_DATA_DIR"]), None
    first = os.path.join(program_dir(), DATA_NAME)
    if can_write(first):
        return first, None
    home = os.path.join(os.path.expanduser("~"), DATA_NAME)
    os.makedirs(home, exist_ok=True)
    return home, f"Cannot save next to the program. Saving in: {home}"


class Tee:
    """Everything the server prints also goes to SantaTUS-data/server.log (no terminal on a double-click)."""

    def __init__(self, path, other):
        self.f = open(path, "a", encoding="utf-8", buffering=1)
        self.other = other

    def write(self, s):
        self.f.write(s)
        if self.other:
            try:
                self.other.write(s)
            except Exception:  # noqa: BLE001
                self.other = None

    def flush(self):
        self.f.flush()
        if self.other:
            try:
                self.other.flush()
            except Exception:  # noqa: BLE001
                self.other = None


def tell(msg):
    """A message the staff can see without a terminal (zenity / notify-send on Linux, a box on Windows)."""
    S.log(msg)
    try:
        if sys.platform == "win32":
            import ctypes
            threading.Thread(target=lambda: ctypes.windll.user32.MessageBoxW(None, msg, "Santa TUS", 0x40040), daemon=True).start()
        elif shutil.which("zenity"):
            subprocess.Popen(["zenity", "--info", "--title=Santa TUS", f"--text={msg}", "--width=420"], start_new_session=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif shutil.which("notify-send"):
            subprocess.Popen(["notify-send", "Santa TUS", msg], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:  # noqa: BLE001
        pass


def take_lock(data_dir):
    """M2: True if this is the only copy running on this data folder."""
    global LOCK
    LOCK = open(os.path.join(data_dir, "santa.lock"), "a+")
    try:
        if sys.platform == "win32":
            import msvcrt
            LOCK.seek(0)
            msvcrt.locking(LOCK.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(LOCK.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except OSError:
        return False


def wait_running_port(data_dir, secs=15):
    end = time.time() + secs
    while time.time() < end:
        port = S.running_port(data_dir)
        if port:
            return port
        time.sleep(0.5)
    return None


# ---------- M6: staff pick the backup folder (F9 -> P) ----------
def ask_folder():
    try:
        if sys.platform == "win32":
            ps = ("Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                  "$d.Description = 'Santa TUS: pick the USB stick'; $w = New-Object System.Windows.Forms.Form; $w.TopMost = $true; "
                  "if ($d.ShowDialog($w) -eq 'OK') { $d.SelectedPath }")
            out = subprocess.run(["powershell", "-NoProfile", "-STA", "-Command", ps], capture_output=True, text=True, timeout=600,
                                 creationflags=0x08000000)
        elif shutil.which("zenity"):
            out = subprocess.run(["zenity", "--file-selection", "--directory", "--title=Santa TUS: pick the USB stick"],
                                 capture_output=True, text=True, timeout=600)
        else:
            return None
        path = out.stdout.strip()
        return path if path and os.path.isdir(path) else None
    except Exception as err:  # noqa: BLE001
        S.log(f"Folder picker failed: {err}")
        return None


def make_handler(srv):
    base = S.make_handler(srv)

    class Handler(base):  # the game files come from S.ROOT (set to the bundle in main)
        def do_POST(self):
            path, _, _ = self.query()
            if path == "/api/backup-pick":
                folder = ask_folder()
                if not folder:
                    return self.send_json({"ok": False, "error": "no folder picked"})
                os.environ["SANTA_USB_DIR"] = folder  # later backups go there too
                try:
                    return self.send_json(srv.backup())
                except Exception as err:  # noqa: BLE001
                    return self.send_json({"ok": False, "error": str(err)}, 500)
            return super().do_POST()

        def do_GET(self):
            path, _, _ = self.query()
            if path == "/api/health":
                h = srv.health()
                h["dataNote"] = getattr(srv, "data_note", None)
                return self.send_json(h)
            return super().do_GET()

    return Handler


# ---------- M7: the browser, full screen ----------
FIREFOX_PREFS = """user_pref("media.autoplay.default", 0);
user_pref("media.autoplay.blocking_policy", 0);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("browser.translations.automaticallyPopup", false);
user_pref("full-screen-api.warning.timeout", 0);
user_pref("browser.tabs.warnOnClose", false);
"""


def open_window(url, data_dir, kiosk=True):
    if sys.platform == "win32":
        exe, kind = S.find_browser()  # Chrome, then Edge
        if exe:
            return S.open_browser(url, data_dir, kiosk)
        return tell(f"No Edge or Chrome found. Open this address in a browser: {url}")
    quiet = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "start_new_session": True}
    firefox = shutil.which("firefox")
    if firefox:
        profile = os.path.join(data_dir, "browser-firefox")
        os.makedirs(profile, exist_ok=True)
        with open(os.path.join(profile, "user.js"), "w", encoding="utf-8") as f:
            f.write(FIREFOX_PREFS)
        S.log(f"Opening Firefox{' (kiosk)' if kiosk else ''}: {url}")
        subprocess.Popen([firefox, "--profile", profile] + (["--kiosk"] if kiosk else []) + [url], **quiet)
        return None
    if shutil.which("flatpak"):
        try:
            if subprocess.run(["flatpak", "info", "org.mozilla.firefox"], capture_output=True, timeout=10).returncode == 0:
                S.log(f"Opening Firefox (flatpak): {url}")
                subprocess.Popen(["flatpak", "run", "org.mozilla.firefox"] + (["--kiosk"] if kiosk else []) + [url], **quiet)
                return None
        except Exception:  # noqa: BLE001
            pass
    exe, _ = S.find_browser()  # Chromium / Chrome
    if exe:
        return S.open_browser(url, data_dir, kiosk)
    return tell(f"No Firefox or Chrome found. Open this address in a browser: {url}")


# ---------- M8: Linux app launcher ----------
def desktop_launcher():
    if sys.platform == "win32" or not FROZEN:
        return
    exe = os.path.abspath(sys.executable)
    text = ("[Desktop Entry]\nType=Application\nName=Santa TUS\nComment=Santa TUS arcade game (BIG KEAF stall)\n"
            f"Exec=\"{exe}\"\nTerminal=false\nCategories=Game;\nStartupNotify=false\n")
    places = [os.path.join(os.path.expanduser("~"), ".local", "share", "applications"), os.path.join(os.path.expanduser("~"), "Desktop")]
    for folder in places:
        try:
            if not os.path.isdir(folder):
                if folder.endswith("Desktop"):
                    continue
                os.makedirs(folder, exist_ok=True)
            path = os.path.join(folder, "santa-tus.desktop")
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    if f.read() == text:
                        continue
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            os.chmod(path, 0o755)
            if shutil.which("gio"):
                subprocess.run(["gio", "set", path, "metadata::trusted", "true"], capture_output=True, timeout=5)
            S.log(f"Launcher written: {path}")
        except Exception as err:  # noqa: BLE001
            S.log(f"Launcher not written in {folder}: {err}")


def bind_any(handler, first):
    try:
        return S.bind(handler, first)
    except SystemExit:  # M3: 20 ports busy: let the system pick a free one
        return S.bind(handler, 0)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Santa TUS (market-day program)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--data", default=None, help="data folder (default: SantaTUS-data next to the program)")
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--window", action="store_true", help="a normal window, not full screen")
    args = ap.parse_args(argv)
    data_dir, note = pick_data_dir(args.data)
    sys.stdout = Tee(os.path.join(data_dir, "server.log"), sys.stdout)
    sys.stderr = sys.stdout
    if sys.platform != "win32":
        import signal
        signal.signal(signal.SIGHUP, signal.SIG_IGN)  # closing a terminal does not stop the server
    S.ROOT = bundle_root()  # the game files (inside the one-file program)

    if not take_lock(data_dir):  # M2: already running: just open the window again
        port = wait_running_port(data_dir)
        S.log(f"Santa TUS is already running (port {port}). Opening the game window again.")
        if port and not args.no_browser:
            open_window(f"http://127.0.0.1:{port}/", data_dir, kiosk=not args.window)
        elif not port:
            tell("Santa TUS is already running but does not answer. Restart the laptop, then start Santa TUS again.")
        return 0

    for name in S.LEDGERS:  # M4
        repair_log(os.path.join(data_dir, f"santa-{name}.log.jsonl"))
        check_db(os.path.join(data_dir, f"santa-{name}.db"))
    srv = S.Server(data_dir)
    srv.data_note = note
    for led in srv.ledgers.values():
        sync_ledger(led)
    httpd, port = bind_any(make_handler(srv), args.port)
    with open(os.path.join(data_dir, "server.json"), "w", encoding="utf-8") as f:
        json.dump({"port": port, "pid": os.getpid(), "started": dt.datetime.now().isoformat()}, f)
    url = f"http://127.0.0.1:{port}/"
    S.log(f"Santa TUS {srv.version} running at {url}")
    S.log(f"Data folder: {data_dir}")
    if note:
        tell(note)
    try:
        auto_backup(srv)
    except Exception as err:  # noqa: BLE001
        S.log(f"First backup failed: {err}")
    threading.Thread(target=every_five_minutes, args=(srv,), daemon=True).start()
    desktop_launcher()
    if not args.no_browser:
        threading.Timer(0.5, open_window, (url, data_dir, not args.window)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        S.log("Stopping.")
    finally:
        srv.safe_backup()
    return 0


if __name__ == "__main__":
    sys.exit(main())
