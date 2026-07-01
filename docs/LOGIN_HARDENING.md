# Login hardening and troubleshooting

This document describes the defensive measures implemented to make login robust and aid troubleshooting.

## What we changed

- `services/businessService.js`:
  - Accepts both legacy and current credential shapes (`usuario`/`clave` and `user`/`pass`).
  - If no users exist, seeds two default users (`admin/admin123`, `vendedor/venta123`) and persists them.
  - Tracks failed login attempts in `db.security.loginFailures` and records `LOGIN_FAILED` audit entries.
  - Resets failure counter on successful login and records `LOGIN` audit entries.

- `preload.js`:
  - Wrapped `contextBridge.exposeInMainWorld` with try/catch and logs readiness or exposure errors.
  - Provides a minimal fallback API if exposing fails.

- `app/renderer.js`:
  - `init()` is wrapped in try/catch to show user-visible error UI instead of a black screen.
  - Global `window.onerror` handler added to display errors and avoid a silent black screen.

- `scripts/test-login.js` and `scripts/smoke.js` added for quick local checks.

## Troubleshooting steps

1. Run the local smoke checks (no GUI required):

```bash
node scripts/test-login.js
node scripts/smoke.js
```

2. If GUI is black or unresponsive:
  - Open DevTools (Ctrl+Shift+I) and check console for preload or renderer errors.
  - Confirm `preload.js` logs `preload: ready` in console output.
  - Check `database/petropos-data.json` for `security` and `auditoria` entries.

3. If login keeps failing for a user:
  - Inspect `database/petropos-data.json` -> `security.loginFailures` to see counts.
  - Check `database/petropos.json` and `database/petropos-data.json` for user entries (both shapes).

4. To reset a user's failures:
  - Edit `database/petropos-data.json` and remove the key under `security.loginFailures`, or set it to 0, then restart the app.

## Next improvements (suggested)

- Implement per-user lockout after N failed attempts with timed unlock.
- Store login attempts with timestamps for forensic analysis.
- Add automated E2E tests (Spectron/Playwright) in CI to cover login flows.

***
If you want, I can implement lockout policies and add CI now.
