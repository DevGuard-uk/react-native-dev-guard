# React Native DevGuard

Remote licensing and application protection for React Native. HMAC signing and GZip telemetry run in a compiled native C++ module.

## Features

- Glassmorphic lock screen
- Native HMAC signing (C++ black box)
- GZip tunnel (`v1-gzip`) for compact telemetry
- Heartbeat and lifecycle sync policies
- Hardware fingerprinting and emulator blocking
- Nonce-based remote wipe
- Privacy-gated advanced telemetry (RAM, storage, battery)

## Requirements

- React Native 0.85.x (tested on 0.85.3)
- React 19.2.x
- iOS 15.1+ · Android minSdk 24

## Installation

```bash
npm install react-native-dev-guard react-native-device-info react-native-keychain @react-native-async-storage/async-storage
npx pod-install
```

## Quick start

```tsx
import React from 'react';
import { DevGuardProvider } from 'react-native-dev-guard';

const App = () => (
  <DevGuardProvider
    projectId="your_project_id"
    secret="YOUR_MASTER_SECRET"
    autoProtect={true}
    failSafe="open"
  >
    <MainApp />
  </DevGuardProvider>
);
```

### Access status in components

```tsx
import { useDevGuard } from 'react-native-dev-guard';

const MyComponent = () => {
  const { status, response, isLocked, verify } = useDevGuard();
  return <Text>Status: {status}</Text>;
};
```

## Configuration

| Prop | Description |
|------|-------------|
| `projectId` | Your DevGuard project ID |
| `secret` | Master Secret from portal settings |
| `autoProtect` | Show lock screen when status is LOCKED (default `true`) |
| `failSafe` | `'open'` (default) or `'closed'` when offline with no cache |

### Manual verification

```tsx
const { verify } = useDevGuard();
await verify(true); // force sync
```

### Diagnostic overlay

Enable **Diagnostic Logs** in your DevGuard project settings and set a 6-digit passcode. A bug icon appears in-app for authorized debugging.

## Security

- Obfuscate your JS bundle in production
- Enable Hermes and ProGuard (see `example/android/app/proguard-rules.pro`)
- Never commit your Master Secret to source control

## License

MIT — see [LICENSE](LICENSE).
