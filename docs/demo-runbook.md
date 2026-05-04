# Local Demo Runbook

## 1. Start mock backend

```bash
npm run server
```

Default URL: `http://localhost:4000`

## 2. Start demo UI

```bash
npm run dev
```

Open: `http://localhost:5173`

## 3. Try scenarios

- Register passkey
- Login with passkey
- Confirm sensitive action
- Confirm card payment

## 4. Recommended demo mode

For quick testing, keep `Use mock WebAuthn transport` enabled.

- Enabled: predictable local success/fallback flows.
- Disabled: real browser WebAuthn ceremony via authenticator.

## 5. Payment fallback check

In mock API, payment amount above `100000` minor units returns `fallback_to_3ds`.
