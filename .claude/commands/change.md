Make this change to Santa TUS: $ARGUMENTS

Follow CLAUDE.md exactly:
1. Use the "Where to change what" table to pick the files. Read only those (Grep SPEC.md for any rule ID named).
2. Make small, exact edits. Words and numbers go in src/config.js.
3. If a rule changes: SPEC.md first, then src/rules.js, then its test.
4. Run `npm test` (plus `npm run test:server` for server changes, `npm run test:flow` for screen or flow changes).
5. Bump the version in src/version.js (last number), add one line to the top of CHANGELOG.md.
6. Commit "<version>: <what changed>" and push.
7. Reply in 2-3 lines of simple English: what changed, the new version, and that the test link updates in 1-2 minutes.
