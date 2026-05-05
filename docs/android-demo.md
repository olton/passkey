# Android + WebAuthn Demo Setup

This runbook explains how to test passkeys on Android with the demo backend and UI.

## 1. Prepare Android device

1. Set a secure screen lock (PIN/pattern/password).
2. Configure biometric unlock (fingerprint/face) if available.
3. Use a modern browser with WebAuthn support (Chrome recommended).
4. Ensure Google Play Services are updated.

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
- Card payment step-up: `http://localhost:5173/card-pay.html`

## 4. Expose demo to Android device

For a real phone, avoid relying on desktop `localhost` directly.

Use one of these options:

1. HTTPS tunnel URL (recommended for physical device tests).
2. Same-device localhost when browser and app are running on the same Android device.

Set demo `API Base URL` to the backend URL reachable from the phone.

## 5. Switch demo to real WebAuthn mode

1. Disable `Use mock WebAuthn transport`.
2. Set reachable API URL (`server:device` recommended for real passkey flow).
3. Click `Register Passkey`.
4. Approve Android system prompt with biometric or device credential.
5. Run login/sensitive/payment scenarios.

## 6. Android authenticator specifics

- Android typically uses built-in biometric/device credential as platform authenticator.
- If local platform path is unavailable, use external security key or cross-device passkey flow.
- Browser and OEM customizations can change prompt visuals and wording.

## 7. Troubleshooting

- If no prompt appears: verify mock transport is disabled.
- If passkey UI fails immediately: confirm secure context and reachable backend URL.
- If ceremony is cancelled: retry and approve biometric/device credential.
- If RP mismatch appears: verify backend RP/origin configuration for tested host.
- If physical device cannot reach API: check tunnel/LAN accessibility and firewall rules.

## 8. Verification method behavior

WebAuthn cannot force one biometric type only.

Android chooses the available authenticator method (fingerprint, face, or device credential).