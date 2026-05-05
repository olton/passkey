# core module

## Purpose

`PasskeyClient` is the main SDK facade for web clients. It combines:

- `auth` module for authentication.
- `payments` module for payment step-up.
- `useCases` module for scenario orchestration.

## Quick Start Example

```ts
import {
  createFetchBackendAdapter,
  createPasskeyClient,
} from "../index";

const adapter = createFetchBackendAdapter({
  baseUrl: "https://api.example.com",
});

const passkey = createPasskeyClient({ adapter });

await passkey.register({
  user: {
    id: "u_1",
    username: "user@example.com",
    displayName: "User",
  },
});
```

## Detailed TypeScript Implementation Plan

1. Prepare backend contracts:
   - Implement challenge/verify endpoints for registration, authentication, and payment step-up.
   - Validate `origin`, `rpId`, `challenge`, `signature`, and `counter`.
2. Integrate `PasskeyClient` into your UI app:
   - Add buttons: Login with Passkey, Confirm Payment, Confirm Sensitive Action.
   - Call the corresponding facade method for each button.
3. Implement a risk engine:
   - Send `RiskSignals` in `begin*` requests.
   - Let backend decide when fallback to 3DS is required.
4. Provide fallback strategies:
   - If browser does not support passkeys, fallback to password/OTP/3DS.
   - If verification fails, log the reason and show recovery UX.
5. Design analytics events:
   - `passkey.prompt.opened`
   - `passkey.prompt.cancelled`
   - `passkey.auth.success`
   - `passkey.payment.fallback_3ds`
6. Cover with tests:
   - Unit: adapter, payload mapping, error handling.
   - Integration: backend challenge/verify simulation.
   - E2E: login, payment step-up, sensitive action scenarios.
7. Prepare rollout:
   - Feature flag by traffic percentage.
   - A/B metrics: login conversion, challenge success rate, drop-off.

## Notes

- The facade simplifies future scaling to new use cases without breaking API.
- For enterprise projects, version DTOs between frontend and backend.
