# iOS + WebAuthn Demo Setup

This runbook explains how to test passkeys on iOS with the demo backend and UI.

## 1. Prepare iPhone/iPad

1. Enable device passcode.
2. Configure Face ID or Touch ID.
3. Ensure iCloud Keychain is enabled for the Apple ID used on the device.
4. Use Safari (recommended) or a modern iOS browser.

## 2. Start backend on development machine

Choose one backend mode:

### Option A: Mock backend (quick checks)

```bash
npm run server:mock
```

Default URL: `http://localhost:4000`

### Option B: Dedicated WebAuthn backend (real passkey behavior)

```bash
npm run server:device
```

Default URL: `http://localhost:4100`

## 3. Start demo UI

```bash
npm run dev
```

Default local URL: `http://localhost:5173`

Useful pages:

- Login/password onboarding: `http://localhost:5173/login.html`
- Sensitive vault: `http://localhost:5173/sensitive.html`
- Card service flow: `http://localhost:5173/card-service/index.html`

## 4. Expose demo to iOS device

For physical iPhone/iPad tests, do not assume desktop `localhost` is reachable.

Use one of these options:

1. HTTPS tunnel URL (recommended for real device validation).
2. Same-device localhost when app/browser run on the same iOS device.

Set demo `API Base URL` to the backend URL reachable from iOS.

## 5. Switch demo to real WebAuthn mode

1. Disable `Use mock WebAuthn transport`.
2. Set reachable API URL (`server:device` recommended for real passkey flow).
3. Tap `Register Passkey`.
4. Approve iOS passkey prompt with Face ID/Touch ID/passcode.
5. Run login/sensitive/payment scenarios.

## 6. iOS authenticator specifics

- iOS platform authenticator is based on Face ID/Touch ID with device passcode fallback.
- iCloud Keychain availability affects passkey sync and user experience.
- Prompt wording can differ between iOS versions.

## 7. Troubleshooting

- If no passkey sheet appears: verify mock transport is disabled and browser context is secure.
- If operation fails after prompt: verify backend URL is reachable from device.
- If user cancels Face ID/Touch ID: retry and confirm again.
- If RP/origin mismatch error appears: align backend RP policy to tested host.
- If cross-device flow is used: ensure Bluetooth/network permissions are not blocked.

## 8. Verification method behavior

WebAuthn cannot force Face ID only.

iOS chooses available authenticator verification path (Face ID, Touch ID, or passcode).