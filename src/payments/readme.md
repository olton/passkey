# payments module

## Purpose

Module for passkey step-up during card payments as an alternative to 3DS in relevant business cases.

## What Is Implemented

- `confirmCardPayment` full flow:
  1. Request payment challenge.
  2. Perform passkey assertion.
  3. Send assertion to backend for verification.
  4. Receive decision: `approved`, `fallback_to_3ds`, `rejected`.

## Usage Example

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

## Notes

- If browser does not support passkeys, the module automatically returns fallback to 3DS.
- The decision to use passkeys as a 3DS alternative must comply with PSP/acquirer requirements and local regulations.
