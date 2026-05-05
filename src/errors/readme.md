# errors module

## Purpose

Centralized SDK error layer for consistent failure handling in your application.

## Available Errors

- `PasskeyError` base class.
- `PasskeyNotSupportedError` browser does not support WebAuthn.
- `UserCancelledError` user cancelled biometric prompt.
- `BackendAdapterError` HTTP/API interaction error.

## Usage Example

```ts
import { UserCancelledError } from "../errors";

try {
  // start passkey flow
} catch (error) {
  if (error instanceof UserCancelledError) {
    // show a non-blocking UI hint
  }
}
```

## Notes

- In UI, it is recommended to distinguish `UserCancelledError` from real technical errors.
- `BackendAdapterError` includes `status` and `details` for logging or Sentry breadcrumbs.
