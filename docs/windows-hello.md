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

- Login/password onboarding demo page: `http://localhost:5173/login/index.html`.
- Sensitive vault demo page: `http://localhost:5173/sensitive/index.html`.
- Card service demo page: `http://localhost:5173/card-service/index.html`.

## 4. Browser and environment requirements

- Use a modern browser with WebAuthn support (Edge or Chrome recommended on Windows).
- Use `localhost` or HTTPS origin.
- Keep OS and browser updated.
- Ensure no policy blocks WebAuthn in enterprise-managed environments.

## 5. Troubleshooting

- If registration fails quickly: verify Windows Hello PIN is configured.
- If ceremony is cancelled: retry and approve biometric/pin prompt.
- If RP mismatch errors appear: ensure backend RP ID stays `localhost` for local run.

## 6. Verification methods

Platform authenticator chooses available Windows Hello method (Face, fingerprint, or PIN).