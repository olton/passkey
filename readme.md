# @olton/passkey

Passkey SDK for web authentication and payment step-up scenarios.

The library helps you implement WebAuthn-based passkey flows for:

- passwordless login
- sensitive action confirmation
- payment step-up as an alternative to 3DS (with fallback)
- scenario-driven orchestration for web clients

## Features

- typed WebAuthn DTOs for backend contracts
- browser WebAuthn transport service
- pluggable backend adapter
- high-level auth and payment services
- single facade client for integration
- generated TypeScript declaration files

## Installation

```bash
npm i @olton/passkey
```

## Quick Start

```ts
import {
	createFetchBackendAdapter,
	createPasskeyClient,
} from "@olton/passkey";

const adapter = createFetchBackendAdapter({
	baseUrl: "https://api.example.com",
});

const passkey = createPasskeyClient({ adapter });

await passkey.register({
	user: {
		id: "user_1",
		username: "demo@example.com",
		displayName: "Demo User",
	},
});

const loginResult = await passkey.login({
	username: "demo@example.com",
});
```

## Usage Examples

### 1) Passwordless Login

```ts
const loginResult = await passkey.login({
	username: "demo@example.com",
	context: {
		source: "web",
	},
});

if (loginResult.verified) {
	console.log("Logged in");
}
```

### 2) Sensitive Action Confirmation

```ts
const confirmResult = await passkey.confirmSensitiveAction({
	userId: "user_1",
	context: {
		action: "change-payout-account",
	},
});
```

### 3) Card Payment Step-Up

```ts
const paymentResult = await passkey.confirmCardPayment({
	payment: {
		paymentIntentId: "pi_100",
		amountMinor: 45000,
		currency: "UAH",
		merchantId: "merchant_1",
	},
	userId: "user_1",
});

if (paymentResult.shouldTrigger3DS) {
	// fallback to classic 3DS challenge
}
```

### 4) Scenario-Driven Flow

```ts
const result = await passkey.runUseCase({
	scenario: "payment-step-up",
	input: {
		payment: {
			paymentIntentId: "pi_101",
			amountMinor: 1000,
			currency: "UAH",
			merchantId: "merchant_1",
		},
		userId: "user_1",
	},
});
```

## Run Demo Locally

### 1) Start mock backend

```bash
npm run server
```

Default URL: `http://localhost:4000`

### 2) Start demo UI

```bash
npm run dev
```

Open: `http://localhost:5173`

### 3) Try flows in demo

- Register Passkey
- Login with Passkey
- Confirm Sensitive Action
- Confirm Card Payment

Tip: keep `Use mock WebAuthn transport` enabled for predictable local behavior.

## Build Outputs

- ESM bundle: `dist/prod/passkey.es.js`
- CJS bundle: `dist/prod/passkey.cjs.js`
- Type declarations: `dist/types/index.d.ts`

## Scripts

- `npm run dev` - run demo UI
- `npm run server` - run mock backend
- `npm run test` - run test suite
- `npm run build:prod` - build production bundles and declarations
- `npm run build` - lint + typecheck + test + production build
