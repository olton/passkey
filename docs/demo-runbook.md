# Local Demo Runbook

## 1. Start backend

### Option A: Mock backend (quick local checks)

```bash
npm run server:mock
```

Default URL: `http://localhost:4000`

### Option B: Dedicated WebAuthn backend (Windows Hello)

```bash
npm run server:device
```

Default URL: `http://localhost:4100`

## 2. Start demo UI

```bash
npm run dev
```

Open: `http://localhost:5173`

Login/password onboarding demo: `http://localhost:5173/login.html`

Sensitive data vault demo: `http://localhost:5173/sensitive.html`

## 3. Configure demo mode

### Mock mode

- Keep `Use mock WebAuthn transport` enabled.
- Keep `API Base URL` set to `http://localhost:4000`.

### Real WebAuthn mode (Windows Hello)

- Disable `Use mock WebAuthn transport`.
- Set `API Base URL` to `http://localhost:4100`.
- Ensure Windows Hello is configured on the device.

## 4. Try scenarios

- Register passkey
- Login with passkey
- Confirm sensitive action
- Confirm card payment

## 5. Payment fallback check

In both demo backends, payment amount above `100000` minor units returns `fallback_to_3ds`.

## 6. Device setup details

For step-by-step Windows Hello setup and troubleshooting, see `docs/windows-hello-webauthn-demo.md`.
