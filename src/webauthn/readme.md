# webauthn module

## Purpose

A low-level service for interacting with the browser WebAuthn API:

- Passkey credential creation (registration).
- Assertion retrieval (authentication / step-up).
- Response serialization into JSON-safe format for backend.

## Core Functions

- `isSupported()` checks WebAuthn support.
- `createCredential(options)` starts registration ceremony.
- `getAssertion(options)` starts authentication ceremony.

## Usage Example

```ts
import { WebAuthnService } from "../webauthn";

const webAuthn = new WebAuthnService();

if (webAuthn.isSupported()) {
  const attestation = await webAuthn.createCredential(optionsFromApi);
  await api.verifyRegistration(attestation);
}
```

## Notes

- `NotAllowedError` is mapped to `UserCancelledError`.
- `PasskeyNotSupportedError` helps quickly define fallback behavior in UI.
- The service is stateless and safe to reuse.
