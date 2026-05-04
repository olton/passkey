# payments module

## Призначення

Модуль для passkey step-up під час оплати карткою як альтернативи 3DS у відповідних бізнес-кейсах.

## Що реалізовано

- `confirmCardPayment` повний flow:
  1. Запросити challenge для платежу.
  2. Виконати passkey assertion.
  3. Передати assertion на backend-верифікацію.
  4. Отримати рішення: `approved`, `fallback_to_3ds`, `rejected`.

## Приклад використання

```ts
import { PaymentStepUpService } from "../payments";

const payments = new PaymentStepUpService(adapter);

const result = await payments.confirmCardPayment({
  payment: {
    paymentIntentId: "pi_999",
    amountMinor: 420000,
    currency: "UAH",
    merchantId: "merchant_77",
  },
  userId: "user_1",
});

if (result.shouldTrigger3DS) {
  // run classic 3DS challenge
}
```

## Примітки

- Якщо браузер не підтримує passkey, модуль автоматично повертає fallback на 3DS.
- Рішення про використання passkey як заміни 3DS повинно відповідати вимогам PSP/acquirer і локальної регуляції.
