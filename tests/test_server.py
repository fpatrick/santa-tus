"""Server tests: T14 (nothing lost after a restart), T29 (data apart from the game folder),
D2 (USB copy), D5 (new day archives, never deletes), the CSV export and the file whitelist.
Run: python3 -m unittest discover -s tests -p 'test_*.py'
"""

import importlib.util
import json
import os
import shutil
import tempfile
import threading
import unittest
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("server", os.path.join(ROOT, "server", "server.py"))
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


def ev(n, t="pay", pid=1, **kw):
    return {"id": f"e{n}", "n": n, "ts": 1000 + n, "t": t, "pid": pid, **kw}


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="santa-test-")

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def test_t14_events_survive_a_restart(self):
        led = server.Ledger(self.dir, "live")
        led.add([ev(1), ev(2, "try", pillars=12), ev(3, "done")])
        led.db.close()  # like a power cut after the write
        again = server.Ledger(self.dir, "live")
        self.assertEqual([e["t"] for e in again.all()], ["pay", "try", "done"])
        with open(again.log_path, encoding="utf-8") as f:
            self.assertEqual(len(f.readlines()), 3)

    def test_sending_twice_saves_once(self):
        led = server.Ledger(self.dir, "live")
        self.assertEqual(len(led.add([ev(1), ev(2)])), 2)
        self.assertEqual(len(led.add([ev(1), ev(2), ev(3)])), 1)
        self.assertEqual(len(led.all()), 3)
        self.assertEqual([e["n"] for e in led.all(after=1)], [2, 3])

    def test_wal_and_full_sync(self):
        led = server.Ledger(self.dir, "live")
        self.assertEqual(led.db.execute("PRAGMA journal_mode").fetchone()[0], "wal")
        self.assertEqual(led.db.execute("PRAGMA synchronous").fetchone()[0], 2)

    def test_d5_new_day_archives_and_starts_empty(self):
        led = server.Ledger(self.dir, "live")
        led.add([ev(1), ev(2)])
        path = led.archive()
        self.assertTrue(os.path.exists(path))
        self.assertEqual(led.all(), [])
        import sqlite3
        old = sqlite3.connect(path)
        self.assertEqual(old.execute("SELECT COUNT(*) FROM events").fetchone()[0], 2)
        old.close()

    def test_d2_backup_copies_to_the_usb_folder(self):
        usb = tempfile.mkdtemp(prefix="santa-usb-")
        os.environ["SANTA_USB_DIR"] = usb
        try:
            srv = server.Server(self.dir)
            srv.ledgers["live"].add([ev(1)])
            r = srv.backup()
            self.assertTrue(r["usb"])
            self.assertTrue(os.path.exists(os.path.join(usb, server.BACKUP_FOLDER, "santa-live.db")))
            self.assertTrue(os.path.exists(os.path.join(usb, server.BACKUP_FOLDER, "santa-live.log.jsonl")))
        finally:
            del os.environ["SANTA_USB_DIR"]
            shutil.rmtree(usb, ignore_errors=True)

    def test_t29_data_lives_outside_the_game_folder(self):
        os.environ.pop("SANTA_DATA_DIR", None)
        d = server.default_data_dir()
        self.assertTrue(d.endswith("SantaTUS-data"))
        self.assertFalse(os.path.abspath(d).startswith(ROOT + os.sep))


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp(prefix="santa-http-")
        cls.srv = server.Server(cls.dir)
        cls.httpd, cls.port = server.bind(server.make_handler(cls.srv), 18765)
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        shutil.rmtree(cls.dir, ignore_errors=True)

    def call(self, path, body=None, ctype="application/json"):
        data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method="POST" if data is not None else "GET")
        if data is not None:
            req.add_header("Content-Type", ctype)
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, r.read()

    def test_health_and_events_round_trip(self):
        _, raw = self.call("/api/health")
        self.assertTrue(json.loads(raw)["ok"])
        _, raw = self.call("/api/events?ledger=test", {"events": [ev(1), ev(2, "done")]})
        self.assertEqual(json.loads(raw)["added"], 2)
        _, raw = self.call("/api/events?ledger=test")
        self.assertEqual(len(json.loads(raw)["events"]), 2)

    def test_export_writes_a_csv_file(self):
        _, raw = self.call("/api/export?ledger=live", b"payment,amount\r\n1,2\r\n", "text/csv")
        path = json.loads(raw)["path"]
        self.assertTrue(os.path.exists(path))

    def test_only_game_files_are_served(self):
        status, _ = self.call("/index.html")
        self.assertEqual(status, 200)
        with self.assertRaises(urllib.error.HTTPError):
            self.call("/server/server.py")


if __name__ == "__main__":
    unittest.main()
