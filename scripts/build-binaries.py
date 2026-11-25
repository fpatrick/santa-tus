"""Builds the one-file market-day program for THIS system (M1): PyInstaller --onefile, the game files inside.

  Linux   -> dist/santa-tus-linux-x64          (build on an old Linux, e.g. Ubuntu 22.04, so it runs on any newer Fedora)
  Windows -> dist/santa-tus-windows-x64.exe    (no black console window)
Also copies dist/README-STAFF.txt. Needs: pip install pyinstaller
Run:  python3 scripts/build-binaries.py
GitHub builds both with .github/workflows/market-builds.yml.
"""

import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIN = sys.platform == "win32"
NAME = "santa-tus-windows-x64" if WIN else "santa-tus-linux-x64"
GAME = ["index.html", "style.css", "src", "assets", "print"]


def main():
    os.chdir(ROOT)
    args = [sys.executable, "-m", "PyInstaller", "--onefile", "--clean", "--noconfirm", "--name", NAME,
            "--distpath", "dist", "--workpath", os.path.join("build", NAME), "--specpath", os.path.join("build", NAME),
            "--paths", "server", "--exclude-module", "tkinter", "--exclude-module", "unittest", "--exclude-module", "pydoc"]
    if WIN:
        args += ["--noconsole"]
    for item in GAME:  # the game files, at the same place inside the program
        dest = item if os.path.isdir(os.path.join(ROOT, item)) else "."  # a single file goes to the top folder
        args += ["--add-data", f"{os.path.join(ROOT, item)}{os.pathsep}{dest}"]
    args.append(os.path.join("server", "launcher.py"))
    subprocess.run(args, check=True)
    shutil.copyfile(os.path.join("docs", "README-STAFF.txt"), os.path.join("dist", "README-STAFF.txt"))
    out = os.path.join("dist", NAME + (".exe" if WIN else ""))
    if not WIN:
        os.chmod(out, 0o755)
    print(f"Built {out} ({os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
