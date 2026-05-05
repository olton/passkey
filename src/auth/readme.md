# auth module

## Purpose

High-level module for passkey authentication in web applications.

## What Is Implemented

- `register` passkey registration.
- `login` passwordless login.
- `confirmSensitiveAction` confirmation for risk-sensitive actions.
- `authenticate` universal method for custom scenarios.

## Usage Example

```ts
import { PasskeyAuthService } from "../auth";

const auth = new PasskeyAuthService(adapter);

await auth.register({
  user: {
    id: "user_1",
    username: "john@company.com",
    displayName: "John",
  },
});

const loginResult = await auth.login({ username: "john@company.com" });
```

## Notes

- The module depends on `PasskeyBackendAdapter` and `WebAuthnService`.
- For MFA-like scenarios, provide different `purpose` and `context` values.
- Backend must validate challenge, origin, rpId, and signature counter.
