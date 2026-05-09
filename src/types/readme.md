# types module

## Purpose

This module contains domain types for all passkey scenarios in a web client:

- Passwordless login.
- Sensitive action confirmation (for example: email change, payout withdrawal, contract signing).
- Payment step-up as an alternative to 3DS.
- Passwordless recovery.

## Key Type Groups

- WebAuthn JSON DTOs:
  - `PublicKeyCredentialCreationOptionsJSON`
  - `PublicKeyCredentialRequestOptionsJSON`
  - `CredentialAttestationJSON`
  - `CredentialAssertionJSON`
- Business context:
  - `PasskeyUser`
  - `PaymentContext` (`CardPaymentContext` kept as deprecated alias)
  - `RiskSignals`
- API contracts:
  - `BeginRegistrationInput` / `FinishRegistrationInput`
  - `BeginAuthenticationInput` / `FinishAuthenticationInput`
  - `BeginPaymentStepUpInput` / `FinishPaymentStepUpInput`
- Results:
  - `RegistrationVerificationResult`
  - `AuthenticationVerificationResult`
  - `PaymentStepUpResult`

## Usage Example

```ts
import type { BeginPaymentStepUpInput } from "../types";

const payload: BeginPaymentStepUpInput = {
  payment: {
    paymentIntentId: "pi_124",
    amountMinor: 150000,
    currency: "UAH",
    merchantId: "m_001",
    accountId: "click2pay_account_42",
  },
  userId: "user_88",
};
```

## Notes

- `Base64Url` is used for WebAuthn byte fields.
- `StepUpDecision` models all payment branches including `enrollment_required` for OTP+enroll UX.
- `WebClientScenario` is convenient for use-case orchestration in the UI layer.
- Payment passkey should be enrolled once per account and then reused across account cards.
