# Changelog

## [Unreleased]

## [1.0.1] - 2026-06-22

### Added
- **White-label lock screen branding** (Enterprise): custom logo, colors, powered-by footer, and `hidePoweredBy` from the verify response.
- **`resolveBrandingFooter`** helper and **`contactUrls`** utilities for consistent support links.
- **Native security hardening** for API communication and lock-screen integrity.
- **Emulator and compromised-device blocking** via unified native policy checks.

### Changed
- Lock screen **progressive disclosure**: contact buttons hide while the unlock key field is open.
- **`allowUnlock` default is `false`** when the API omits the field (`DevGuardProvider` passes `allowUnlock === true` only).
- Unlock UX: amber toggle, **Unlock** button label, autofocus, submit on keyboard done, cancel disabled while loading.
- **`ScrollView`** + rotation-safe blob layout via `useWindowDimensions`.
- Default lock-screen palette when no branding colors are sent: `#d32f2f` / `#b71c1c`.
- `GuardEnforcement.apply()` is async and routes through native when available.
- Jailbreak detection delegates to the policy gate.

## [1.0.0] - 2026-06-08

Initial public release.

### Added
- Native C++ module for signing and response verification
- `DevGuardProvider` and `useDevGuard` React hooks
- GZip secure telemetry transport
- Glassmorphic lock screen, warning toast, and diagnostic overlay
- Heartbeat, lifecycle sync, and sync policy support
- Nonce-based remote wipe, emulator blocking, hardware fingerprinting
- Local diagnostic vault logger with per-device key protection
- Customer-facing README with ACTIVE / WARNING / LOCKED screenshot gallery

### Security
- Diagnostic keys derived per device — no static secret in source
