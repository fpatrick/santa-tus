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
  Object.assign(CONFIG.crash, { fall: 0.1, zoom: 0.1, stand: 0.1, minRead: 0.1, read: { restart: 0.3, tries: 0.3, prizes: 0.3, over: 0.3 }, wordsPerSec: 999, typeChars: 9999, readExtra: 0 });
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


def pay(pg, key, alt=False):
    pg.wait_for_function("santa.scene === 'attract' && !santa.flowActive && !document.querySelector('#overlay.on')", timeout=15000)
    if alt:  # keyboards without F keys: hold F, press 2
        pg.keyboard.down("f"); pg.keyboard.press("2"); pg.keyboard.up("f")
    else:
        pg.keyboard.press("F2")
    pg.wait_for_selector(".dots")
    pg.keyboard.type("PAID")
    pg.keyboard.press("Enter")
    pg.wait_for_selector("text=NEW PAYMENT")
    pg.keyboard.press(key)


def finish_try(pg, pillars):
    pg.wait_for_function("santa.scene === 'flight' && santa.flight.state === 'ready' && santa.flightWaiting", timeout=15000)
    pg.evaluate(f"santa.endFlight({{ pillars: {pillars}, beat: false }})")


def force_wheel(pg, wid):
    """Test only: make the wheel always land on one result (the page's CONFIG, not the file)."""
    pg.evaluate(f"import('./src/config.js').then(({{ CONFIG }}) => {{ for (const o of CONFIG.wheel.outcomes) o.odds = o.id === {json.dumps(wid)} ? 100 : 0; }})")


