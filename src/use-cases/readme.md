# use-cases module

## Призначення

Оркестрація бізнес-сценаріїв web client через один entry-point `run(...)`.

## Підтримані сценарії

- `login` passwordless вхід.
- `payment-step-up` підтвердження карткового платежу passkey.
- `sensitive-action` підтвердження чутливих дій.
- `passwordless-recovery` відновлення доступу без пароля.

## Приклад використання

```ts
import { WebClientUseCases } from "../use-cases";

const useCases = new WebClientUseCases(authService, paymentService);

const authResult = await useCases.run({
  scenario: "login",
  input: { username: "john@company.com" },
});

const paymentResult = await useCases.run({
  scenario: "payment-step-up",
  input: {
    payment: {
      paymentIntentId: "pi_100",
      amountMinor: 8800,
      currency: "UAH",
      merchantId: "m_12",
    },
  },
});
```

## Примітки

- Модуль не знає про UI, лише маршрутизує use-case до сервісів.
- Зручно для аналітики: `scenario` можна логувати як продуктову подію.
