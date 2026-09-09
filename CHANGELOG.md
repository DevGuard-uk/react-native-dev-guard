# Changelog

## [Unreleased]

### Added
- **User Journey** (`setUserLog` via `useDevGuard`): optional compact UI-step trail for Developer Portal and Console. Uploaded on heartbeat only when the project plan includes User Journey.

### Changed
- Lifecycle debounce expands from 5 to 10 minutes when the device is in power-saver mode or battery is below 20% while discharging.

## [1.0.3] - 2026-06-26

### Security
- **`statusUrl` domain lock**: API traffic is limited to HTTPS endpoints on `devguard.uk`. Invalid overrides throw before init completes.
- **No secret leak**: `buildDevGuardAuthHeaders` only attaches Master Secret and HMAC headers after domain validation.
- **Protected default endpoint**: production API URL is resolved from native-protected runtime literals.

### Added
- `statusUrlResolver.ts`, `secureDevGuardRequest.ts`, and unit tests.

## [1.0.2] - 2026-06-25

### Added
- **Plugin runtime identity** on heartbeats (`sdkRuntime`, `sdkVersion`, `hostPlatform`, `hostPlatformVersion`) via `sdkIdentity.ts` and `HardwareService`.
- **`PluginCrashReporter`** — built into the SDK; fire-and-forget POST to `/api/v1/telemetry/plugin-crash` on diagnostic vault errors.

### Changed
- Example app documents Node.js 22+ as the minimum for local development.

## [1.0.1] - 2026-06-22

### Added
- **White-label lock screen branding** (Enterprise): custom logo, colors, powered-by footer, and `hidePoweredBy` from the verify response.
- **`resolveBrandingFooter`** helper and **`contactUrls`** utilities for consistent support links.
- **Runtime-protected literals** for API URLs, headers, JSON keys, and lock-screen copy.
- **Native security module** — HMAC signing, response verification, and policy gate for emulator / compromised-device locks.
- **`evaluatePolicy` native bridge** — unified emulator and compromised-device lock decisions.
- Unit tests for branding resolution, contact URL builders, decode helpers, and `GuardEnforcement` policy fallback (`npm test`).

### Changed
- Lock screen **progressive disclosure**: contact buttons hide while the unlock key field is open.
- **`allowUnlock` default is `false`** when the API omits the field (`DevGuardProvider` passes `allowUnlock === true` only).
- Unlock UX: amber toggle, **Unlock** button label, autofocus, submit on keyboard done, cancel disabled while loading.
- **`ScrollView`** + rotation-safe blob layout via `useWindowDimensions`.
- Default lock-screen palette when no branding colors are sent: `#d32f2f` / `#b71c1c`.
- `GuardEnforcement.apply()` is async and routes through native `dg_e1` when available.
- Jailbreak detection delegates to the policy gate.

## [1.0.0] - 2026-06-08

Initial public release (see `deployment/react-native-dev-guard/` for the sanitized publish package).

### Added
- Native C++ module for HMAC signing and response verification
- `DevGuardProvider` and `useDevGuard` React hooks
- GZip secure tunnel (`v1-gzip`) telemetry transport
- Glassmorphic lock screen, warning toast, and diagnostic overlay
- Heartbeat, lifecycle sync, and sync policy support
- Nonce-based remote wipe, emulator blocking, hardware fingerprinting
- Local diagnostic vault logger with per-device key protection
- Customer-facing README with ACTIVE / WARNING / LOCKED screenshot gallery

### Security
- Vault keys derived per device at init — no static secret in source
