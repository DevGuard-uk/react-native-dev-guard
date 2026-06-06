# React Native DevGuard

A high-performance remote licensing and application protection plugin for React Native. Secured by a compiled **Native C++ Module** for HMAC signing and GZip telemetry, it allows you to remotely lock, warn, or sync apps via a secure REST backend.

## 🚀 Features

- **Glassmorphic Lock Screen**: Premium UI that blocks access instantly.
- **Native Security**: HMAC signing and the shared secret are handled in compiled C++ to prevent secret extraction.
- **GZip Tunneling**: Compact telemetry payloads for minimum data usage.
- **Remote Config**: Access server-defined JSON settings via the `response` object.
- **Heartbeat & Sync**: Automated background pings (with `lifecycleSync` / `syncPolicy` support) to keep license status fresh.
- **Hardware Fingerprinting**: Robust device identity that survives app re-installs.
- **Emulator Blocking**: When the project enables `blockEmulators`, the SDK locks on emulators/simulators automatically.
- **Hardened Remote Wipe**: Nonce-based remote wipe clears the response cache, usage logs, encrypted vault diagnostics, and stored device-user identity.
- **Privacy-Gated Telemetry**: Advanced metrics (RAM, storage, battery, network) are only collected after the server enables `advancedTelemetry`.

## 📦 Installation

```bash
npm install react-native-dev-guard react-native-device-info react-native-keychain @react-native-async-storage/async-storage
# or
yarn add react-native-dev-guard react-native-device-info react-native-keychain @react-native-async-storage/async-storage
```

`@react-native-async-storage/async-storage` is required by the bundled Vault Logger (encrypted local diagnostics). Use **v3.x** with React Native 0.85+; run `npx pod-install` after adding it on iOS.

### Native Setup

#### Requirements
- **React Native** `0.85.x` (tested on `0.85.3`)
- **React** `19.2.x`
- **iOS** 15.1+ · **Android** minSdk 24

#### iOS
1. Open `ios/Podfile` and ensure your target meets React Native’s minimum iOS version (`min_ios_version_supported`, currently 15.1).
2. Run `npx pod-install`.

#### Android
Ensure your app `minSdkVersion` is at least **24** (matches RN 0.85 template).

## 🛠️ Usage

Wrap your application root with `DevGuardProvider`.

```tsx
import React from 'react';
import { DevGuardProvider } from 'react-native-dev-guard';

const App = () => {
  return (
    <DevGuardProvider 
      projectId="your_project_id"
      secret="YOUR_UNIQUE_SECRET" // Found in Settings → Master Secret
      autoProtect={true}          // Automatically shows LockScreen if status is LOCKED
      failSafe="open"             // 'open' or 'closed' (behavior if offline with no cache)
    >
      <MainApp />
    </DevGuardProvider>
  );
};
```

### Accessing Status in Components

```tsx
import { useDevGuard } from 'react-native-dev-guard';

const MyComponent = () => {
  const { status, response, isLocked, verify } = useDevGuard();

  return (
    <View>
      <Text>Status: {status}</Text>
      {response?.extraData?.showBetaFeature && (
        <BetaComponent />
      )}
    </View>
  );
};
```

## 🐞 Diagnostic Overlay & Vault Logger

DevGuard includes an integrated diagnostic UI (the Bug Icon) and an encrypted local Vault Logger for advanced debugging without rebuilding your app.

### Vault Logger
The SDK bundles `react-native-vault-logger`. By default, it automatically intercepts and encrypts fatal JS errors and usage info, saving them securely to local storage using **per-device AES-256-CBC keys** derived from the hardware `deviceId` at init (no static secret in source). 
You can manually log data to the Info Vault:
```tsx
import { DevGuardLogger } from 'react-native-dev-guard/src/services/DevGuardLogger';

DevGuardLogger.info('User completed onboarding', { userId: 123 });
```

### The Bug Icon (Diagnostic Overlay)
To view telemetry and logs directly inside the running app without connecting a debugger:
1. Go to your DevGuard Admin Control Center.
2. Ensure you have configured a **6-digit Diagnostic Passcode**.
3. Under the project settings, toggle on **Enable Diagnostic Logs (Beta Feature)** for the desired devices.
4. A floating **🐛 Bug Icon** will appear in your app. 
5. Tap it and enter your Passcode to view device telemetry and access the encrypted error vaults.

## ⚙️ Configuration

### Fail-Safe Modes
- **`open` (Default)**: If the server is unreachable and no cache exists, the app remains accessible.
- **`closed`**: The app will lock until a successful status is fetched.

### Manual Verification
You can manually trigger a sync (e.g., after a login or payment) using the `verify()` function:
```tsx
const { verify } = useDevGuard();
// ...
await verify(true); // true forces a sync regardless of policy
```

## 🔐 Security Best Practices

1. **Obfuscation**: Always use `javascript-obfuscator` or similar tools for your JS bundle.
2. **Hermes**: Ensure Hermes is enabled in your `app/build.gradle` and `Podfile` to benefit from bytecode pre-compilation.
3. **ProGuard**: Use the included ProGuard rules to protect the native C++ library.

---
*Secure by Design. Managed by You.*
