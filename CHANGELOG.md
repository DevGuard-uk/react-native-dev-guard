# Changelog

## [0.0.2] - Unreleased

### Security
- Replace hardcoded vault AES key with per-device derivation (`SHA-256(deviceId + salt)`) for encrypted diagnostic logs.
- Resolve `deviceId` before vault init on both platforms.

### Changed
- `DevGuardLogger.init(deviceId)` now requires the device identifier (called automatically by `DevGuardProvider`).

## [0.0.1] - 2026-06-06

### Added
- Native C++ module for HMAC signing and response verification
- `DevGuardProvider` and `useDevGuard` React hooks
- GZip secure tunnel (`v1-gzip`) telemetry transport
- Lock screen, security toast, and diagnostic overlay
- Heartbeat, lifecycle sync, and sync policy support
- Nonce-based remote wipe
- Emulator blocking and jailbreak detection
- Encrypted vault logger integration
