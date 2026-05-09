# use-cases module

## Purpose

Business scenario orchestration for web clients through a single entry point: `run(...)`.

## Supported Scenarios

- `login` passwordless login.
- `payment-step-up` passkey confirmation for payment with account-level passkey reuse.
- `sensitive-action` confirmation of sensitive actions.
- `passwordless-recovery` passwordless account recovery.

## Usage Example

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

## Notes

- The module is UI-agnostic and only routes use cases to services.
- Convenient for analytics: `scenario` can be logged as a product event.
