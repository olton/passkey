# Windows Hello + WebAuthn Demo Setup

This runbook explains how to use the dedicated WebAuthn demo backend with a real platform authenticator on Windows.

## 1. Configure Windows Hello on the device

1. Open `Settings` -> `Accounts` -> `Sign-in options`.
2. Configure `PIN (Windows Hello)` if it is not set.
3. Configure `Facial recognition (Windows Hello)` and complete calibration.
4. (Optional) Run `Improve recognition` for better camera matching.

Windows Hello may fall back to PIN if face recognition is unavailable. This is expected behavior.

## 2. Start dedicated WebAuthn backend

```bash
npm run server:device
```

By default, backend URL is `http://localhost:4100`.

This server returns stricter WebAuthn options:

- `authenticatorSelection.authenticatorAttachment = "platform"`
- `authenticatorSelection.residentKey = "required"`
- `authenticatorSelection.userVerification = "required"`
- authentication `userVerification = "required"`

## 3. Start demo UI

```bash
npm run dev
```

Open `http://localhost:5173`.

Sensitive vault demo page: `http://localhost:5173/sensitive.html`.

## 4. Switch UI to real WebAuthn mode

1. Set `API Base URL` to `http://localhost:4100`.
2. Disable `Use mock WebAuthn transport`.
3. Click `Register Passkey`.
4. Approve Windows Hello prompt with Face or PIN.
5. Click `Login with Passkey` to verify the assertion flow.

## 5. Browser and environment requirements

- Use a modern browser with WebAuthn support (Edge or Chrome recommended on Windows).
- Use `localhost` or HTTPS origin.
- Keep OS and browser updated.
- Ensure no policy blocks WebAuthn in enterprise-managed environments.

## 6. Troubleshooting

- If no prompt appears: verify mock transport is disabled.
- If registration fails quickly: verify Windows Hello PIN is configured.
- If ceremony is cancelled: retry and approve biometric/pin prompt.
- If RP mismatch errors appear: ensure backend RP ID stays `localhost` for local run.

## 7. Important limitation

WebAuthn cannot force Face-only verification. Platform authenticator chooses available Windows Hello method (Face, fingerprint, or PIN).