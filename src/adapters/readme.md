# adapters module

## Purpose

This module encapsulates backend API interaction for all passkey scenarios.

## Core Entities

- `PasskeyBackendAdapter` adapter contract.
- `createFetchBackendAdapter` ready-to-use implementation based on `fetch`.
- `PasskeyBackendEndpoints` URL customization for your API routes.
- `DEFAULT_PASSKEY_BACKEND_ENDPOINTS` shared default route map.

## Usage Example

```ts
import { createFetchBackendAdapter } from "../adapters";

const adapter = createFetchBackendAdapter({
  baseUrl: "https://api.example.com",
  endpoints: {
    beginPaymentStepUp: "/v2/payments/passkey/options",
    finishPaymentStepUp: "/v2/payments/passkey/verify",
  },
});
```

## Notes

- SDK does not include production backend verification logic. You must implement the backend contract in your API service.
- The adapter expects JSON request bodies and POST requests.
- If the API returns non-JSON errors, they are exposed as `details` in `BackendAdapterError`.
- For SSR or tests, you can provide `fetchImpl`.
