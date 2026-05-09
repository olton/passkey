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

- Open default: `http://localhost:5173`
- Login/password onboarding demo: `http://localhost:5173/login.html`
- Sensitive data vault demo: `http://localhost:5173/sensitive.html`
- Account service demo: `http://localhost:5173/account-service/index.html`
- Card service demo: `http://localhost:5173/card-service/index.html`

## 3. Configure demo mode

### Mock mode

- Keep `Use mock WebAuthn transport` enabled.
- Keep `API Base URL` set to `http://localhost:4000`.

### Real WebAuthn mode (platform authenticator)

- Disable `Use mock WebAuthn transport`.
- Set `API Base URL` to a backend URL reachable from your test device.
- Ensure platform authenticator is configured on your device.

## 4. Try scenarios

- Register passkey
- Login with passkey
- Confirm sensitive action
- Confirm card payment

## 5. Payment fallback check

In both demo backends, payment amount above `100000` minor units returns `fallback_to_3ds`.

## 6. Payment enrollment-required check

Both demo backends deterministically return enrollment-required backend error when
`payment.accountId` starts with `unenrolled_` (or equals `account_without_passkey`).

This is useful for end-to-end testing of: account OTP/verification -> passkey enrollment -> retry payment.

Example payload fragment:

```json
{
	"payment": {
		"paymentIntentId": "pi_demo_1",
		"amountMinor": 1500,
		"currency": "UAH",
		"merchantId": "merchant_1",
		"accountId": "unenrolled_click2pay_demo"
	}
}
```

Optional: change prefix via env var before starting backend:

```bash
PASSKEY_DEMO_ENROLLMENT_REQUIRED_ACCOUNT_PREFIX=needs_enroll_ npm run server:device
```

In account-service demo page, you can run full lifecycle from UI:

1. Verify account (OTP mock)
2. Complete first account payment (policy mock)
3. Enroll account passkey
4. Confirm payment with passkey

Page: `http://localhost:5173/account-service/index.html`

## 7. Device setup details

Use the platform-specific runbook for setup and troubleshooting:

- Windows: [docs/windows-hello.md](docs/windows-hello.md)
- Android: [docs/android-demo.md](docs/android-demo.md)
- iOS: [docs/ios-demo.md](docs/ios-demo.md)
- Linux (Ubuntu 24.04): [docs/linux-ubuntu-24-04-demo.md](docs/linux-ubuntu-24-04-demo.md)