def spin_to_end(pg, nick=None):
    pg.wait_for_selector(".tile", timeout=15000)
    pg.locator(".tile", has_text="SWEET").click()
    pg.wait_for_function("santa.scene === 'wheel' && santa.wheel.phase === 'ready'", timeout=15000)
    pg.evaluate("santa.wheel.click()")
    if nick:
        pg.wait_for_selector("input.nick", timeout=20000)
        pg.wait_for_function("document.activeElement && document.activeElement.classList.contains('nick')")
        pg.keyboard.type(nick)
        pg.keyboard.press("Enter")


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

            # S2-S10: €2.50, best 12, pick sweet, nickname, hand-over (T4)
            pay(pg, "1")
            finish_try(pg, 12)
            pg.wait_for_selector(".tile", timeout=10000)
            pg.locator(".tile", has_text="SWEET").click()
            pg.wait_for_selector("input.nick", timeout=10000)
            pg.wait_for_function("document.activeElement && document.activeElement.classList.contains('nick')")
            pg.keyboard.type("Sam")
            pg.keyboard.press("Enter")
            overlay_title(pg, "HAND-OVER")
            assert "SWEET" in pg.inner_text("#overlay"), "hand-over must list the sweet"
            pg.keyboard.press("Enter")
            pg.wait_for_function("document.querySelector('.board .nm') && document.querySelector('.board .nm').textContent === 'SAM'")
            kinds = [e["t"] for e in server_events(port)]
            assert kinds == ["pay", "try", "award", "nick", "done"], kinds
            print("ok - S2-S10 path: €2.50, best 12, sweet, nickname, hand-over (T4)")

            # T12: Chrome closed after try 1 of €6.50: reopens with 2 tries left and the best kept (D3)
            pay(pg, "2", alt=True)  # also checks "hold F + 2"
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
            finish_try(pg, 6)
            pg.wait_for_selector(".banner.down", timeout=10000)
            finish_try(pg, 8)
            srv = start_server(port, data)
            wait_health(port)
            pg.wait_for_function("!document.querySelector('.banner.down')", timeout=15000)
            tries = [e for e in server_events(port) if e["t"] == "try"]
            assert len(tries) == 4, f"expected 4 saved tries, got {len(tries)}"
            print("ok - T13: server down shows a warning, results are saved when it is back")
            # finish the €6.50 payment of T12/T13 (3 tries played): nickname, then hand-over
            pg.wait_for_function("document.querySelector('#overlay h1') && /RANK|HAND-OVER/.test(document.querySelector('#overlay h1').textContent)", timeout=15000)
            if "RANK" in pg.inner_text("#overlay h1"):
                pg.keyboard.press("Escape")
                overlay_title(pg, "HAND-OVER")
            pg.keyboard.press("Enter")
            pg.wait_for_function("santa.scene === 'attract' && !santa.flowActive", timeout=10000)

            # T36 (F): price key 3 = 5 tries; wheel -> GOLD: nickname, "GOLD: GIVE LIDL €20 VOUCHER" (R1, R22, R16)
            force_wheel(pg, "gold")
            pay(pg, "3")
            pg.wait_for_function("santa.scene === 'flight' && santa.hud && santa.hud.triesLeft === 5", timeout=10000)
            for pillars in (22, 6, 6, 6, 6):
                finish_try(pg, pillars)
            spin_to_end(pg, "Ann")
            overlay_title(pg, "HAND-OVER", timeout=20000)
            txt = pg.inner_text("#overlay")
            assert "GOLD: GIVE LIDL" in txt and "SPONSOR: LIDL" in txt, txt
            pg.keyboard.press("Enter")
            print("ok - T36: €10 = 5 tries, GOLD prize with the sponsor name on the hand-over")

            # T37 (F): SILVER: the player picks, staff press the number (R22)
            force_wheel(pg, "silver")
            pay(pg, "1")
            finish_try(pg, 21)
            spin_to_end(pg, "Bo")
            pg.wait_for_selector(".picks", timeout=20000)
            pg.keyboard.press("2")
            overlay_title(pg, "HAND-OVER")
            assert "FUNWORLD" in pg.inner_text("#overlay")
            pg.keyboard.press("Enter")
            print("ok - T37: SILVER pick screen, the picked item on the hand-over")

            # T38 (F): the same nickname wins again: "ALREADY WON A PRIZE TODAY?" Y = +2 tickets (R23)
            force_wheel(pg, "bronze")
            pay(pg, "1")
            finish_try(pg, 21)
            spin_to_end(pg, "ann")
            overlay_title(pg, "ALREADY WON", timeout=20000)
            pg.keyboard.press("y")
            overlay_title(pg, "HAND-OVER")
            txt = pg.inner_text("#overlay")
            assert "BRONZE" not in txt and "GIVE 2 TICKETS" in txt, txt
            pg.keyboard.press("Enter")
            print("ok - T38: one sponsor prize per person: Y gives 2 tickets instead")

            # T49 (F): wheel JACKPOT: "PAY JACKPOT" confirmed twice (R16)
            force_wheel(pg, "jackpot")
            pay(pg, "1")
            finish_try(pg, 21)
            spin_to_end(pg)
            pg.wait_for_function("document.querySelector('#overlay h1') && /PAY JACKPOT|RANK/.test(document.querySelector('#overlay h1').textContent)", timeout=20000)
            if "RANK" in pg.inner_text("#overlay h1"):
                pg.keyboard.press("Escape")
                overlay_title(pg, "PAY JACKPOT")
            pg.keyboard.press("Enter")
            pg.wait_for_selector("text=CONFIRM AGAIN")
            pg.keyboard.press("Enter")
            overlay_title(pg, "HAND-OVER")
            assert "PAY JACKPOT" in pg.inner_text("#overlay")
            pg.keyboard.press("Enter")
            print("ok - T49: jackpot win, paid after two confirms")

            # two more tickets, so the draw has 4 (one is always kept for the jackpot)
            force_wheel(pg, "t2")
            pay(pg, "1")
            finish_try(pg, 21)
            spin_to_end(pg)
            pg.wait_for_function("document.querySelector('#overlay h1') && /HAND-OVER|RANK/.test(document.querySelector('#overlay h1').textContent)", timeout=20000)
            if "RANK" in pg.inner_text("#overlay h1"):
                pg.keyboard.press("Escape")
                overlay_title(pg, "HAND-OVER")
            assert "GIVE 2 TICKETS" in pg.inner_text("#overlay")
            pg.keyboard.press("Enter")

            # T46 (F): the draw from F9: the first prize, NOT HERE with a reason, the same prize again (R14)
            pg.wait_for_function("santa.scene === 'attract' && !document.querySelector('#overlay.on')", timeout=10000)
            pg.keyboard.press("F9")
            pg.wait_for_selector(".dots")
            pg.keyboard.type("PAID")
            pg.keyboard.press("Enter")
            pg.wait_for_selector("text=STAFF PANEL")
            assert "Total taken" in pg.inner_text("#overlay") and "Live odds" in pg.inner_text("#overlay")
            pg.keyboard.press("8")
            pg.wait_for_function("document.querySelector('#overlay h1') && /DRAW|NOT DRAW TIME/.test(document.querySelector('#overlay h1').textContent)", timeout=10000)
            if "NOT DRAW TIME" in pg.inner_text("#overlay h1"):
                pg.keyboard.press("Enter")
            pg.wait_for_selector(".nextprize")
            first_prize = pg.inner_text(".nextprize")
            pg.keyboard.press("Enter")
            pg.wait_for_function("document.querySelector('.who') && document.querySelector('.who').textContent.includes('WINS')", timeout=15000)
            pg.keyboard.press("n")
            pg.wait_for_selector("input.staff-in")
            pg.wait_for_function("document.activeElement && document.activeElement.classList.contains('staff-in')")
            pg.keyboard.type("not at the stall")
            pg.keyboard.press("Enter")
            pg.wait_for_selector(".nextprize")
            assert pg.inner_text(".nextprize") == first_prize, "NOT HERE draws the same prize again"
            pg.keyboard.press("Escape")
            evs = server_events(port)
            assert [e["t"] for e in evs].count("draw") == 1 and [e["t"] for e in evs].count("nothere") == 1
            print("ok - T46: draw step saved, NOT HERE logged, the same prize comes again")
            b.close()

        # T30: the test link with no server plays and keeps results in the browser only (P1)
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1920, "height": 1080})
            pg.on("pageerror", lambda e: errors.append(str(e)))
            boot(pg, f"http://127.0.0.1:{port}/?mode=browser")
            assert pg.locator(".banner.test").count() >= 1, "TEST VERSION banner missing"
            pay(pg, "1")
            finish_try(pg, 6)
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
