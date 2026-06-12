# Changelog

## [1.0.0] - 2026-06-08

Initial public release (see `deployment/react-native-dev-guard/` for the sanitized publish package).

### Added
- Native C++ module for HMAC signing and response verification
- `DevGuardProvider` and `useDevGuard` React hooks
- GZip secure tunnel (`v1-gzip`) telemetry transport
- Glassmorphic lock screen, warning toast, and diagnostic overlay
- Heartbeat, lifecycle sync, and sync policy support
- Nonce-based remote wipe, emulator blocking, hardware fingerprinting
- Encrypted vault logger with per-device AES key derivation
- Customer-facing README with ACTIVE / WARNING / LOCKED screenshot gallery

### Security
- Vault AES keys derived per device (`SHA-256(deviceId + salt)`) — no static secret in source
