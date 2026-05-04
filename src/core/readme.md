# core module

## Призначення

`PasskeyClient` це головний фасад SDK для web client, який об'єднує:

- `auth` модуль для авторизації.
- `payments` модуль для step-up під час оплати.
- `useCases` модуль для сценарної оркестрації.

## Приклад швидкого старту

```ts
import {
  createFetchBackendAdapter,
  createPasskeyClient,
} from "../index";

const adapter = createFetchBackendAdapter({
  baseUrl: "https://api.example.com",
});

const passkey = createPasskeyClient({ adapter });

await passkey.register({
  user: {
    id: "u_1",
    username: "user@example.com",
    displayName: "User",
  },
});
```

## Детальний план імплементації у TypeScript

1. Підготувати backend контракти:
   - Реалізувати endpoint-и challenge/verify для registration, authentication, payment step-up.
   - Забезпечити перевірку `origin`, `rpId`, `challenge`, `signature`, `counter`.
2. Інтегрувати `PasskeyClient` в UI застосунок:
   - Додати кнопки: Login with Passkey, Confirm Payment, Confirm Sensitive Action.
   - Для кожної кнопки викликати відповідний метод фасаду.
3. Реалізувати ризик-движок:
   - Передавати `RiskSignals` у `begin*` запити.
   - На backend приймати рішення, коли потрібен fallback на 3DS.
4. Забезпечити fallback стратегії:
   - Якщо браузер не підтримує passkeys, переходити на пароль/OTP/3DS.
   - Якщо verification неуспішний, логувати причину і показувати UX recovery.
5. Спроєктувати події аналітики:
   - `passkey.prompt.opened`
   - `passkey.prompt.cancelled`
   - `passkey.auth.success`
   - `passkey.payment.fallback_3ds`
6. Покрити тестами:
   - Unit: адаптер, мапінг payload, обробка помилок.
   - Integration: імітація backend challenge/verify.
   - E2E: сценарії login, payment step-up, sensitive action.
7. Підготувати rollout:
   - Feature flag на відсоток трафіку.
   - A/B метрики: conversion login, challenge success rate, drop-off.

## Примітки

- Фасад полегшує майбутнє масштабування на нові use-case без ламання API.
- Для enterprise-проєктів рекомендується версіонувати DTO між frontend і backend.
