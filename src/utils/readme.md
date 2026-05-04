# utils module

## Призначення

Набір утиліт для конвертації між форматами WebAuthn:

- `ArrayBuffer` <-> `Base64Url`
- `Uint8Array` <-> `Base64Url`

## Експортовані функції

- `base64UrlToArrayBuffer`
- `arrayBufferToBase64Url`
- `base64UrlToUint8Array`
- `uint8ArrayToBase64Url`

## Приклад використання

```ts
import { base64UrlToArrayBuffer, arrayBufferToBase64Url } from "../utils";

const rawChallenge = base64UrlToArrayBuffer("m8W4...rQ");
const encoded = arrayBufferToBase64Url(rawChallenge);
```

## Примітки

- Утиліти працюють і в браузері, і в Node runtime.
- Для Node використовується `globalThis.Buffer`, якщо `atob/btoa` недоступні.
