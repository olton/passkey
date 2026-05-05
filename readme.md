# @olton/passkey

Passkey SDK for web authentication and payment step-up scenarios.

The library helps you implement passkey-based WebAuthn flows for:

- passwordless login
- sensitive action confirmation
- payment step-up as an alternative to 3DS (with fallback)
- scenario-oriented orchestration for web clients

## Features

- typed WebAuthn DTOs for backend contracts
- browser WebAuthn transport service
- pluggable backend adapter
- high-level authentication and payment services
- a single facade client for integration
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

## Module Exports

Below is the full list of exports from `@olton/passkey`.

### Client Facade

- `createPasskeyClient` - factory for creating `PasskeyClient`.
- `PasskeyClient` - main SDK facade for registration, login, step-up, and scenario flows.
- `PasskeyClientConfig` - facade configuration (backend adapter and optional WebAuthn service).

### Backend Adapter

- `PasskeyBackendAdapter` - API adapter contract for registration/auth/payment flows.
- `PasskeyBackendEndpoints` - endpoint path set for the fetch adapter.
- `FetchBackendAdapterConfig` - fetch adapter configuration (base URL, headers, endpoints).
- `createFetchBackendAdapter` - creates an adapter to integrate with your backend via `fetch`.

### Authentication and Payment Services

- `PasskeyAuthService` - high-level service for registration and authentication.
- `PaymentStepUpService` - passkey step-up orchestration for card payments.
- `WebClientUseCases` - scenario-oriented orchestrator for web clients.

### Scenario Contracts (Use Cases)

- `LoginUseCaseRequest` - payload for login scenario.
- `PaymentStepUpUseCaseRequest` - payload for payment step-up scenario.
- `SensitiveActionUseCaseRequest` - payload for sensitive action confirmation scenario.
- `PasswordlessRecoveryUseCaseRequest` - payload for passwordless recovery scenario.
- `WebClientUseCaseRequest` - union of all supported scenario requests.
- `WebClientUseCaseResponse` - unified response type for scenario orchestration.

### WebAuthn Transport

- `WebAuthnService` - browser WebAuthn transport service (credential creation + assertion).

### SDK Errors

- `PasskeyError` - base SDK error.
- `PasskeyNotSupportedError` - browser/runtime does not support WebAuthn.
- `UserCancelledError` - user cancelled passkey ceremony.
- `BackendAdapterError` - HTTP/contract errors from backend adapter interaction.

### Base64url Utilities

- `base64UrlToArrayBuffer` - converts base64url to `ArrayBuffer`.
- `arrayBufferToBase64Url` - converts `ArrayBuffer` to base64url.
- `uint8ArrayToBase64Url` - converts `Uint8Array` to base64url.
- `base64UrlToUint8Array` - converts base64url to `Uint8Array`.

### Core Domain Types and Decisions

- `Base64Url` - string in base64url format.
- `StepUpDecision` - step-up decision: approve/fallback/reject.
- `WebClientScenario` - supported web client business scenarios.

### User Profile, Risk Signals, and Payment Context

- `PasskeyUser` - user data for passkey registration.
- `RiskSignals` - optional signals for fraud/risk analysis.
- `CardPaymentContext` - business context for card payments.

### WebAuthn JSON DTOs

- `PublicKeyCredentialDescriptorJSON` - JSON representation of credential descriptor.
- `PublicKeyCredentialUserEntityJSON` - JSON representation of WebAuthn user entity.
- `PublicKeyCredentialCreationOptionsJSON` - JSON credential creation options (registration).
- `PublicKeyCredentialRequestOptionsJSON` - JSON assertion options (authentication/payment).
- `CredentialAttestationJSON` - serialized passkey registration result.
- `CredentialAssertionJSON` - serialized passkey authentication result.

### Backend Request Types

- `BeginRegistrationInput` - payload to request registration options.
- `FinishRegistrationInput` - payload to verify registration.
- `BeginAuthenticationInput` - payload to request authentication options.
- `FinishAuthenticationInput` - payload to verify authentication.
- `BeginPaymentStepUpInput` - payload to request payment step-up options.
- `FinishPaymentStepUpInput` - payload to verify payment step-up.

### Verification Results and Session

- `AuthSession` - session data after successful authentication.
- `RegistrationVerificationResult` - registration verification result.
- `AuthenticationVerificationResult` - authentication verification result.
- `PaymentStepUpVerificationResult` - backend payment step-up verification result.
- `PaymentStepUpResult` - final client step-up result (including fallback/3DS flags).

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
	console.log("Login successful");
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
	// fallback to a classic 3DS challenge
}
```

### 4) Scenario-Oriented Flow

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

### 1) Start One of the Demo Backends

#### Option A: Mock Backend (Quick Local Checks)

```bash
npm run server:mock
```

Default URL: `http://localhost:4000`

#### Option B: Dedicated WebAuthn Backend (Windows Hello)

```bash
npm run server:device
```

Default URL: `http://localhost:4100`

This server returns WebAuthn policies for platform authenticators (`authenticatorAttachment: "platform"`) and `userVerification: "required"`.

### 2) Start Demo UI

```bash
npm run dev
```

Open: `http://localhost:5173`

Dedicated login/password -> passkey onboarding demo: `http://localhost:5173/login.html`

Dedicated sensitive data vault demo with passkey access: `http://localhost:5173/sensitive.html`

### 3) Try Demo Scenarios

- Register passkey
- Login with passkey
- Confirm a sensitive action
- Confirm a card payment

Tip: keep `Use mock WebAuthn transport` enabled for predictable local behavior.

For real Windows Hello, disable `Use mock WebAuthn transport` and set `API Base URL` to `http://localhost:4100`.

Dedicated setup runbook for Windows Hello: `docs/windows-hello-webauthn-demo.md`.

## Build Outputs

- ESM bundle: `dist/prod/passkey.es.js`
- CJS bundle: `dist/prod/passkey.cjs.js`
- Type declarations: `dist/types/index.d.ts`

## Scripts

- `npm run dev` - start demo UI
- `npm run server:mock` - start mock backend
- `npm run server:device` - start dedicated WebAuthn backend for Windows Hello
- `npm run start:mock` - start mock backend and demo UI together
- `npm run start:device` - start WebAuthn backend and demo UI together
- `npm run test` - run test suite
- `npm run build:prod` - build production bundles and declarations
- `npm run build` - lint + typecheck + test + production build
