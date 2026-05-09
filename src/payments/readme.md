# payments module

## Purpose

Module for account-level passkey step-up during payments as an alternative to 3DS in relevant business cases.

## What Is Implemented

- `confirmPayment` full flow:
  1. Request payment challenge.
  2. Perform passkey assertion.
  3. Send assertion to backend for verification.
  4. Receive decision: `approved`, `fallback_to_3ds`, `rejected`, `enrollment_required`.

Important behavior:

- This module authenticates with an already enrolled account passkey.
- Passkey enrollment should happen once per account (for example after OTP/identity verification), not per card.

## Usage Example

```ts
import { PaymentStepUpService } from "../payments";

const payments = new PaymentStepUpService(adapter);

const result = await payments.confirmPayment({
  payment: {
    paymentIntentId: "pi_999",
    amountMinor: 420000,
    currency: "UAH",
    merchantId: "merchant_77",
  },
  userId: "user_1",
});

if (result.decision === "fallback_to_3ds") {
  // run classic 3DS challenge
}

if (result.decision === "enrollment_required") {
  // run account OTP/verification + passkey enrollment
}
```

## Notes

- If browser does not support passkeys, the module automatically returns fallback to 3DS.
- The decision to use passkeys as a 3DS alternative must comply with PSP/acquirer requirements and local regulations.
- If backend indicates missing payment passkey enrollment, the module returns `enrollment_required`.
