"""Full-flow browser test (T12, T13, T30 and the S2-S10 path), with Playwright + Chromium.

Run:  python3 tests/flow_check.py
It starts its own server on a free port with a temporary data folder, so it never touches real data.
Needs: pip install playwright && playwright install chromium (already there in Claude's workspace).
"""

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAST = """(async () => { const { CONFIG } = await import('./src/config.js');
  Object.assign(CONFIG.timing, { tryOver: 0.3, healthOk: 0.2, awardShow: 0.3, banner: 0.3 });
  CONFIG.wheel.spinSeconds = 0.6; })()"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server(port, data):
    return subprocess.Popen([sys.executable, os.path.join(ROOT, "server", "server.py"), "--no-browser",
                             "--port", str(port), "--data", data], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)


def wait_health(port, up=True, secs=8):
    end = time.time() + secs
    while time.time() < end:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=0.5) as r:
                if up and json.loads(r.read())["ok"]:
                    return True
        except Exception:  # noqa: BLE001
            if not up:
                return True
        time.sleep(0.2)
    raise AssertionError("server did not start")


def server_events(port, ledger="live"):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/events?ledger={ledger}", timeout=2) as r:
        return json.loads(r.read())["events"]


def boot(pg, url):
    pg.goto(url)
    pg.wait_for_function("window.santa && window.santa.store && window.santa.scene === 'attract'")
    pg.evaluate(FAST)
    pg.wait_for_selector(".checks", timeout=5000)
    pg.keyboard.press("Enter")
    pg.wait_for_function("!document.querySelector('#overlay.on') || document.querySelector('#overlay h1').textContent.includes('WELCOME')")


def pay(pg, key):
    pg.keyboard.press("F2")
    pg.wait_for_selector(".dots")
    pg.keyboard.type("PAID")
    pg.keyboard.press("Enter")
    pg.wait_for_selector("text=NEW PAYMENT")
    pg.keyboard.press(key)


def finish_try(pg, pillars):
    pg.wait_for_function("santa.scene === 'flight' && santa.flight.state === 'ready' && santa.flightWaiting", timeout=15000)
    pg.evaluate(f"santa.endFlight({{ pillars: {pillars}, beat: false }})")


def overlay_title(pg, text, timeout=15000):
    pg.wait_for_function(f"document.querySelector('#overlay h1') && document.querySelector('#overlay h1').textContent.includes({json.dumps(text)})", timeout=timeout)


def run():
    data = tempfile.mkdtemp(prefix="santa-flow-")
    port = free_port()
    srv = start_server(port, data)
    errors = []
    try:
        wait_health(port)
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
            pg = b.new_page(viewport={"width": 1920, "height": 1080})
            pg.on("pageerror", lambda e: errors.append(str(e)))
            url = f"http://127.0.0.1:{port}/"
            boot(pg, url)

            # S2-S10: €2, best 12, pick sticker, nickname, hand-over (T4)
            pay(pg, "1")
            finish_try(pg, 12)
            pg.wait_for_selector(".tile", timeout=10000)
            pg.locator(".tile", has_text="STICKER").click()
            pg.wait_for_selector("input.nick", timeout=10000)
            pg.keyboard.type("Sam")
            pg.keyboard.press("Enter")
            overlay_title(pg, "HAND-OVER")
            assert "STICKER" in pg.inner_text("#overlay"), "hand-over must list the sticker"
            pg.keyboard.press("Enter")
            pg.wait_for_function("document.querySelector('.board .nm') && document.querySelector('.board .nm').textContent === 'SAM'")
            kinds = [e["t"] for e in server_events(port)]
            assert kinds == ["pay", "try", "award", "nick", "done"], kinds
            print("ok - S2-S10 path: €2, best 12, sticker, nickname, hand-over (T4)")

            # T12: Chrome closed after try 1 of €5: reopens with 2 tries left and the best kept (D3)
            pay(pg, "2")
            finish_try(pg, 7)
            pg.wait_for_function("santa.scene === 'flight' && santa.flight.state === 'ready' && santa.hud.triesLeft === 2", timeout=10000)
            pg.goto("about:blank")
            boot(pg, url)
            overlay_title(pg, "WELCOME BACK")
            pg.wait_for_function("santa.scene === 'flight' && santa.hud && santa.hud.triesLeft === 2 && santa.hud.best === 7", timeout=10000)
            print("ok - T12: payment reopened after a browser restart, 2 tries left, best 7")

            # T13: server stopped during a game: red warning, play goes on, results arrive later (D4)
            srv.terminate()
            srv.wait()
            finish_try(pg, 5)
            pg.wait_for_selector(".banner.down", timeout=10000)
            finish_try(pg, 3)
            srv = start_server(port, data)
            wait_health(port)
            pg.wait_for_function("!document.querySelector('.banner.down')", timeout=15000)
            tries = [e for e in server_events(port) if e["t"] == "try"]
            assert len(tries) == 4, f"expected 4 saved tries, got {len(tries)}"
            print("ok - T13: server down shows a warning, results are saved when it is back")
            b.close()

        # T30: the test link with no server plays and keeps results in the browser only (P1)
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1920, "height": 1080})
            pg.on("pageerror", lambda e: errors.append(str(e)))
            boot(pg, f"http://127.0.0.1:{port}/?mode=browser")
            assert pg.locator(".banner.test").count() >= 1, "TEST VERSION banner missing"
            pay(pg, "1")
            finish_try(pg, 4)
            overlay_title(pg, "RANK")
            pg.keyboard.press("Escape")
            overlay_title(pg, "HAND-OVER")
            pg.keyboard.press("Enter")
            saved = pg.evaluate("JSON.parse(localStorage.getItem('santatus:v1:live:events')).length")
            assert saved == 4, saved  # pay, try, nick, done
            print("ok - T30: test link plays, shows the banner and saves in the browser")
            b.close()
    finally:
        srv.terminate()
        shutil.rmtree(data, ignore_errors=True)
    if errors:
        raise AssertionError("page errors: " + "; ".join(errors))
    print("ALL FLOW CHECKS PASSED")


if __name__ == "__main__":
    run()
