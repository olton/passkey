# crypto module

## Purpose

Reusable cryptographic helpers for SDK modules and demos.

## What Is Implemented

- Generic `encrypt<TPayload>` for JSON-serializable payloads.
- Generic `decrypt<TPayload>` for payload restoration.
- Shared encrypted bundle shape: `EncryptedPayloadBundle`.

## Usage Example

```ts
import { decrypt, encrypt } from "../crypto";

const token = await encrypt({ userId: "user_1", trustedDevice: true });
const restored = await decrypt<{ userId: string; trustedDevice: boolean }>(token);
```

## Notes

- Uses Web Crypto API (`AES-GCM`) available in browser runtime.
- Throws if Web Crypto API is not available.