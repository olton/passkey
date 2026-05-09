# Passkey Payment Integration Guide (Junior Friendly)

This guide explains how to integrate payment confirmation with passkeys in a simple way.

## 1. Main idea

You should treat passkey as an **account-level** factor.

- Do not create a passkey for each card.
- The passkey is tied to the payment account, not to a single card.
- In account-based payment flows, enrollment is typically completed around the first account payment journey (after account verification like phone/email + OTP).
- After that, reuse the same passkey for payments with any card inside this account.

## 2. What method to call

Use:

```ts
import { StepUpDecision } from "@olton/passkey";

await passkey.confirmPayment(input)
```

## 3. Minimal input

```ts
const result = await passkey.confirmPayment({
  payment: {
    paymentIntentId: "pi_100",
    amountMinor: 45000,
    currency: "UAH",
    merchantId: "merchant_1",
    accountId: "payment_account_1", // important for account-level model
  },
  userId: "user_1", // optional, but recommended
  context: {
    source: "checkout",
  },
  riskSignals: {
    trustedDevice: true,
  },
});
```

## 4. How to read result

The SDK returns `PaymentStepUpResult` with these important fields:

- `decision`
- `usedPasskey`
- `code` (optional machine-readable code)

Possible `decision` values:

1. `approved`
- Meaning: payment was confirmed by passkey step-up.
- Typical frontend action: continue success flow.

2. `fallback_to_3ds`
- Meaning: passkey flow cannot approve this payment under current policy/risk context.
- Typical frontend action: start 3DS challenge flow.

3. `enrollment_required`
- Meaning: account-level payment passkey is not enrolled (or must be re-enrolled).
- Typical frontend action: treat this as a backend policy signal for this payment. Run your configured recovery path (verification/enrollment/retry) or route to fallback according to policy.

4. `rejected`
- Meaning: payment step-up was explicitly rejected by backend policy/verification.
- Typical frontend action: stop payment flow and show failure/retry path according to business rules.

## 5. What to do in each branch

### A) Payment approved

Condition:

- `result.decision === StepUpDecision.Approved`

Action:

- Continue payment success flow.
- Show success UI.

### B) Fallback to 3DS

Condition:

- `result.decision === StepUpDecision.FallbackTo3DS`

Action:

- Start your 3DS challenge flow.
- After 3DS result, continue your standard payment handling.

### C) Passkey enrollment required

Condition:

- `result.decision === StepUpDecision.EnrollmentRequired`

Action:

1. Interpret this as: backend currently requires enrollment for this payment path.
2. Run the branch your product policy allows:
  - Mandatory policy: verification -> enrollment -> retry.
  - Optional policy: route first payment via allowed non-passkey path, then offer enrollment after success.

### D) Recommended policy modes

1. Optional enrollment (your described model)
- First payment can succeed without mandatory passkey enrollment.
- After first successful transaction, show a non-blocking offer to enable passkey for faster/safer next payments.
- In this mode, backend should usually return `approved` or `fallback_to_3ds` for first payment instead of `enrollment_required`.

2. Mandatory enrollment (strict mode)
- Backend may return `enrollment_required` and block passkey payment path until enrollment is completed.

## 6. Ready-to-copy frontend handler

```ts
import { StepUpDecision } from "@olton/passkey";

async function confirmCheckoutPayment() {
  const result = await passkey.confirmPayment({
    payment: {
      paymentIntentId: "pi_100",
      amountMinor: 45000,
      currency: "UAH",
      merchantId: "merchant_1",
      accountId: "payment_account_1",
    },
    userId: "user_1",
  });

  if (result.decision === StepUpDecision.EnrollmentRequired) {
    // Backend requires enrollment for this payment path.
    // Choose one branch based on product policy.

    if (isMandatoryEnrollmentPolicy()) {
      await runOtpAndPasskeyEnrollment();
      return confirmCheckoutPayment();
    }

    // Optional policy: do NOT force enrollment now.
    // Route current payment by fallback policy and offer enrollment later.
    await runAllowedFirstPaymentFallback();
    return offerPasskeyEnrollmentAfterSuccessfulPayment();
  }

  if (result.decision === StepUpDecision.FallbackTo3DS) {
    return run3DSChallenge();
  }

  if (result.decision === StepUpDecision.Approved) {
    // Optional policy recommendation:
    // after first successful payment, show "Enable passkey" suggestion.
    maybeOfferPasskeyEnrollment();
    return handlePaymentSuccess(result);
  }

  return handlePaymentFailure(result);
}
```

## 7. Typical mistakes (and how to avoid)

1. Mistake: Creating passkey for each card.
- Fix: Create passkey per account and reuse it.

2. Mistake: Ignoring `decision === StepUpDecision.EnrollmentRequired`.
- Fix: Always handle this branch, but route by your policy (mandatory vs optional), not by hardcoded forced enrollment.

3. Mistake: Sending payment without `accountId`.
- Fix: Send `accountId` whenever available; it helps backend apply correct account policy.

4. Mistake: Treating all non-approved results as 3DS.
- Fix: First check `decision === StepUpDecision.EnrollmentRequired`, then `decision === StepUpDecision.FallbackTo3DS`.

## 8. Demo testing tip

You can test enrollment-required branch in local demo by using account IDs that start with:

- `unenrolled_`

Example:

- `unenrolled_payment_account_demo`

This is implemented in demo backends for predictable testing.

## 9. Flow diagram (call chain)

High-level call chain:

Frontend UI
  -> passkey.confirmPayment(input)
    -> PaymentStepUpService.confirmPayment(input)
      -> adapter.beginPaymentStepUp(input)
      -> WebAuthn assertion (navigator.credentials.get)
      -> adapter.finishPaymentStepUp(credential)
      -> PaymentStepUpResult

Decision branch:

PaymentStepUpResult
  |
  +-- decision = enrollment_required
  |     -> mandatory policy: verification -> enrollment -> retry
  |     -> optional policy: first payment fallback -> offer enrollment after success
  |
  +-- decision = fallback_to_3ds
  |     -> run 3DS challenge
  |     -> continue payment flow
  |
  +-- decision = approved
        -> show payment success

Backend error mapping note:

- If backend returns credential_not_found or requiresReRegistration,
  SDK maps it to enrollment_required.

Account-payment nuance:

- Enrollment is not just "after OTP" in isolation.
- In many real integrations, OTP/account verification is part of the first payment lifecycle, and passkey enrollment is finalized in that lifecycle for the account.
- Frontend should not force enrollment unconditionally: it should execute the branch allowed by backend/product policy.
