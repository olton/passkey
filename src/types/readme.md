# types module

## Призначення

Модуль містить доменні типи для всіх passkey-сценаріїв у web client:

- Passwordless логін на сайті.
- Підтвердження чутливих дій (наприклад, зміна email, вивід коштів, підпис договору).
- Step-up для оплати карткою як альтернатива 3DS.
- Passwordless recovery.

## Ключові групи типів

- WebAuthn JSON DTO:
  - `PublicKeyCredentialCreationOptionsJSON`
  - `PublicKeyCredentialRequestOptionsJSON`
  - `CredentialAttestationJSON`
  - `CredentialAssertionJSON`
- Бізнес-контекст:
  - `PasskeyUser`
  - `CardPaymentContext`
  - `RiskSignals`
- Контракти API:
  - `BeginRegistrationInput` / `FinishRegistrationInput`
  - `BeginAuthenticationInput` / `FinishAuthenticationInput`
  - `BeginPaymentStepUpInput` / `FinishPaymentStepUpInput`
- Результати:
  - `RegistrationVerificationResult`
  - `AuthenticationVerificationResult`
  - `PaymentStepUpResult`

## Приклад використання

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

## Примітки

- Для байтових полів WebAuthn використовується `Base64Url`.
- Тип `StepUpDecision` одразу моделює стратегію fallback на 3DS.
- Тип `WebClientScenario` зручний для оркестрації use-case у UI-слої.
