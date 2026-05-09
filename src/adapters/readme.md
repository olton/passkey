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
- Payment endpoints are intended for asserting an already enrolled account passkey (not creating a passkey per card).

## Навіщо цей модуль, якщо Passkey працює на клієнті?

Коротко: так, WebAuthn-церемонія запускається в браузері, але довіра і рішення про доступ завжди на сервері. Тому backend-adapter тут потрібен.

Що робиться на клієнті:
1. Виклик браузерного API для створення/підтвердження credential:
webauthn-service.ts, webauthn-service.ts.

Що робиться на сервері:
1. Видати challenge/options.
2. Перевірити підпис, origin, rpId, one-time challenge, sign counter.
3. Прив’язати результат до user/payment intent.
4. Створити сесію/токени або рішення по платежу.
Це прямо зафіксовано в контракті: api-contract.md, api-contract.md.

Навіщо тоді backend-adapter:
1. Це абстракція каналу клієнт -> ваш API: `backend-adapter.ts`.
2. Щоб SDK не був жорстко прив’язаний до одного транспорту/ендпойнтів: `backend-adapter.ts`.
3. Щоб бізнес-логіка auth/payment працювала однаково з будь-яким бекендом: `auth-service.ts`.
4. Щоб легко мокати в тестах: `passkey-client.test.ts`.

Якщо прибрати adapter, доведеться або зашивати fetch прямо в сервіси (втрата гнучкості/тестованості), або взагалі робити “клієнтську верифікацію”, що для реальної автентифікації небезпечно.