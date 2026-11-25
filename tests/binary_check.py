"""Quick check of the one-file program (M1-M9). Run:  python3 tests/binary_check.py dist/santa-tus-linux-x64

It copies the program into a new empty folder (like a USB copy), then:
  1. starts it (no browser): the data folder appears NEXT TO the program, health ok
  2. starts it a 2nd time: it does not start a 2nd server (same port, it ends by itself)
  3. one payment; during the wheel spin the program is KILLED (kill -9)
  4. starts it again: the same wheel result comes back, no 2nd spin
  5. a half-written last log line (power cut) is moved aside at the next start, nothing lost
"""

import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flow_check import boot, pay, finish_try, force_wheel, overlay_title, to_handover  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402


def health(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=2) as r:
        return json.loads(r.read())


def events(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/events?ledger=live", timeout=2) as r:
        return json.loads(r.read())["events"]


def start(exe, wait=True):
    p = subprocess.Popen([exe, "--no-browser"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not wait:
        return p, None
    data = os.path.join(os.path.dirname(exe), "SantaTUS-data")
    end = time.time() + 20
    while time.time() < end:
        try:
            port = json.load(open(os.path.join(data, "server.json")))["port"]
            if health(port)["ok"]:
                return p, port
        except Exception:  # noqa: BLE001
            pass
        time.sleep(0.3)
    raise AssertionError("program did not start")


def kill_all(p, data, sig=signal.SIGKILL):
    """A one-file program is 2 processes (the starter and the server): a crash kills both."""
    pid = json.load(open(os.path.join(data, "server.json")))["pid"]
    for x in {pid, p.pid}:
        try:
            os.kill(x, sig)
        except ProcessLookupError:
            pass
    p.wait(timeout=15)
    end = time.time() + 10
    while time.time() < end:
        try:
            os.kill(pid, 0)
            time.sleep(0.2)
        except ProcessLookupError:
            return
    raise AssertionError("server process still alive")


def main(src):
    folder = tempfile.mkdtemp(prefix="santa-usbcopy-")
    exe = os.path.join(folder, os.path.basename(src))
    shutil.copy(src, exe)
    os.chmod(exe, 0o755)
    data = os.path.join(folder, "SantaTUS-data")
    p, port = start(exe)
    h = health(port)
    assert h["dataDir"] == data and not h.get("dataNote"), h
    print(f"ok - 1: started on port {port}, data next to the program: {data}, version {h['version']}")

    p2, _ = start(exe, wait=False)
    code = p2.wait(timeout=30)
    assert code == 0 and p.poll() is None and json.load(open(os.path.join(data, "server.json")))["port"] == port
    print("ok - 2: a 2nd start does not start a 2nd server (it ended by itself, the 1st one still runs)")

    url = f"http://127.0.0.1:{port}/"
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        boot(pg, url)
        force_wheel(pg, "bronze")
        pay(pg, "1")
        finish_try(pg, 21)
        pg.wait_for_selector(".tile", timeout=15000)
        pg.locator(".tile", has_text="SWEET").click()
        pg.wait_for_function("santa.scene === 'wheel' && santa.wheel.phase === 'ready'", timeout=15000)
        pg.evaluate("santa.wheel.click()")
        pg.wait_for_function("santa.wheel.phase === 'spin'", timeout=10000)
        before = [e for e in events(port) if e["t"] == "award" and e["kind"] == "wheel"]
        kill_all(p, data)  # the program dies during the spin
        print(f"ok - 3: killed during the wheel spin (saved result: {before[0]['result']})")
        pg.goto("about:blank")

        p, port2 = start(exe)
        url = f"http://127.0.0.1:{port2}/"
        boot(pg, url)
        overlay_title(pg, "YOUR WHEEL RESULT", timeout=20000)
        wheels = [e for e in events(port2) if e["t"] == "award" and e["kind"] == "wheel"]
        assert len(wheels) == 1 and wheels[0]["id"] == before[0]["id"], wheels
        pg.wait_for_selector("input.nick", timeout=20000)  # a sponsor winner gives a nickname first
        pg.wait_for_function("document.activeElement && document.activeElement.classList.contains('nick')")
        pg.keyboard.type("ANN")
        pg.keyboard.press("Enter")
        pg.wait_for_selector(".picks", timeout=20000)  # bronze: staff pick the item (keyboard)
        pg.keyboard.press("1")
        to_handover(pg)
        txt = pg.inner_text("#overlay")
        pg.keyboard.press("Enter")
        b.close()
    print(f"ok - 4: started again: the same result ({wheels[0]['result']}), one spin only; hand-over shows: "
          f"{' / '.join(l for l in txt.splitlines() if l.strip())[:160]}")

    n = len(events(port2))
    kill_all(p, data)
    log = os.path.join(data, "santa-live.log.jsonl")
    with open(log, "ab") as f:
        f.write(b'{"id": "half-written", "t": "pa')  # a power cut in the middle of a write
    p, port3 = start(exe)
    assert len(events(port3)) == n, (len(events(port3)), n)
    assert any(x.startswith("santa-live.log.jsonl.partial-") for x in os.listdir(data))
    with open(log, "rb") as f:
        assert f.read().endswith(b"\n")
    autos = [d for d in os.listdir(os.path.join(data, "backups")) if d.startswith("auto-")]
    print(f"ok - 5: half-written log line moved aside, {n} events kept, auto backups: {len(autos)}")
    kill_all(p, data, signal.SIGTERM)
    print("BINARY CHECK PASSED")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]))
