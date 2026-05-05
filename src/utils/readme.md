# utils module

## Purpose

A utility set for conversion between WebAuthn formats:

- `ArrayBuffer` <-> `Base64Url`
- `Uint8Array` <-> `Base64Url`

## Exported Functions

- `base64UrlToArrayBuffer`
- `arrayBufferToBase64Url`
- `base64UrlToUint8Array`
- `uint8ArrayToBase64Url`

## Usage Example

```ts
import { base64UrlToArrayBuffer, arrayBufferToBase64Url } from "../utils";

const rawChallenge = base64UrlToArrayBuffer("m8W4...rQ");
const encoded = arrayBufferToBase64Url(rawChallenge);
```

## Notes

- Utilities work in both browser and Node runtimes.
- In Node, `globalThis.Buffer` is used when `atob/btoa` are unavailable.
