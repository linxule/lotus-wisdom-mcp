# Lotus Wisdom 0.9.0 — release verification

Reviewed on October 26, 2026, on `claude/cyber-halo-ui`, based on Claude's
`4d6404c` handoff. The user selected 0.9.0 and approved keeping the completed
panel's height fixed while longer earlier text scrolls inside it.

Claude's 20 UI commits are preserved. The user authorized committing, pushing,
and releasing 0.9.0 after the final review. The additions are grouped below.

## Logical commits

### fix(app): keep completed halo exploration visible and steady

- `app/src/mcp-app.ts`: restore content opacity if a hover preview is canceled
  before its text swaps in; lock the completed words area to its resting height
  (at least the halo's height), reset scrolling on step changes, and clear the
  height/focus state when a new inquiry begins.
- `app/mcp-app.html`: allow internal scrolling in the completed panel and label
  its keyboard-focusable contemplation region.
- `app/tests/journey.test.mjs`: regressions for the rapid-hover race, arrow/Home/
  End navigation and pinning, unknown single-step completion, and height reset.
- `dist/journey.html`: rebuilt, identical to `app/dist/mcp-app.html`.

### chore(release): prepare 0.9.0

- `src/shared/version.ts`, `package.json`, `server.json`, `kimi.plugin.json`:
  synchronized to 0.9.0.
- `README.md`: verified halo release notes; identifies the previously prepared
  0.8.6 reliability/security work as included in 0.9.0, not a separate publication.
- `dist/bundle.js`: rebuilt with version 0.9.0; no server behavior changes here.

This `CHANGES.md` is a handoff record, not a runtime or npm package file.

## Verification

- 41 root tests, 14 app tests, and 1 worker HTTP regression passed.
- Root, app, and worker typechecks passed.
- Package build, installed-package CLI smoke, and worker dry-run build passed.
- Root, app, and worker dependency audits found no vulnerabilities.
- Built journey files compare byte-for-byte; Git whitespace checks pass.
- Chromium: dark/light at device scales 1 and 2; fixed 120 px halo; reduced-motion
  styles; no external HTTP requests; internal scrolling accessible by keyboard;
  rapid-hover opacity recovery. The long-earlier-text case previously resized
  152 → 674 → 152 px; now it remains 152 → 152 → 152 px.

## Host integration coverage

The final smoke used the actual MCP Apps SDK AppBridge and results from the
built stdio server: six sandboxed, CSP-restricted frames, opening continuity,
meditation, completion, host theme updates, embedded glyphs, and dormant preview
hooks all passed. This exercises the real SDK handshake and message transport;
it is not a certification of Claude Desktop, claude.ai, or other commercial hosts.

## Release route

Commit the scoped changes, push the UI branch, and merge after PR CI passes.
Tag v0.9.0 for npm/MCP Registry publication, deploy the worker, and verify the
published npm package and live HTTP endpoint. Version 0.8.6 was never published
separately; its reliability and security changes are included in 0.9.0.
