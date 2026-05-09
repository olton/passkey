# crypto module

## Purpose

Reusable cryptographic helpers for SDK modules and demos.

## What Is Implemented

- Generic `encrypt<TPayload>` for JSON-serializable payloads.
- `encryptWithServerKey<TPayload>` to wrap AES key with server public key (`RSA-OAEP`).
- Generic `decrypt<TPayload>` for payload restoration.
- Shared encrypted bundle shape: `EncryptedPayloadBundle`.

## Usage Example

```ts
import { decrypt, encrypt } from "../crypto";

const token = await encrypt({ userId: "user_1", trustedDevice: true });
const restored = await decrypt<{ userId: string; trustedDevice: boolean }>(token);
```

Secure server-oriented example:

```ts
import { decrypt, encryptWithServerKey } from "../crypto";

const token = await encryptWithServerKey(
	{ pan: "4111111111111111" },
	{
		serverKeyEncryption: {
			publicKeySpki: "BASE64URL_RSA_SPKI_PUBLIC_KEY",
			keyId: "payments-key-v1",
		},
	},
);

// This decrypt call must happen on server-side only.
const restored = await decrypt<{ pan: string }>(token, {
	serverKeyDecryption: {
		privateKeyPkcs8: "BASE64URL_RSA_PKCS8_PRIVATE_KEY",
	},
});
```

## Notes

- Uses Web Crypto API (`AES-GCM`) available in browser runtime.
- Secure mode uses hybrid encryption (`AES-GCM` + `RSA-OAEP` key wrapping).
- Secure bundle decryption requires server private key and should run on backend only.
- Throws if Web Crypto API is not available.