Make a Windows release of Santa TUS. $ARGUMENTS

1. Run `npm test`, `npm run test:server` and `npm run test:flow`. Stop and report if any fails.
2. Read src/version.js. If the person asked for the market-day version: set VERSION to 1.0.0 and STAGE to 'FINAL'
   (this removes the beta badge). Otherwise keep the version as it is.
3. Add a CHANGELOG.md line if the version changed, commit and push.
4. Run `gh workflow run windows-zip.yml --ref main -f release=true` (pushing tags is blocked from Claude's workspace).
5. Wait for the run (`gh run list --limit 1`). It builds and tests SantaTUS-Windows.zip on Windows and makes the release v<VERSION>.
   Tell the person in simple English where to download it (the Releases page) and to read docs/INSTALL.md.
