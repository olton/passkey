# adapters module

## Призначення

Модуль інкапсулює взаємодію з backend API для всіх passkey-сценаріїв.

## Основні сутності

- `PasskeyBackendAdapter` контракт адаптера.
- `createFetchBackendAdapter` готова реалізація на `fetch`.
- `PasskeyBackendEndpoints` кастомізація URL для ваших API маршрутів.

## Приклад використання

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

## Примітки

- Адаптер очікує JSON body і POST запити.
- Якщо API повертає non-JSON помилки, вони будуть доступні як `details` в `BackendAdapterError`.
- Для SSR або тестів можна передати `fetchImpl`.
