# Linux (Ubuntu 24.04) + WebAuthn Demo Setup

This runbook explains how to test passkeys on Ubuntu 24.04 with the demo backend and UI.

## 1. Prepare Ubuntu 24.04 machine

1. Update system packages and reboot if required.
2. Configure a secure login method for your user account.
3. (Optional) If your laptop supports it, configure fingerprint login in system settings.
4. Install and use a modern browser with WebAuthn support (Chrome or Chromium recommended).
5. For best reliability on Linux, keep a hardware security key (USB/NFC) available.

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

## 4. Use reachable URLs

If browser and backend run on the same Ubuntu machine, `localhost` usually works directly.

If you test from another device, set demo `API Base URL` to a backend URL reachable from that device (LAN or HTTPS tunnel URL).

## 5. Switch demo to real WebAuthn mode

1. Disable `Use mock WebAuthn transport`.
2. Set reachable API URL (`server:device` recommended for real passkey flow).
3. Click `Register Passkey`.
4. Approve browser/system passkey prompt.
5. Run login/sensitive/payment scenarios.

## 6. Ubuntu 24.04 authenticator specifics

- Local platform authenticator behavior can vary by browser and hardware stack.
- On Ubuntu, the most predictable path is often a roaming authenticator (security key).
- Phone passkey flows are a practical secondary option when local platform path is limited.
- Do not assume one fixed Linux authenticator UX across all machines.

## 7. Troubleshooting

- If no prompt appears: verify mock transport is disabled.
- If browser reports unsupported WebAuthn flow: update browser and retry with Chrome/Chromium.
- If security key is not detected: reconnect key, retry another USB port, and confirm browser permission prompts.
- If RP mismatch appears: verify backend RP/origin configuration for tested host.
- If verification fails repeatedly: try re-registering passkey and clearing old test credentials.

## 8. Verification method behavior

WebAuthn cannot force one specific biometric method.

On Ubuntu 24.04, available verification method depends on browser, hardware, and authenticator type (platform, security key, or phone-assisted flow).