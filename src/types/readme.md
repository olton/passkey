# types module

## Purpose

This module contains domain types for all passkey scenarios in a web client:

- Passwordless login.
- Sensitive action confirmation (for example: email change, payout withdrawal, contract signing).
- Card payment step-up as an alternative to 3DS.
- Passwordless recovery.

## Key Type Groups

- WebAuthn JSON DTOs:
  - `PublicKeyCredentialCreationOptionsJSON`
  - `PublicKeyCredentialRequestOptionsJSON`
  - `CredentialAttestationJSON`
  - `CredentialAssertionJSON`
- Business context:
  - `PasskeyUser`
  - `CardPaymentContext`
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
  },
  userId: "user_88",
};
```

## Notes

- `Base64Url` is used for WebAuthn byte fields.
- `StepUpDecision` directly models fallback-to-3DS strategy.
- `WebClientScenario` is convenient for use-case orchestration in the UI layer.
